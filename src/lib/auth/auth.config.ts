import type { NextAuthConfig } from "next-auth";
import { USER_ROLES, UserRole } from "@/constants/roles";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    newUser: "/register",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const role = (auth?.user as { role?: string })?.role as UserRole | undefined;
      const isOrganizer = Boolean(
        (auth?.user as { isOrganizer?: boolean })?.isOrganizer || role === USER_ROLES.ORGANIZER
      );

      // 1. Student routes protection: Only student role
      if (pathname.startsWith("/student")) {
        if (!isLoggedIn) return false;
        if (role !== USER_ROLES.STUDENT) {
          if (role === USER_ROLES.ORGANIZER) {
            return Response.redirect(new URL("/organizer", nextUrl));
          }
          if (role === USER_ROLES.ADMIN) {
            return Response.redirect(new URL("/admin", nextUrl));
          }
          return false;
        }
        return true;
      }

      // 2. Organizer routes protection: Either dedicated organizer role or approved student organizer capability
      if (pathname.startsWith("/organizer")) {
        if (!isLoggedIn) return false;
        if (!isOrganizer) {
          if (role === USER_ROLES.STUDENT) {
            return Response.redirect(new URL("/student", nextUrl));
          }
          if (role === USER_ROLES.ADMIN) {
            return Response.redirect(new URL("/admin", nextUrl));
          }
          return false;
        }
        return true;
      }

      // 3. Superadmin routes protection: Only admin role
      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        if (role !== USER_ROLES.ADMIN) {
          if (role === USER_ROLES.STUDENT) {
            return Response.redirect(new URL("/student", nextUrl));
          }
          if (role === USER_ROLES.ORGANIZER) {
            return Response.redirect(new URL("/organizer", nextUrl));
          }
          return false;
        }
        return true;
      }

      // 4. Redirect logged-in users away from visitor-only & auth pages to their respective dashboards
      if (
        isLoggedIn &&
        (pathname === "/" || pathname === "/about" || pathname === "/login" || pathname === "/register")
      ) {
        if (role === USER_ROLES.ADMIN) {
          return Response.redirect(new URL("/admin", nextUrl));
        } else if (isOrganizer) {
          return Response.redirect(new URL("/organizer", nextUrl));
        } else {
          return Response.redirect(new URL("/student", nextUrl));
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session: updateData }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || USER_ROLES.STUDENT;
        token.isOrganizer = Boolean((user as { isOrganizer?: boolean }).isOrganizer);
        token.picture = (user as { image?: string }).image || (user as { profilePhotoUrl?: string }).profilePhotoUrl;
      }
      if (trigger === "update" && updateData) {
        if (updateData.image !== undefined) {
          token.picture = updateData.image;
        }
        if (updateData.name) {
          token.name = updateData.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as { role?: string }).role = (token.role as string) || USER_ROLES.STUDENT;
        (session.user as { isOrganizer?: boolean }).isOrganizer = Boolean(token.isOrganizer);
        if (token.picture) {
          session.user.image = token.picture as string;
        } else if (token.picture === null) {
          session.user.image = undefined;
        }
      }
      return session;
    },
  },
  providers: [],
};
