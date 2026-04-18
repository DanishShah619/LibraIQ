import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";

// Routes accessible only to admins (SUPER_ADMIN or LIBRARIAN)
const ADMIN_ROUTES = ["/admin"];
// Routes requiring authentication
const PROTECTED_ROUTES = ["/dashboard", "/loans", "/recommendations", "/profile", "/leaderboard"];
const { auth } = NextAuth(authConfig);
export default auth(async (req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Redirect authenticated users away from auth pages
  if (session && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Require auth for protected routes
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require LIBRARIAN or SUPER_ADMIN role
  const isAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  if (isAdmin) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    const role = (session.user as any)?.role;
    if (role !== "SUPER_ADMIN" && role !== "LIBRARIAN") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)",
  ],
};
