import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/validators/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        // Scaffold authentication foundation
        // Note: Full database verification and password hashing will be activated in authentication phase
        const { email } = parsed.data;

        // Illustrative fallback for dev scaffolding:
        if (email.includes("admin")) {
          return {
            id: "admin-scaffold-id",
            name: "Super Administrator",
            email: email,
            role: "admin",
          };
        } else if (email.includes("org")) {
          return {
            id: "organizer-scaffold-id",
            name: "Campus Org",
            email: email,
            role: "organizer",
          };
        } else {
          return {
            id: "student-scaffold-id",
            name: "Adeola Johnson",
            email: email,
            role: "student",
          };
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "scaffold_auth_secret_minimum_32_characters",
});
