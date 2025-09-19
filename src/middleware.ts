import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export const runtime = 'nodejs';
 
export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('auth_session');
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!sessionCookie;

  // Protected routes
  const protectedRoutes = ['/admin', '/super-admin'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    // In a real app, you might decode the cookie to redirect to the correct dashboard,
    // but for now, a simple redirect to the base admin page is fine.
    // This requires more complex logic to avoid redirect loops if they land on the wrong dashboard.
    // A simple redirect to a generic dashboard or home page is often safest.
     return NextResponse.redirect(new URL('/admin', request.url));
  }
 
  return NextResponse.next()
}
 
export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/login', '/register'],
}
