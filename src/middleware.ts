import { NextResponse, type NextRequest } from "next/server";
import { isSessionCookieValue, sessionCookie } from "@/lib/auth/cookie";

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPath =
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/health" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/splash") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico";

  if (pathname === "/api/auth/login" || pathname === "/api/health") {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get(sessionCookie)?.value;
  const hasValidSessionCookie = isSessionCookieValue(sessionId);

  if (!publicPath && !hasValidSessionCookie) {
    if (pathname.startsWith("/api")) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const response = NextResponse.redirect(url);
    if (sessionId) response.cookies.delete(sessionCookie);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
