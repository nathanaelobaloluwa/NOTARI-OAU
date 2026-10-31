"use client";

import React from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Shared Client Session Provider wrapper
 * Enables useSession() and client-side session management across client components.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

