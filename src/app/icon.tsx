import React from "react";
import { ImageResponse } from "next/og";

export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

/**
 * Dynamic NOTARI Favicon & Application Icon
 * Renders the official Great Ife University Crest shield emblem
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#151C35",
          borderRadius: "44px",
          padding: "16px",
        }}
      >
        <svg
          viewBox="0 0 100 115"
          width="160"
          height="184"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Shield Outline */}
          <path
            d="M50 4 L88 18 C88 56 74 92 50 112 C26 92 12 56 12 18 Z"
            fill="#1B264F"
            stroke="#F59E0B"
            strokeWidth="5"
          />

          {/* Inner Golden Inset Line */}
          <path
            d="M50 12 L82 23 C82 53 70 85 50 103 C30 85 18 53 18 23 Z"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />

          {/* Open Academic Book */}
          <path
            d="M48 40 C36 36 26 38 22 41 V57 C26 54 36 52 48 56 Z"
            fill="#FFFFFF"
            stroke="#151C35"
            strokeWidth="1"
          />
          <path
            d="M52 40 C64 36 74 38 78 41 V57 C74 54 64 52 52 56 Z"
            fill="#FFFFFF"
            stroke="#151C35"
            strokeWidth="1"
          />
          <path d="M50 39 V57" stroke="#F59E0B" strokeWidth="2.5" />

          {/* Torch of Enlightenment Flame */}
          <path
            d="M50 20 C45 27 44 32 47 37 C48.5 35 51.5 35 53 37 C56 32 55 27 50 20 Z"
            fill="#20BFA9"
          />
          <circle cx="50" cy="30" r="3" fill="#FBBF24" />

          {/* Ori Olokun / Ife Bronze Crown & Head */}
          <path
            d="M36 67 C42 62 58 62 64 67 L62 72 C56 69 44 69 38 72 Z"
            fill="#F59E0B"
          />
          <path
            d="M40 72 C40 85 46 91 50 92 C54 91 60 85 60 72 C55 70 45 70 40 72 Z"
            fill="#D97706"
          />

          {/* Base Laurel Stars */}
          <circle cx="50" cy="99" r="3" fill="#FBBF24" />
          <circle cx="42" cy="96" r="2.2" fill="#20BFA9" />
          <circle cx="58" cy="96" r="2.2" fill="#20BFA9" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
