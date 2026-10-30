import React from "react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-notari-bg text-notari-dark">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
