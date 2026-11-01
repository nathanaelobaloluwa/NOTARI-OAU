import { DefaultSession } from "next-auth";
import { UserRole } from "@/constants/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isOrganizer?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: UserRole;
    isOrganizer?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    isOrganizer?: boolean;
  }
}

