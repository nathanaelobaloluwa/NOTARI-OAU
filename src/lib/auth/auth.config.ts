import type { NextAuthConfig } from "next-auth";

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

      // Student routes protection
      if (pathname.startsWith("/student")) {
        return isLoggedIn;
      }

      // Organizer routes protection
      if (pathname.startsWith("/organizer")) {
        if (!isLoggedIn) return false;
        const role = (auth.user as { role?: string })?.role;
        return role === "organizer" || role === "admin";
      }

      // Superadmin routes protection
      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        const role = (auth.user as { role?: string })?.role;
        return role === "admin";
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "student";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as { role?: string }).role = (token.role as string) || "student";
      }
      return session;
    },
  },
  providers: [], // Configured with credentials in auth.ts
};
