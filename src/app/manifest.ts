import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Espace membre — SGIAU",
    short_name: "Espace membre",
    description:
      "Application mobile des membres de l'amicale : annonces, cotisations, reçus et demandes.",
    start_url: "/espace-membre",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#086808",
    theme_color: "#086808",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
