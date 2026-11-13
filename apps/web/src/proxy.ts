import { NextResponse, type NextRequest } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/config';
import { isTokenExpired } from '@/lib/jwt';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const authenticated = !!token && !isTokenExpired(token);
  const isLoginPage = pathname === '/login';

  if (!authenticated && !isLoginPage) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname + search);
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete(TOKEN_COOKIE);
    return response;
  }

  if (authenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
