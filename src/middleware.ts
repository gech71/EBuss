import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { lucia } from '@/app/lib/auth';

export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get(lucia.sessionCookieName)?.value ?? null;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  
  let isAuthenticated = !!sessionId;

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
  return NextResponse.next();
}

// Configure the middleware to run on specific paths.
export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/login', '/register'],
};
