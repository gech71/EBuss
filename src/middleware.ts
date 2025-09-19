import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateRequest } from '@/app/lib/auth';
 
export async function middleware(request: NextRequest) {
  const { user } = await validateRequest();
  const { pathname } = request.nextUrl;

  // If the user is not authenticated, redirect to login page
  if (!user) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // If the user is authenticated, handle role-based access
  if (user.role === 'SUPER_ADMIN') {
    // Super admin can access /super-admin and /
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/api')) {
        return NextResponse.redirect(new URL('/super-admin', request.url));
    }
  } else if (user.role === 'ADMIN') {
    // Admin can access /admin and /
    if (pathname.startsWith('/super-admin')) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }
  } else {
    // Other roles (e.g., CUSTOMER) should not access admin portals
    if (pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) {
        return NextResponse.redirect(new URL('/', request.url));
    }
  }
 
  return NextResponse.next()
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/login'],
}
