import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/sgiau/theme-provider";
import { MotionProvider } from "@/components/sgiau/motion-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SGIAU — Gestion de l'Amicale Universitaire",
  description:
    "Gestion de l'amicale universitaire : membres, cotisations, comptabilité, activités, élections, documents et plus.",
  keywords: ["amicale", "universitaire", "gestion", "cotisations", "SGIAU"],
  authors: [{ name: "SGIAU" }],
  themeColor: "#086808",
  appleWebApp: { capable: true, title: "Espace membre", statusBarStyle: "default" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <MotionProvider reducedMotion="user">
            {children}
            <Toaster />
            <SonnerToaster richColors position="top-right" />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
