"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotariLogo } from "./notari-logo";
import { Button } from "@/components/ui/button";
import { Menu, X, Calendar, User, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Events", href: "/events" },
  { name: "About", href: "/about" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <NotariLogo variant="public" />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-notari-primary",
                  isActive ? "text-notari-primary font-semibold" : "text-slate-600"
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/organizer">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-notari-primary gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Organizer Portal</span>
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-notari-primary gap-1.5">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Admin</span>
            </Button>
          </Link>
          <div className="h-5 w-px bg-slate-200 mx-1" />
          <Link href="/login">
            <Button variant="outline" size="sm" className="rounded-xl font-medium">
              Log In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="rounded-xl font-medium shadow-sm shadow-indigo-500/20">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/login">
            <Button size="sm" variant="subtle" className="rounded-lg text-xs">
              Log In
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4">
          <nav className="flex flex-col space-y-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-slate-700 hover:text-notari-primary py-1"
              >
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <Link href="/student" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-start gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Student Dashboard
              </Button>
            </Link>
            <Link href="/organizer" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Organizer Portal
              </Button>
            </Link>
            <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Shield className="w-4 h-4 text-slate-700" />
                Superadmin Dashboard
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full mt-2">Create Account</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
