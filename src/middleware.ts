// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt, encrypt, SessionPayload } from './app/lib/auth';

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

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set the CSRF cookie on every response
  response.cookies.set({
    name: 'csrf_token',
    value: csrfToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  

  // 3. Session Validation & Refresh
  const sessionCookieValue = request.cookies.get('session')?.value;
  let sessionPayload: SessionPayload | null = null;
  
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
      // Also clear the cookie from the browser
      response.cookies.set('session', '', { expires: new Date(0), path: '/' });
    }
  }


  // 4. Route Protection Logic
  const isAuthenticated = !!sessionPayload;
  
  const isPublicRoute = pathname === '/' || pathname.startsWith('/book') || pathname.startsWith('/ticket') || pathname.startsWith('/my-tickets');
  const isAdminRoute = pathname.startsWith('/admin');
  const isSuperAdminRoute = pathname.startsWith('/super-admin');
  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/super-admin/login';
  const isForcePasswordChangeRoute = pathname === '/force-password-change';

  // If password change is required
  if (isAuthenticated && sessionPayload.passwordChangeRequired) {
    // And user is NOT on the change password page, redirect them
    if (!isForcePasswordChangeRoute) {
      return NextResponse.redirect(new URL('/force-password-change', request.url));
    }
  }
  // If password change is NOT required but user is on the change password page
  else if (isAuthenticated && !sessionPayload.passwordChangeRequired && isForcePasswordChangeRoute) {
     // Redirect them to their dashboard
    const home = sessionPayload.role === 'SUPER_ADMIN' ? '/super-admin' : '/admin';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // If user is authenticated and tries to access login pages, redirect them to dashboard
  if (isAuthenticated && isAuthRoute) {
    const home = sessionPayload.role === 'SUPER_ADMIN' ? '/super-admin' : '/admin';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // If user is NOT authenticated and tries to access a protected route
  if (!isAuthenticated && (isAdminRoute || isSuperAdminRoute) && !isAuthRoute) {
    const loginPath = isSuperAdminRoute ? '/super-admin/login' : '/login';
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

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

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};