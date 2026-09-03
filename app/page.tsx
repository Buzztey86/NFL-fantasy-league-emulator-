"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LanguageContext";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";

const ADMIN_EMAIL = "bastey86@googlemail.com";

function DashboardCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block">
      <SpotlightCard className="card card-hover">
        <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
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
        <div className="eyebrow mb-2">{h.eyebrow}</div>
        <h1
          className="hero-gradient-text font-black tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 5vw, 48px)", letterSpacing: "-1px" }}
        >
          {h.title}
        </h1>
        <p className="text-[var(--text-dim)] text-sm mt-2">{h.subtitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardCard href="/draft" title={h.draftTitle} desc={h.draftDesc} />
        <DashboardCard href="/setup" title={h.setupTitle} desc={h.setupDesc} />
        <DashboardCard href="/season" title={h.seasonTitle} desc={h.seasonDesc} />
        <DashboardCard href="/waivers" title={h.waiverTitle} desc={h.waiverDesc} />
        <DashboardCard href="/stats" title={h.statsTitle} desc={h.statsDesc} />
        <DashboardCard href="/roster" title={h.rosterTitle} desc={h.rosterDesc} />
        <DashboardCard href="/lineup" title={h.lineupTitle} desc={h.lineupDesc} />
        <DashboardCard href="/tippspiel" title={h.tippspielTitle} desc={h.tippspielDesc} />
        <DashboardCard href="/teams" title={h.teamsTitle} desc={h.teamsDesc} />
        <DashboardCard href="/activity" title={h.activityTitle} desc={h.activityDesc} />
        <DashboardCard href="/glossary" title={h.glossaryTitle} desc={h.glossaryDesc} />
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
