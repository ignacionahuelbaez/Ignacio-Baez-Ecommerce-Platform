import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/account', '/checkout', '/admin'];

// `is_authenticated` is a client-set, non-httpOnly UX hint only — it prevents flashing
// protected pages before redirecting, it is NOT a security boundary. The real authorization
// check happens server-side on every API call via JwtAuthGuard/RolesGuard (apps/server/src/auth).
export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get('is_authenticated')?.value === '1';
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/checkout/:path*', '/admin/:path*'],
};
