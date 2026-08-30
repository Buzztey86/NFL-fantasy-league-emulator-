"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { useLeagueState } from "@/lib/useLeagueState";
import { getAllRosteredRanks, getCurrentRoster, type Transaction } from "@/lib/roster";
import { getAvailablePlayers, getPlayerByRank } from "@/lib/players";
import { generateAIWaiverClaims, resolveWaivers, type WaiverClaim } from "@/lib/waiver";
import { evaluateTradeForAI, suggestCounterOffer, type TradeOffer } from "@/lib/trade";
import type { Player } from "@/lib/types";
import { useLang } from "@/lib/i18n/LanguageContext";
import { Tooltip } from "@/components/Tooltip";
import { HoverRadar } from "@/components/HoverRadar";
import { PlayerThumb } from "@/components/PlayerThumb";
import { useToast } from "@/components/ToastProvider";
import { RADAR_AXES, RADAR_AXIS_TIPS } from "@/lib/radarAxes";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { withMemberOwnership, resolveMyTeamId } from "@/lib/league/resolveTeams";

const POS_COLOR: Record<string, string> = {
  QB: "var(--blue)",
  RB: "var(--green)",
  WR: "var(--gold)",
  TE: "var(--purple)",
  DST: "var(--red)",
  K: "var(--text-muted)",
};
const POS_COLOR_HEX: Record<string, string> = {
  QB: "#3B82F6",
  RB: "#10B981",
  WR: "#F59E0B",
  TE: "#8B5CF6",
  DST: "#EF4444",
  K: "#9CA3AF",
};

export default function WaiversPage() {
  const { activeLeagueId, activeMembership, loading: leagueCtxLoading, loadError } = useLeagueContext();
  const { state, members, loading, save, cloudSynced } = useLeagueState(activeLeagueId);
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const w = t.waivers;
  const c = t.common;
  const [tab, setTab] = useState<"waiver" | "trade">("waiver");
  const [week, setWeek] = useState(1);
  const [search, setSearch] = useState("");
  const [pendingClaims, setPendingClaims] = useState<WaiverClaim[]>([]);
  const [bidFor, setBidFor] = useState<Player | null>(null);
  const [bidAmount, setBidAmount] = useState(5);
  const [dropRank, setDropRank] = useState<number | "none">("none");

  const [tradePartnerId, setTradePartnerId] = useState<number | null>(null);
  const [myOffer, setMyOffer] = useState<Set<number>>(new Set());
  const [theirOffer, setTheirOffer] = useState<Set<number>>(new Set());
  const [tradeResult, setTradeResult] = useState<string | null>(null);
  const [counterOffer, setCounterOffer] = useState<Player | null>(null);
  const [tradeLog, setTradeLog] = useState<TradeOffer[]>([]);

  if (loadError) {
    return <main className="p-8 text-[var(--red)] text-sm">{loadError}</main>;
  }
  if (leagueCtxLoading || loading || !state) {
    return <main className="p-8 text-[var(--text-muted)]">{c.loadingLeague}</main>;
  }

  const { draftLog, transactions, faab } = state;
  const teams = withMemberOwnership(state.teams, members);
  const myTeamId = resolveMyTeamId(activeMembership, teams, cloudSynced);
  const humanTeam = teams.find((t) => t.id === myTeamId)!;
  const myRoster = getCurrentRoster(humanTeam.id, draftLog, transactions);
  const rostered = getAllRosteredRanks(
    teams.map((t) => t.id),
    draftLog,
    transactions
  );
  const freeAgents = getAvailablePlayers(rostered).filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  function submitMyClaim() {
    if (!bidFor) return;
    const claim: WaiverClaim = {
      id: crypto.randomUUID(),
      teamId: humanTeam.id,
      addPlayerRank: bidFor.rank,
      dropPlayerRank: dropRank === "none" ? null : dropRank,
      bidAmount: Math.max(1, Math.min(faab[humanTeam.id] ?? 0, bidAmount)),
      week,
    };
    setPendingClaims((prev) => [...prev.filter((c) => c.addPlayerRank !== bidFor.rank), claim]);
    setBidFor(null);
  }

  async function runWaiverRound() {
    const aiClaims = generateAIWaiverClaims(teams, draftLog, transactions, faab, week);
    const allClaims = [...pendingClaims, ...aiClaims];
    if (allClaims.length === 0) {
      showToast(w.noClaims, "info");
      return;
    }
    const wins: Record<number, number> = {};
    const { transactions: newTx, faabSpent, winningClaimIds } = resolveWaivers(allClaims, wins);

    const newFaab = { ...faab };
    for (const [teamIdStr, spent] of Object.entries(faabSpent)) {
      const teamId = Number(teamIdStr);
      newFaab[teamId] = Math.max(0, (newFaab[teamId] ?? 0) - spent);
    }

    await save({ ...state!, transactions: [...transactions, ...newTx], faab: newFaab });
    const wonCount = allClaims.filter((c) => winningClaimIds.has(c.id) && c.teamId === humanTeam.id).length;
    showToast(`${w.roundDone}: ${newTx.length} ${w.claimsAwarded} (${wonCount} ${w.ofThoseToYou}).`);
    setPendingClaims([]);
  }

  function toggleSet(set: Set<number>, setSet: (s: Set<number>) => void, rank: number) {
    const next = new Set(set);
    if (next.has(rank)) next.delete(rank);
    else next.add(rank);
    setSet(next);
  }

  async function sendTradeOffer() {
    if (!tradePartnerId) return;
    const partner = teams.find((t) => t.id === tradePartnerId)!;
    const partnerRoster = getCurrentRoster(partner.id, draftLog, transactions);
    const aiGets = myRoster.filter((p) => myOffer.has(p.rank));
    const aiLoses = partnerRoster.filter((p) => theirOffer.has(p.rank));

    const evalResult = evaluateTradeForAI(partner, aiGets, aiLoses, lang);
    const offer: TradeOffer = {
      id: crypto.randomUUID(),
      week,
      createdAt: new Date().toISOString(),
      proposerTeamId: humanTeam.id,
      receiverTeamId: partner.id,
      proposerGives: [...myOffer],
      proposerGets: [...theirOffer],
      status: evalResult.accept ? "accepted" : "rejected",
      aiReason: evalResult.reason,
    };
    setTradeLog((prev) => [offer, ...prev]);
    setTradeResult(`${partner.manager}: ${evalResult.accept ? w.accepted : w.rejected} — "${evalResult.reason}"`);
    setCounterOffer(null);

    if (!evalResult.accept) {
      const remainingMine = myRoster.filter((p) => !myOffer.has(p.rank));
      const suggestion = suggestCounterOffer(partner, aiGets, aiLoses, remainingMine, lang);
      if (suggestion) setCounterOffer(suggestion);
    }

    if (evalResult.accept) {
      const tx: Transaction = {
        id: crypto.randomUUID(),
        type: "trade",
        week,
        timestamp: new Date().toISOString(),
        teamAId: humanTeam.id,
        teamBId: partner.id,
        teamAGives: [...myOffer],
        teamBGives: [...theirOffer],
      };
      await save({ ...state!, transactions: [...transactions, tx] });
      setMyOffer(new Set());
      setTheirOffer(new Set());
    }
  }

  function acceptCounterOffer() {
    if (!counterOffer) return;
    setMyOffer((prev) => new Set([...prev, counterOffer.rank]));
    setCounterOffer(null);
    setTradeResult(null);
  }

  const partnerTeams = teams.filter((t) => !t.isHuman);
  const partnerRoster = tradePartnerId != null ? getCurrentRoster(tradePartnerId, draftLog, transactions) : [];

  return (
    <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-dim)]">
          {c.backToLeague}
        </Link>
        <span className="text-xs text-[var(--text-dim)]">{cloudSynced ? c.cloudSyncActive : c.localOnlyModeShort}</span>
      </div>

      <header className="text-center mb-6">
        <div className="eyebrow">
          <Tooltip text={t.tooltips.faab}>FAAB</Tooltip> $100 · {lang === "de" ? "Woche" : "Week"} {week}
        </div>
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          {w.heading}
        </h1>
      </header>

      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => setTab("waiver")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "waiver" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          {w.waiverTab}
        </button>
        <button
          onClick={() => setTab("trade")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "trade" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          {w.tradeTab}
        </button>
      </div>

      <div className="card mb-4">
        <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{w.faabBudgets}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {teams.map((t) => (
            <div key={t.id} className="flex justify-between">
              <span style={{ color: t.color }}>{t.name}</span>
              <span className="text-[var(--text-secondary)] tabular-nums">${faab[t.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {tab === "waiver" && (
        <>
          <div className="card mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={w.searchFreeAgent}
              className="w-full mb-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
            />
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {freeAgents.slice(0, 40).map((p) => (
                <div key={p.rank} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border-inner)] gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <PlayerThumb photo={p.photo} size={26} />
                    <span className="text-[11px] font-bold" style={{ color: POS_COLOR[p.pos] }}>
                      {p.pos}
                    </span>
                    <HoverRadar
                      axes={RADAR_AXES[p.pos][lang]}
                      values={p.radar}
                      tips={RADAR_AXIS_TIPS[p.pos][lang]}
                      color={POS_COLOR_HEX[p.pos]}
                      photo={p.photo}
                      name={p.name}
                    >
                      <span className="border-b border-dotted border-[var(--text-dim)] cursor-help">{p.name}</span>
                    </HoverRadar>
                    <span className="text-[var(--text-dim)] text-[12px]">#{p.rank}</span>
                  </span>
                  <button onClick={() => setBidFor(p)} className="shrink-0 text-xs px-2 py-1 rounded border border-[var(--gold-border)] text-[var(--gold)]">
                    {w.bid}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {bidFor && (
            <div className="card mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                {w.bidForTitle} {bidFor.name}
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <label className="text-xs text-[var(--text-dim)]">{w.faabLabel}</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  min={1}
                  max={faab[humanTeam.id] ?? 0}
                  className="w-24 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-2 py-1 text-sm"
                />
                <span className="text-xs text-[var(--text-dim)]">
                  {w.ofBudget} ${faab[humanTeam.id] ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <label className="text-xs text-[var(--text-dim)]">{w.dropOptional}</label>
                <select
                  value={dropRank}
                  onChange={(e) => setDropRank(e.target.value === "none" ? "none" : Number(e.target.value))}
                  className="bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-2 py-1 text-xs"
                >
                  <option value="none">{w.noone}</option>
                  {myRoster.map((p) => (
                    <option key={p.rank} value={p.rank}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={submitMyClaim} className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)]">
                {w.submitClaim}
              </button>
            </div>
          )}

          {pendingClaims.length > 0 && (
            <div className="card mb-4">
              <h3 className="text-xs text-[var(--gold)] font-bold mb-2">{w.yourOpenClaims}</h3>
              {pendingClaims.map((c) => (
                <div key={c.id} className="text-xs flex justify-between py-1">
                  <span>{getPlayerByRank(c.addPlayerRank).name}</span>
                  <span className="text-[var(--text-dim)]">${c.bidAmount}</span>
                </div>
              ))}
            </div>
          )}

          <div className="text-center">
            <button onClick={runWaiverRound} className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] transition-colors">
              {w.runWaiverRound}
            </button>
          </div>
        </>
      )}

      {tab === "trade" && (
        <>
          <div className="card mb-4">
            <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{w.tradePartner}</h2>
            <div className="flex flex-wrap gap-2">
              {partnerTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTradePartnerId(t.id);
                    setMyOffer(new Set());
                    setTheirOffer(new Set());
                    setTradeResult(null);
                    setCounterOffer(null);
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border"
                  style={tradePartnerId === t.id ? { borderColor: t.color, background: "rgba(255,255,255,0.06)", color: t.color } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {tradePartnerId != null && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="card">
                <h3 className="text-xs text-[var(--gold)] font-bold mb-2">{w.youGiveUp}</h3>
                {myRoster.length === 0 && <p className="text-xs text-[var(--text-dim)]">{w.noRosterYet}</p>}
                {myRoster.map((p) => (
                  <label key={p.rank} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                    <input type="checkbox" checked={myOffer.has(p.rank)} onChange={() => toggleSet(myOffer, setMyOffer, p.rank)} />
                    <span style={{ color: POS_COLOR[p.pos] }}>{p.pos}</span> {p.name}
                  </label>
                ))}
              </div>
              <div className="card">
                <h3 className="text-xs text-[var(--gold)] font-bold mb-2">{w.youGet}</h3>
                {partnerRoster.length === 0 && <p className="text-xs text-[var(--text-dim)]">{w.noRosterYet}</p>}
                {partnerRoster.map((p) => (
                  <label key={p.rank} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                    <input type="checkbox" checked={theirOffer.has(p.rank)} onChange={() => toggleSet(theirOffer, setTheirOffer, p.rank)} />
                    <span style={{ color: POS_COLOR[p.pos] }}>{p.pos}</span> {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {tradePartnerId != null && (
            <div className="text-center mb-4">
              <button
                onClick={sendTradeOffer}
                disabled={myOffer.size === 0 || theirOffer.size === 0}
                className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
              >
                {w.sendOffer}
              </button>
              {tradeResult && <p className="text-xs text-[var(--text-secondary)] mt-2 prose-serif">{tradeResult}</p>}
              {counterOffer && (
                <div className="card mt-3 text-left">
                  <p className="text-xs text-[var(--purple)] mb-2">
                    {w.counterOfferIntro} <span className="text-[var(--text-primary)] font-semibold">{counterOffer.name}</span>
                  </p>
                  <button
                    onClick={acceptCounterOffer}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)]"
                  >
                    {w.acceptCounter}
                  </button>
                </div>
              )}
            </div>
          )}

          {tradeLog.length > 0 && (
            <div className="card">
              <h3 className="text-xs text-[var(--gold)] font-bold mb-2">{w.tradeHistory}</h3>
              {tradeLog.map((t) => {
                const partner = teams.find((x) => x.id === t.receiverTeamId);
                return (
                  <div key={t.id} className="flex items-start gap-1.5 text-xs py-1 border-b border-[var(--border-inner)]">
                    {t.status === "accepted" ? (
                      <CheckCircle2 size={13} className="text-[var(--green)] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={13} className="text-[var(--red)] shrink-0 mt-0.5" />
                    )}
                    <span>
                      vs <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: partner?.color }} />
                      {partner?.name} —{" "}
                      {t.proposerGives.map((r) => getPlayerByRank(r).name).join(", ")} ⇄ {t.proposerGets.map((r) => getPlayerByRank(r).name).join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
