import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session");
  const path = request.nextUrl.pathname;
  const isLoginPage = path === "/login";
  const isAuthApi = path.startsWith("/api/auth/");

  // Allow unauthenticated access to login page and auth API routes
  if (isLoginPage || isAuthApi) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users from main page
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from login page
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/api/auth/:path*"],
};
