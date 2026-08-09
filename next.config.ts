import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel gère son propre déploiement serverless : le mode standalone (pour
  // l'auto-hébergement via `bun run start`) est désactivé sur Vercel, sinon le
  // build échoue (fichier .next/next-server.js.nft.json introuvable).
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
