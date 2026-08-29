"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { t } = useLang();
  const l = t.login;
  const searchParams = useSearchParams();
  const hasError = searchParams.get("error") === "auth_failed";
  const [loading, setLoading] = useState<"google" | "discord" | "magic" | null>(null);
  const [email, setEmail] = useState("");
  const [magicLinkStatus, setMagicLinkStatus] = useState<"sent" | "error" | null>(null);
  const next = searchParams.get("next") || "/";

  async function signIn(provider: "google" | "discord") {
    if (!supabase) return;
    setLoading(provider);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  }

  async function sendMagicLink() {
    if (!supabase || !email.trim()) return;
    setLoading("magic");
    setMagicLinkStatus(null);
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo } });
    setMagicLinkStatus(error ? "error" : "sent");
    setLoading(null);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-[400px]">
        <h1
          className="hero-gradient-text font-black mb-2"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,5vw,36px)", letterSpacing: "-1px" }}
        >
          {l.title}
        </h1>
        <p className="text-sm text-[var(--text-dim)] mb-8">{l.subtitle}</p>

        {!supabaseConfigured ? (
          <p className="text-xs text-[var(--text-muted)] card">{l.notConfigured}</p>
        ) : (
          <>
            {hasError && <p className="text-xs text-[var(--red)] mb-4">{l.error}</p>}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => signIn("google")}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-50"
              >
                <GoogleIcon />
                {loading === "google" ? l.signingIn : l.googleButton}
              </button>
              <button
                onClick={() => signIn("discord")}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full text-sm font-semibold border disabled:opacity-50"
                style={{ borderColor: "var(--border-mid)", background: "rgba(88,101,242,0.12)", color: "#8B95F6" }}
              >
                <DiscordIcon />
                {loading === "discord" ? l.signingIn : l.discordButton}
              </button>
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: "var(--border-mid)" }} />
              <span className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">{l.orDivider}</span>
              <div className="flex-1 h-px" style={{ background: "var(--border-mid)" }} />
            </div>

            {magicLinkStatus === "sent" ? (
              <p className="text-sm text-[var(--green)]">{l.magicLinkSent}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setMagicLinkStatus(null);
                  }}
                  placeholder={l.emailPlaceholder}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-full px-4 py-3 text-sm text-[var(--text-primary)] text-center"
                />
                {magicLinkStatus === "error" && <p className="text-xs text-[var(--red)]">{l.magicLinkError}</p>}
                <button
                  onClick={sendMagicLink}
                  disabled={loading !== null || !email.trim()}
                  className="w-full px-4 py-3 rounded-full text-sm font-semibold border border-[var(--border-mid)] text-[var(--text-secondary)] disabled:opacity-50"
                >
                  {loading === "magic" ? l.sendingLink : l.sendMagicLink}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.4 27 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.9 39.7 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.4C41.8 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#8B95F6">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
