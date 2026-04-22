import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let mock endpoints, api auth, cron, static, and the login page pass through unauthenticated
  if (
    pathname.startsWith("/mock/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/cron/") ||
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("faketools_session");
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
