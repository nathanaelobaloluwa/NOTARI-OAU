import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

/**
 * Next.js Edge Route Protection Middleware
 * Intercepts incoming requests and evaluates role permissions and session presence
 * before routes are rendered on the server.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    /*
     * Match all protected dashboard route patterns and authentication pages
     */
    "/student/:path*",
    "/organizer/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};

