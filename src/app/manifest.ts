import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NOTARI 2.0 - OAU Event & Ticketing Platform",
    short_name: "NOTARI",
    description:
      "Modern event discovery, digital ticketing, and community management platform for Obafemi Awolowo University (OAU), Ile-Ife, Nigeria.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F7FC",
    theme_color: "#4F46E5",
    icons: [
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
