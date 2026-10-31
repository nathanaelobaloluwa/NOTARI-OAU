"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Sparkles, MapPin } from "lucide-react";

export const OAU_CAMPUS_PHOTOGRAPHS = [
  {
    id: "oduduwa-hall",
    title: "Experience Campus Life",
    tag: "Great Ife Community",
    location: "Oduduwa Hall Complex",
    description:
      "Stay connected with student events, conferences, and celebrations happening around Oduduwa Hall.",
    src: "/images/oau/oau-oduduwa-hall.jpg",
    alt: "Oduduwa Hall, Obafemi Awolowo University",
    badge: "Oduduwa Hall",
  },
  {
    id: "amphitheatre-stage",
    title: "The Grand Assembly",
    tag: "OAU Amphitheatre",
    location: "Tiered Stage Arena",
    description:
      "The cultural heartbeat of Great Ife where matriculations, academic symposiums, and concerts take center stage.",
    src: "/images/oau/oau-amphitheatre-stage.jpg",
    alt: "OAU Amphitheatre Stage with University Crest and Blue & Gold Seating",
    badge: "Amphitheatre",
  },
  {
    id: "senate-building",
    title: "Advancing Knowledge",
    tag: "University Secretariat",
    location: "Senate Building Tower",
    description:
      "Over 60 years of academic excellence and leadership across Africa's most renowned university campus.",
    src: "/images/oau/oau-senate-building.png",
    alt: "OAU Senate Building with Great Ife Celebration Banner",
    badge: "Senate Building",
  },
  {
    id: "matriculation-crowd",
    title: "Vibrant Student Community",
    tag: "Great Ife Students",
    location: "Student Assembly",
    description:
      "Thousands of students gathering for university milestones, campus congresses, and live community celebrations.",
    src: "/images/oau/oau-matriculation-crowd.jpg",
    alt: "Great Ife Students at the Amphitheatre during University Matriculation",
    badge: "Student Assembly",
  },
];

export function CampusHeroVisual() {
  const [activeIdx, setActiveIdx] = useState(0);
  const current = OAU_CAMPUS_PHOTOGRAPHS[activeIdx];

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900/90 backdrop-blur-md group">
      {/* 1. Main Photographic Display */}
      <div className="relative aspect-[4/3] w-full bg-slate-950">
        <Image
          key={current.id}
          src={current.src}
          alt={current.alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 42vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-90 animate-in fade-in duration-500"
          priority
        />
        {/* Multilayered contrast gradient to ensure 100% text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        <div className="absolute inset-0 bg-slate-950/20" />
      </div>

      {/* 2. Top Interactive Landmark Selector Pills */}
      <div className="absolute top-3.5 left-3.5 right-3.5 sm:top-4 sm:left-4 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
        {OAU_CAMPUS_PHOTOGRAPHS.map((item, idx) => {
          const isActive = idx === activeIdx;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 cursor-pointer backdrop-blur-md border flex items-center gap-1",
                isActive
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow-sm"
                  : "bg-slate-900/70 text-slate-200 border-white/15 hover:bg-slate-900/90 hover:text-white"
              )}
              aria-label={`View ${item.badge} photograph`}
            >
              <span>{item.badge}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Bottom Information Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 space-y-1.5 z-20">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{current.tag}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-300 font-medium bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm">
            <MapPin className="w-3 h-3 text-indigo-300 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-none">{current.location}</span>
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
          {current.title}
        </h3>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-none">
          {current.description}
        </p>
      </div>
    </div>
  );
}
