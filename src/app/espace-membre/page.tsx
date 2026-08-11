import type { Metadata } from "next"
import { MemberApp } from "@/components/sgiau/member-app"

export const metadata: Metadata = {
  title: "Espace membre — SGIAU",
  description:
    "Application mobile des membres de l'amicale : annonces, cotisations, reçus et demandes.",
}

export default function EspaceMembrePage() {
  return <MemberApp />
}
