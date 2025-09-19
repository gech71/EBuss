
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('auth_session');
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!sessionCookie;

  // Protected routes that require authentication
  const protectedRoutes = ['/admin', '/super-admin'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Routes that authenticated users should not access
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If the user is not authenticated and is trying to access a protected route,
  // redirect them to the login page.
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If the user is authenticated and is trying to access a login/register page,
  // redirect them to the admin dashboard.
  if (isAuthenticated && isAuthRoute) {
     return NextResponse.redirect(new URL('/admin', request.url));
  }
 
  // Allow the request to proceed if none of the above conditions are met.
  return NextResponse.next()
}
 
// Configure the middleware to run on specific paths.
export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/login', '/register'],
}
