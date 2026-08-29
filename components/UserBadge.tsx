"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

export function UserBadge() {
  const { t } = useLang();
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured || !email) return null;

  async function signOut() {
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="fixed top-4 left-4 z-[100] flex items-center gap-2">
      <span className="text-[11px] text-[var(--text-dim)] hidden sm:inline">{email}</span>
      <button
        onClick={signOut}
        className="px-3 py-1.5 rounded-full text-[11px] font-semibold border"
        style={{ borderColor: "var(--border-mid)", background: "var(--bg-deep)", color: "var(--text-muted)" }}
      >
        {t.login.signOut}
      </button>
    </div>
  );
}
