import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserBadge } from "@/components/UserBadge";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Gridiron Oracle League",
  description: "Solo NFL Fantasy Football Liga · PPR · Snake Draft · 10 Teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${playfair.variable} ${sourceSerif.variable} h-full`}>
      <body className="min-h-full antialiased">
        <LanguageProvider>
          <div className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-2">
            <LanguageToggle />
            <UserBadge />
          </div>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
