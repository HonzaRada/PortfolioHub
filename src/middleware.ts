import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "~/lib/auth";

export const runtime = "nodejs";

export async function middleware(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  const isLoggedIn = !!session;

  const isOnPlatform = 
    req.nextUrl.pathname.startsWith("/dashboard") || 
    req.nextUrl.pathname.startsWith("/portfolios") ||
    req.nextUrl.pathname.startsWith("/settings");

  if (isOnPlatform && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};