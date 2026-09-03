"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shuffle,
  Settings,
  CalendarDays,
  Repeat,
  BarChart3,
  Users,
  ClipboardList,
  Target,
  Shield,
  Activity,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";

const ADMIN_EMAIL = "bastey86@googlemail.com";

const CARD_COLORS: Record<string, string> = {
  draft: "linear-gradient(135deg, #fcd34d, #f59e0b)",
  setup: "linear-gradient(135deg, #9ca3af, #4b5563)",
  season: "linear-gradient(135deg, #34d399, #059669)",
  waivers: "linear-gradient(135deg, #f472b6, #db2777)",
  stats: "linear-gradient(135deg, #60a5fa, #2563eb)",
  roster: "linear-gradient(135deg, #a78bfa, #7c3aed)",
  lineup: "linear-gradient(135deg, #fbbf24, #d97706)",
  tippspiel: "linear-gradient(135deg, #f87171, #dc2626)",
  teams: "linear-gradient(135deg, #22d3ee, #0891b2)",
  activity: "linear-gradient(135deg, #fb923c, #ea580c)",
  glossary: "linear-gradient(135deg, #94a3b8, #475569)",
};

function DashboardCard({ href, title, desc, icon: Icon, colorKey }: { href: string; title: string; desc: string; icon: LucideIcon; colorKey: string }) {
  return (
    <Link href={href} className="block">
      <SpotlightCard className="card card-hover">
        <div
          className="flex items-center justify-center rounded-xl mb-3"
          style={{ width: 40, height: 40, background: CARD_COLORS[colorKey], boxShadow: "0 4px 14px -4px rgba(0,0,0,0.5)" }}
        >
          <Icon size={20} color="#0b0b0f" strokeWidth={2.3} />
        </div>
        <div className="text-[var(--text-primary)] text-sm font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
      </SpotlightCard>
    </Link>
  );
}

export default function Home() {
  const { t } = useLang();
  const h = t.home;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;
    supabase.auth.getUser().then(({ data }) => setIsAdmin(data.user?.email === ADMIN_EMAIL));
  }, []);

  return (
    <main className="mx-auto max-w-[860px] px-6 py-10">
      <header className="text-center border-b border-[var(--border-subtle)] pb-8 mb-10">
        <div
          className="mx-auto mb-4 flex items-center justify-center rounded-2xl"
          style={{
            width: 56,
            height: 56,
            background: "linear-gradient(135deg, #fcd34d 0%, #f59e0b 55%, #d97706 100%)",
            boxShadow: "0 8px 28px -6px rgba(245,158,11,0.6)",
          }}
        >
          <span style={{ fontSize: 26, transform: "rotate(-18deg)" }}>🏈</span>
        </div>
        <div className="eyebrow mb-2">{h.eyebrow}</div>
        <h1
          className="hero-gradient-text font-black tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 6vw, 56px)", letterSpacing: "-1.5px" }}
        >
          {h.title}
        </h1>
        <p className="text-[var(--text-dim)] text-sm mt-2">{h.subtitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardCard href="/draft" title={h.draftTitle} desc={h.draftDesc} icon={Shuffle} colorKey="draft" />
        <DashboardCard href="/setup" title={h.setupTitle} desc={h.setupDesc} icon={Settings} colorKey="setup" />
        <DashboardCard href="/season" title={h.seasonTitle} desc={h.seasonDesc} icon={CalendarDays} colorKey="season" />
        <DashboardCard href="/waivers" title={h.waiverTitle} desc={h.waiverDesc} icon={Repeat} colorKey="waivers" />
        <DashboardCard href="/stats" title={h.statsTitle} desc={h.statsDesc} icon={BarChart3} colorKey="stats" />
        <DashboardCard href="/roster" title={h.rosterTitle} desc={h.rosterDesc} icon={Users} colorKey="roster" />
        <DashboardCard href="/lineup" title={h.lineupTitle} desc={h.lineupDesc} icon={ClipboardList} colorKey="lineup" />
        <DashboardCard href="/tippspiel" title={h.tippspielTitle} desc={h.tippspielDesc} icon={Target} colorKey="tippspiel" />
        <DashboardCard href="/teams" title={h.teamsTitle} desc={h.teamsDesc} icon={Shield} colorKey="teams" />
        <DashboardCard href="/activity" title={h.activityTitle} desc={h.activityDesc} icon={Activity} colorKey="activity" />
        <DashboardCard href="/glossary" title={h.glossaryTitle} desc={h.glossaryDesc} icon={BookOpen} colorKey="glossary" />
      </div>

      <footer className="text-center text-[12px] text-[var(--text-ghost)] mt-16">
        {h.footer}
        {isAdmin && (
          <>
            {" · "}
            <Link href="/admin" className="underline">
              Admin
            </Link>
          </>
        )}
      </footer>
    </main>
  );
}

