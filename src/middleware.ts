
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 2. Session check
  const sessionCookie = request.cookies.get('auth_session')?.value;
  const isAuthenticated = !!sessionCookie;

  // 3. Auth/Protected routes logic
  const isProtectedRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/register');

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
    response = NextResponse.next();
  }
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(self)'
  );

  return response;
}

// 5. Apply middleware to ALL routes except Next.js internals and static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
