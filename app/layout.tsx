import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Source_Serif_4, Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserBadge } from "@/components/UserBadge";
import { LeagueProvider } from "@/lib/league/LeagueContext";
import { LeagueSwitcher } from "@/components/LeagueSwitcher";
import { BottomNav } from "@/components/BottomNav";
import { ToastProvider } from "@/components/ToastProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Gridiron Oracle League",
  description: "Solo & Multiplayer NFL Fantasy Football Liga · PPR · Snake Draft",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gridiron Oracle",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${spaceGrotesk.variable} ${sourceSerif.variable} ${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        <ServiceWorkerRegister />
        <LanguageProvider>
          <ToastProvider>
            <LeagueProvider>
              <LeagueSwitcher />
              <div className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-2">
                <LanguageToggle />
                <UserBadge />
              </div>
              {children}
              <BottomNav />
            </LeagueProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
