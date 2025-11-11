// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt, encrypt, SessionPayload } from './app/lib/auth';

const ALLOWED_ORIGINS = ['https://yourdomain.com', 'https://admin.yourdomain.com'];
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);

  // 1. Generate CSP nonce
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  requestHeaders.set('x-nonce', nonce);

  // 2. Manage CSRF Token
  let csrfToken = request.cookies.get('csrf_token')?.value;
  if (!csrfToken) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    csrfToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  requestHeaders.set('X-CSRF-Token', csrfToken);


  // 3. Session Validation & Refresh
  const sessionCookieValue = request.cookies.get('session')?.value;
  let sessionPayload: SessionPayload | null = null;
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (sessionCookieValue) {
    sessionPayload = await decrypt(sessionCookieValue);
    const now = new Date();
    
    // Only refresh the session if it's valid (not null, not expired)
    if (sessionPayload?.userId && now < new Date(sessionPayload.expiresAt) && now < new Date(sessionPayload.idleExpiresAt)) {
      const newIdleExpiresAt = new Date(now.getTime() + IDLE_TIMEOUT);
      const newSessionPayload: SessionPayload = {
          ...sessionPayload,
          idleExpiresAt: newIdleExpiresAt,
      };
      const newSessionCookie = await encrypt(newSessionPayload);
      
      response.cookies.set('session', newSessionCookie, {
          expires: new Date(newSessionPayload.expiresAt),
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'strict',
      });
    } else {
      // If session is invalid or expired, clear it
      sessionPayload = null;
    }
  }


  // 4. Route Protection Logic
  const isAuthenticated = !!sessionPayload;
  
  const isAdminRoute = pathname.startsWith('/admin');
  const isSuperAdminRoute = pathname.startsWith('/super-admin');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/super-admin/login');
  const isForcePasswordChangeRoute = pathname === '/force-password-change';

  // Enforce password change if required
  if (isAuthenticated && sessionPayload.passwordChangeRequired) {
    if (!isForcePasswordChangeRoute) {
        return NextResponse.redirect(new URL('/force-password-change', request.url));
    }
  } else if (isAuthenticated && isForcePasswordChangeRoute) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Redirect unauthenticated users from protected routes
  if ((isAdminRoute || isSuperAdminRoute) && !isAuthenticated && !isAuthRoute) {
      const loginPath = isSuperAdminRoute ? '/super-admin/login' : '/login';
      return NextResponse.redirect(new URL(loginPath, request.url));
  }

  // Redirect authenticated users away from login pages
  if (isAuthRoute && isAuthenticated) {
      const redirectPath = sessionPayload.passwordChangeRequired ? '/force-password-change' : '/admin';
      return NextResponse.redirect(new URL(redirectPath, request.url));
  }
  
  // Set the CSRF cookie on the response
  response.cookies.set({
    name: 'csrf_token',
    value: csrfToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });


  // 5. Dynamic Security headers (CSP)
  response.headers.set('Content-Security-Policy', `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' https://api.qrserver.com https://www.daimlertruck.com https://placehold.co https://picsum.photos https://dekonpower.com data:;
    connect-src 'self';
    frame-ancestors 'none';
    frame-src 'none';
    child-src 'none';
    worker-src 'self';
    media-src 'self';
    manifest-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim());

  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');

  // 6. CORS for API requests
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// 8. Apply middleware to all routes except Next.js internals
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
