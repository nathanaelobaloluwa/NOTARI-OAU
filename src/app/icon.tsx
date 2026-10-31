import { ImageResponse } from "next/og";

export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
          borderRadius: "40px",
          color: "#FBBF24",
          fontSize: "96px",
          fontWeight: 900,
          fontFamily: "sans-serif",
          boxShadow: "0 8px 32px rgba(79, 70, 229, 0.4)",
        }}
      >
        N
      </div>
    ),
    {
      ...size,
    }
  );
}
