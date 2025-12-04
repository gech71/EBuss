
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt, SessionPayload, deleteSession } from './app/lib/auth';
import { cookies } from 'next/headers';

const ALLOWED_ORIGINS = ['https://yourdomain.com', 'https://admin.yourdomain.com'];

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


  // 3. Session Validation
  const sessionCookieValue = request.cookies.get('session')?.value;
  let sessionPayload: SessionPayload | null = null;
  
  if (sessionCookieValue) {
      const decryptedPayload = await decrypt(sessionCookieValue);
      if (decryptedPayload) {
          // Additional validation can happen here if needed, like checking against DB
          sessionPayload = decryptedPayload;
      }
  }
  
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });


  // 4. Route Protection Logic
  const { user, session } = await validateRequest();
  const isAuthenticated = !!user && !!session;
  
  const isAdminRoute = pathname.startsWith('/admin');
  const isSuperAdminRoute = pathname.startsWith('/super-admin');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/super-admin/login');
  const isForcePasswordChangeRoute = pathname === '/force-password-change';

  // Enforce password change if required
  if (isAuthenticated && session.passwordChangeRequired) {
    if (!isForcePasswordChangeRoute) {
        return NextResponse.redirect(new URL('/force-password-change', request.url));
    }
  } else if (isAuthenticated && isForcePasswordChangeRoute) {
    // If password change is NOT required but user is on the page, redirect them away
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Redirect unauthenticated users from protected routes
  if ((isAdminRoute || isSuperAdminRoute) && !isAuthenticated && !isAuthRoute) {
      const loginPath = isSuperAdminRoute ? '/super-admin/login' : '/login';
      return NextResponse.redirect(new URL(loginPath, request.url));
  }

  // Redirect authenticated users away from login pages
  if (isAuthRoute && isAuthenticated) {
      const redirectPath = session.passwordChangeRequired ? '/force-password-change' : '/admin';
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


async function validateRequest(): Promise<{ user: any | null; session: SessionPayload | null; }> {
    const cookieStore = cookies();
    const sessionCookieValue = cookieStore.get('session')?.value;
    
    if (!sessionCookieValue) {
        return { user: null, session: null };
    }

    const sessionPayload = await decrypt(sessionCookieValue);
    
    if (!sessionPayload || !sessionPayload.jti) {
        return { user: null, session: null };
    }

    const dbSession = await prisma.session.findUnique({
        where: { id: sessionPayload.jti }
    });

    if (!dbSession || !dbSession.fresh) {
        await deleteSession(sessionPayload.jti); // Clean up invalid session
        return { user: null, session: null };
    }
    
    const now = new Date();
    if (now > new Date(dbSession.expiresAt)) {
        await deleteSession(sessionPayload.jti); // Clean up expired session
        return { user: null, session: null };
    }

    const user = await prisma.user.findUnique({
        where: { id: sessionPayload.userId },
    });
    
    if (!user) {
        return { user: null, session: null };
    }

    const { hashed_password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, session: sessionPayload };
};


// 8. Apply middleware to all routes except Next.js internals
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
