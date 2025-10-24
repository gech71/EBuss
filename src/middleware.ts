
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

const ALLOWED_ORIGINS = ['https://yourdomain.com', 'https://admin.yourdomain.com'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);

  // 1. Generate CSP nonce
  const nonce = btoa(randomBytes(16).toString());
  requestHeaders.set('x-nonce', nonce);

  // 2. Manage CSRF Token
  let csrfToken = request.cookies.get('csrf_token')?.value;
  if (!csrfToken) {
    csrfToken = randomBytes(32).toString('hex');
  }
  // We set the token on the request headers so it's available in API routes and Server Components
  requestHeaders.set('X-CSRF-Token', csrfToken);


  // 3. Session check
  const sessionCookie = request.cookies.get('auth_session')?.value;
  const isAuthenticated = !!sessionCookie;

  // 4. Route protection
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/super-admin/login');

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (isProtectedRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    response = NextResponse.redirect(url);
  } else if (isAuthRoute && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin'; 
    response = NextResponse.redirect(url);
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

  // 7. Secure session cookie attributes
  if (sessionCookie) {
    const currentCookie = response.cookies.get('auth_session');
    if (currentCookie) {
         response.cookies.set('auth_session', currentCookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        });
    }
  }

  return response;
}

// 8. Apply middleware to all routes except Next.js internals
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
