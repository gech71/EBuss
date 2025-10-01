
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Check for the session cookie
  const sessionCookie = request.cookies.get('auth_session')?.value;
  const isAuthenticated = !!sessionCookie;

  // 2. Define protected and auth routes
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/super-admin/login');

  // 3. Handle redirects
  if (isProtectedRoute && !isAuthenticated) {
    // User is not authenticated and trying to access a protected route, redirect to login
    const url = request.nextUrl.clone();
    
    if (pathname.startsWith('/super-admin')) {
      url.pathname = '/super-admin/login';
    } else {
      url.pathname = '/login';
    }
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && isAuthenticated) {
    // User is authenticated and trying to access an auth route, redirect away
    const url = request.nextUrl.clone();
    // A simple default redirect for any authenticated user trying to access an auth page.
    // The actual role-based redirect happens upon successful login in the `authenticate` action.
    url.pathname = '/admin'; 
    return NextResponse.redirect(url);
  }

  // 4. If no redirect is needed, continue
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/login', '/register', '/super-admin/login'],
};
