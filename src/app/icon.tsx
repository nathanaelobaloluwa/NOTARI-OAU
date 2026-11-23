import React from "react";
import { ImageResponse } from "next/og";
import { NOTARI_MONOGRAM_PATH } from "@/components/shared/notari-symbol";

export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

/**
 * Dynamic NOTARI Favicon & Application Icon
 * Renders the official geometric N brand monogram in site colors on Midnight Navy
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
          border: "2px solid rgba(65, 105, 225, 0.4)",
          padding: "24px",
        }}
      >
        <svg
          viewBox="-8 -8 116 154"
          width="130"
          height="172"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Monogram Body in Electric Blue */}
          <path
            d={NOTARI_MONOGRAM_PATH}
            fill="#4169E1"
          />

          {/* Diagonal Bridge & Right Pillar Overlay in Campus Teal */}
          <path
            d="M5,45 L100,138 L100,37 L72,0 L71,39 L95,66 L95,93 Z"
            fill="#20BFA9"
          />

          {/* Diagonal Chamfer Highlight in Cloud White */}
          <path
            d="M0,0 L95,93"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Bottom Diagonal Chamfer in Deep Teal */}
          <path
            d="M5,45 L100,138"
            stroke="#14B8A6"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Academic Beacon Golden Star at Apex */}
          <circle cx="72" cy="2" r="6" fill="#FBBF24" />
          <circle cx="72" cy="2" r="3" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
