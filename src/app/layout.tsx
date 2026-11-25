import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/shared/session-provider";
import { NetworkStatusProvider } from "@/components/shared/network-status-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "NOTARI 2.0 - OAU University Event Discovery & Ticketing Platform",
  description:
    "The modern event discovery, digital ticketing, and community management platform for Obafemi Awolowo University (OAU), Ile-Ife, Nigeria.",
  keywords: ["NOTARI", "OAU", "Obafemi Awolowo University", "Events", "Tickets", "Great Ife"],
  applicationName: "NOTARI 2.0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NOTARI",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen bg-notari-bg text-notari-dark font-sans">
        <SessionProvider>
          <NetworkStatusProvider>{children}</NetworkStatusProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
