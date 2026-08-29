"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLeagueState } from "@/lib/useLeagueState";
import { PERSONAS, buildTeamsFromOrder } from "@/lib/personas";
import type { PersonalityId, DraftPick } from "@/lib/types";
import { pickNumberToRound } from "@/lib/draftEngine";

export default function SetupPage() {
  const { state, loading, save, reset, cloudSynced } = useLeagueState();
  const [order, setOrder] = useState<PersonalityId[] | null>(null);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const currentOrder = useMemo<PersonalityId[]>(() => {
    if (order) return order;
    if (!state) return PERSONAS.map((p) => p.personality);
    return [...state.teams].sort((a, b) => a.id - b.id).map((t) => t.personality);
  }, [order, state]);

  if (loading || !state) {
    return <main className="p-8 text-[var(--text-muted)]">Lade Liga-State…</main>;
  }

  const usedCount = (id: PersonalityId) => currentOrder.filter((p) => p === id).length;
  const isValid = new Set(currentOrder).size === 10;

  function setSlot(slotIdx: number, personality: PersonalityId) {
    const next = [...currentOrder];
    next[slotIdx] = personality;
    setOrder(next);
  }

  async function saveOrder() {
    if (!isValid || !state) return;
    const teams = buildTeamsFromOrder(currentOrder);
    await save({ ...state, teams });
    setSavedMsg("Draft-Reihenfolge gespeichert.");
    setTimeout(() => setSavedMsg(null), 2500);
  }

  function parseImport(): { picks: DraftPick[]; error?: string } {
    const lines = importText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const teams = buildTeamsFromOrder(currentOrder);
    const picks: DraftPick[] = [];
    for (const line of lines) {
      const match = line.match(/^(\d+)\s*[:\-]\s*(\d+)$/);
      if (!match) return { picks: [], error: `Zeile ungültig: "${line}" (erwartet z.B. "3:1")` };
      const pickNumber = Number(match[1]);
      const playerRank = Number(match[2]);
      const round = pickNumberToRound(pickNumber);
      const order10 = currentOrder; // slot order
      const teamId = (() => {
        const oi = [...order10];
        // Snake-Order für diesen Pick berechnen
        const idxInRound = (pickNumber - 1) % 10;
        const roundIsReversed = round % 2 === 0;
        const slot = roundIsReversed ? 9 - idxInRound : idxInRound;
        return teams[slot].id;
      })();
      picks.push({ pickNumber, round, teamId, playerRank });
    }
    picks.sort((a, b) => a.pickNumber - b.pickNumber);
    return { picks };
  }

  async function importDraft() {
    const { picks, error } = parseImport();
    if (error) {
      setImportMsg(error);
      return;
    }
    const teams = buildTeamsFromOrder(currentOrder);
    await save({ ...state!, teams, draftLog: picks });
    setImportMsg(`${picks.length} Picks importiert.`);
    setTimeout(() => setImportMsg(null), 3000);
  }

  async function handleReset() {
    if (!confirm("Wirklich den gesamten Draft-Stand zurücksetzen? Das kann nicht rückgängig gemacht werden.")) return;
    await reset();
  }

  return (
    <main className="mx-auto max-w-[700px] px-6 py-10">
      <Link href="/" className="text-xs text-[var(--text-dim)]">
        ← Zurück
      </Link>
      <h1 className="font-black mt-3 mb-1" style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "var(--text-primary)" }}>
        Liga-Setup
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {cloudSynced ? "Cloud-Sync aktiv — Änderungen erscheinen auf allen deinen Geräten." : "Local-Only-Modus (kein Supabase konfiguriert) — Änderungen bleiben nur auf diesem Gerät/Browser."}
      </p>

      <section className="card mb-6">
        <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-3">DRAFT-REIHENFOLGE (SLOT 1 = PICK 1)</h2>
        <div className="space-y-2">
          {currentOrder.map((personality, slotIdx) => (
            <div key={slotIdx} className="flex items-center gap-3">
              <span className="w-6 text-right text-[var(--text-dim)] text-xs">{slotIdx + 1}.</span>
              <select
                value={personality}
                onChange={(e) => setSlot(slotIdx, e.target.value as PersonalityId)}
                className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                {PERSONAS.map((p) => (
                  <option key={p.personality} value={p.personality} disabled={usedCount(p.personality) > 1 && p.personality !== personality}>
                    {p.isHuman ? `${p.name} (Du)` : `${p.name} — ${p.manager}`}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {!isValid && <p className="text-[var(--red)] text-xs mt-3">Jede Person darf nur einmal vorkommen.</p>}
        <button
          onClick={saveOrder}
          disabled={!isValid}
          className="mt-4 px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
        >
          Reihenfolge speichern
        </button>
        {savedMsg && <span className="ml-3 text-xs text-[var(--green)]">{savedMsg}</span>}
      </section>

      <section className="card mb-6">
        <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">BESTEHENDEN DRAFT IMPORTIEREN</h2>
        <p className="text-xs text-[var(--text-dim)] mb-3">
          Ein Pick pro Zeile im Format <code className="text-[var(--green)]">pick:rang</code>. Beispiel: Pick 1 war
          Bijan Robinson (Rang 1) → Zeile <code className="text-[var(--green)]">1:1</code>. Ranks siehe Draftboard.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
          placeholder={"1:1\n2:4\n3:1... "}
          className="w-full bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
        />
        <button
          onClick={importDraft}
          className="mt-3 px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border-mid)] text-[var(--text-secondary)] hover:border-[var(--gold-border)]"
        >
          Importieren (überschreibt aktuellen Draft-Log)
        </button>
        {importMsg && <p className="text-xs mt-2 text-[var(--text-muted)]">{importMsg}</p>}
      </section>

      <section className="card">
        <h2 className="text-[var(--red)] text-xs font-bold tracking-wide mb-2">GEFAHRENZONE</h2>
        <button onClick={handleReset} className="px-4 py-2 rounded-md text-sm border border-[var(--red)] text-[var(--red)]">
          Draft komplett zurücksetzen
        </button>
      </section>
    </main>
  );
}
