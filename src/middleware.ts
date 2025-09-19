import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Check for the session cookie
  const sessionCookie = request.cookies.get('auth_session')?.value;
  const isAuthenticated = !!sessionCookie;

  // 2. Define protected and auth routes
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

  // 3. Handle redirects
  if (isProtectedRoute && !isAuthenticated) {
    // User is not authenticated and trying to access a protected route, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && isAuthenticated) {
    // User is authenticated and trying to access login/register, redirect to admin dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/admin'; // Default redirect for authenticated users
    return NextResponse.redirect(url);
  }

  // 4. If no redirect is needed, continue
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/login', '/register'],
};
