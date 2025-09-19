import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
};

async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Routes that are for authentication
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  
  // Public routes that don't require authentication
  const isPublicRoute = pathname === '/'; // Add any other public routes here

  // Protected routes that require authentication
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');

  const sessionCookie = request.cookies.get('auth_session')?.value;
  const decodedToken = sessionCookie ? await verifyJwt(sessionCookie) : null;
  const isAuthenticated = !!decodedToken;

  if (isProtectedRoute && !isAuthenticated) {
    // Redirect unauthenticated users from protected routes to the login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && isAuthenticated) {
    // Redirect authenticated users from login/register to the admin dashboard
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

// Configure the middleware to run on specific paths.
export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/login', '/register'],
};
