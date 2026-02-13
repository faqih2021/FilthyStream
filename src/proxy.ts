import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public page routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/listen'];

// API routes that don't require authentication
const publicApiRoutes = ['/api/auth/login', '/api/auth/register', '/api/listen', '/api/stream'];

// The home page and stations browse are also public
const publicExactRoutes = ['/', '/stations'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if it's a public page route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check exact public routes
  if (publicExactRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check if it's a public API route
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for auth token (Supabase)
  const token = request.cookies.get('sb-access-token')?.value;

  if (!token) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // For pages, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
