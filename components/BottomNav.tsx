"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shuffle, ClipboardList, CalendarDays, Repeat } from "lucide-react";
import { useLang } from "@/lib/i18n/LanguageContext";

const TABS = [
  { href: "/", icon: Home, key: "home" as const },
  { href: "/draft", icon: Shuffle, key: "draft" as const },
  { href: "/lineup", icon: ClipboardList, key: "lineup" as const },
  { href: "/season", icon: CalendarDays, key: "season" as const },
  { href: "/waivers", icon: Repeat, key: "waivers" as const },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();

  // Auf /login und /invite/* nicht anzeigen (dort ist man noch nicht "in" der Liga).
  if (pathname === "/login" || pathname.startsWith("/invite")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[90] flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]"
      style={{ background: "rgba(10,10,15,0.92)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border-subtle)" }}
    >
      {TABS.map(({ href, icon: Icon, key }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5">
            <span
              className="flex items-center justify-center rounded-full transition-all"
              style={{
                width: 40,
                height: 26,
                background: active ? "linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)" : "transparent",
                boxShadow: active ? "0 0 14px -2px rgba(245,158,11,0.7)" : "none",
              }}
            >
              <Icon size={19} strokeWidth={active ? 2.6 : 1.8} color={active ? "#1c1103" : "var(--text-dim)"} />
            </span>
            <span className="text-[10px] font-medium" style={{ color: active ? "var(--gold)" : "var(--text-dim)" }}>
              {t.nav[key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
