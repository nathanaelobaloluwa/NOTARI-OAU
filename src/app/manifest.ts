import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NOTARI 2.0 - OAU Event & Ticketing Platform",
    short_name: "NOTARI",
    description:
      "Modern event discovery, digital ticketing, and community management platform for Obafemi Awolowo University (OAU), Ile-Ife, Nigeria.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F6FA",
    theme_color: "#151C35",
    icons: [
      {
        src: "/icons/notari-notification-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
