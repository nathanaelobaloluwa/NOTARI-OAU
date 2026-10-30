import React from "react";
import Link from "next/link";
import { NotariLogo } from "./notari-logo";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white pt-16 pb-12 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-100">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <NotariLogo variant="public" />
            <p className="text-sm text-slate-500 leading-relaxed">
              The premier campus event discovery, digital ticketing, and community platform for Obafemi Awolowo University (OAU), Ile-Ife.
            </p>
            <p className="text-xs text-slate-400">
              For Great Ife students, departmental associations, and campus organizers.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-notari-dark mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/events" className="hover:text-notari-primary transition-colors">
                  Upcoming Events
                </Link>
              </li>
              <li>
                <Link href="/events?category=Tech+%26+Innovation" className="hover:text-notari-primary transition-colors">
                  Tech & Hackathons
                </Link>
              </li>
              <li>
                <Link href="/events?category=Music+%26+Concerts" className="hover:text-notari-primary transition-colors">
                  Concerts & Parties
                </Link>
              </li>
              <li>
                <Link href="/events?category=Academic+%26+Educational" className="hover:text-notari-primary transition-colors">
                  Academic Symposiums
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-notari-dark mb-4">
              Portals
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/student" className="hover:text-notari-primary transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/organizer" className="hover:text-notari-primary transition-colors">
                  Organizer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-notari-primary transition-colors">
                  Superadmin Console
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-notari-primary transition-colors">
                  Register as Organizer
                </Link>
              </li>
            </ul>
          </div>

          {/* Campus Venues & Info */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-notari-dark mb-4">
              OAU Venues
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>• Oduduwa Hall</li>
              <li>• Amphi Theatre</li>
              <li>• Sports Complex</li>
              <li>• Health Sciences Auditorium</li>
              <li>• Hezekiah Oluwasanmi Lawn</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} NOTARI. Obafemi Awolowo University, Ile-Ife. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/about" className="hover:text-slate-600 transition-colors">About NOTARI</Link>
            <span>•</span>
            <span className="text-emerald-600 font-medium">All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
