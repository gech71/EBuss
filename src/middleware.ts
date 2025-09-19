import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { uncachedValidateRequest } from '@/app/lib/auth';

export const runtime = 'nodejs';
 
export async function middleware(request: NextRequest) {
  const { user } = await uncachedValidateRequest();
  const { pathname } = request.nextUrl;

  // If the user is authenticated and tries to access login, redirect them away
  if (user && pathname === '/login') {
    if (user.role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/super-admin', request.url));
    }
    if (user.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // If the user is not authenticated, redirect to login page for protected routes
  if (!user) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // If the user is authenticated, handle role-based access
  if (user.role === 'SUPER_ADMIN') {
    // Super admin should not access /admin
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/api')) {
        return NextResponse.redirect(new URL('/super-admin', request.url));
    }
  } else if (user.role === 'ADMIN') {
    // Admin should not access /super-admin
    if (pathname.startsWith('/super-admin')) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }
  } else {
    // Other roles (e.g., CUSTOMER) should not access admin portals
    if (pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
 
  return NextResponse.next()
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/login'],
}
