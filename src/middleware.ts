import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('auth_session');
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');

  let isAuthenticated = false;

  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(sessionCookie.value, secret);
      isAuthenticated = true;
    } catch (error) {
      // Token verification failed (e.g., expired, invalid signature)
      isAuthenticated = false;
    }
  }

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
