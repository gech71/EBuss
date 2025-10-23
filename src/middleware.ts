// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = ['https://yourdomain.com', 'https://admin.yourdomain.com'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Generate CSP nonce
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const nonce = btoa(String.fromCharCode(...array));

  // 2. Session check
  const sessionCookie = request.cookies.get('auth_session')?.value;
  const isAuthenticated = !!sessionCookie;

  // 3. Route protection
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

  let response: NextResponse;

  if (isProtectedRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    response = NextResponse.redirect(url);
  } else if (isAuthRoute && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    response = NextResponse.redirect(url);
  } else {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    response = NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // 4. Security headers
  response.headers.set('Content-Security-Policy', `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' https://api.qrserver.com https://www.daimlertruck.com https://placehold.co https://picsum.photos https://dekonpower.com data:;
    connect-src 'self';
    frame-ancestors 'self';
    frame-src 'none';
    child-src 'none';
    worker-src 'self';
    media-src 'self';
    manifest-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim());

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  // 5. CORS for API requests
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // 6. Secure cookie
  if (sessionCookie) {
    response.cookies.set('auth_session', sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
    });
  }

  return response;
}

// 7. Apply middleware to all routes except Next.js internals
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
