import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/validators/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";

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

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        try {
          await connectToDatabase();

          // Query MongoDB user with password hash explicitly selected
          const user = await User.findOne({ email: normalizedEmail }).select("+password");
          if (!user || !user.password) {
            return null;
          }

          // Verify submitted password against stored bcrypt hash
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          // Return genuine authenticated user payload derived strictly from MongoDB
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
          };
        } catch (error) {
          console.error("❌ Authentication authorization error:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "scaffold_auth_secret_minimum_32_characters",
});
