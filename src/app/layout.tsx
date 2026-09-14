import type { Metadata, Viewport } from "next";
import { Rajdhani, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const display = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Battlora — Free Fire Esports Tournament Platform",
    template: "%s | Battlora",
  },
  description:
    "Compete in professional Free Fire tournaments, climb the leaderboard and prove your team. Complete tournament management: registration, matches, rooms, scoring, prizes and more.",
  keywords: [
    "Free Fire",
    "esports",
    "tournament",
    "Battlora",
    "leaderboard",
    "competitive gaming",
  ],
  openGraph: {
    title: "Battlora — Free Fire Esports Tournament Platform",
    description:
      "BATTLE. COMPETE. CONQUER. Professional Free Fire tournaments with automated scoring, transparent leaderboards and prize management.",
    siteName: "Battlora",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
