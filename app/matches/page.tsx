"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapMatch } from "@/lib/data";
import type { MatchRow } from "@/lib/data";
import type { Match, MatchResult } from "@/lib/types";
import { getMatchStats } from "@/lib/stats";

type DeckOption = { id: string; name: string; format: string };

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [deckId, setDeckId] = useState("");
  const [opponentDeck, setOpponentDeck] = useState("");
  const [format, setFormat] = useState("Standard");
  const [result, setResult] = useState<MatchResult>("W");
  const [score, setScore] = useState("2-1");
  const [playDraw, setPlayDraw] = useState<"play" | "draw">("play");
  const [round, setRound] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const stats = useMemo(() => getMatchStats(matches), [matches]);

  useEffect(() => { void load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    const [matchResult, deckResult] = await Promise.all([
      supabase.from("matches").select("id,played_at,format,deck_id,opponent_deck,result,games_won,games_lost,games_drawn,play_draw,round,notes,decks(name),tournaments(name)").order("played_at", { ascending: false }).limit(200),
      supabase.from("decks").select("id,name,format").order("created_at", { ascending: false }),
    ]);
    const loadedDecks = (deckResult.data ?? []) as DeckOption[];
    setDecks(loadedDecks);
    if (!deckId && loadedDecks[0]) {
      setDeckId(loadedDecks[0].id);
      setFormat(loadedDecks[0].format);
    }
    const loadedMatches = (matchResult.data ?? []) as MatchRow[];
    setMatches(loadedMatches.map(mapMatch));
  }

  function chooseDeck(id: string) {
    setDeckId(id);
    const selected = decks.find((deck) => deck.id === id);
    if (selected) setFormat(selected.format);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!deckId || !opponentDeck.trim()) return;
    const [gamesWon = 0, gamesLost = 0, gamesDrawn = 0] = score.split("-").map((value) => Math.max(0, Number.parseInt(value, 10) || 0));
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      setSignedIn(false);
      return;
    }
    const { error } = await supabase.from("matches").insert({
      user_id: userData.user.id,
      deck_id: deckId,
      format,
      opponent_deck: opponentDeck.trim(),
      result,
      games_won: gamesWon,
      games_lost: gamesLost,
      games_drawn: gamesDrawn,
      play_draw: playDraw,
      round: round.trim() || null,
      notes: notes.trim() || null,
      played_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return setMessage(error.message);
    setOpponentDeck("");
    setRound("");
    setNotes("");
    setMessage("Match saved.");
    await load();
  }

  if (signedIn === false) {
    return <Gate title="Sign in to track matches" text="Match history is private to your account." />;
  }

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Match log</p><h1>Your games</h1></div><p className="muted">{stats.winRate}% win rate across {stats.total} matches</p></div>
      <div className="two-col matches-layout">
        <form className="panel form-grid" onSubmit={submit}>
          <h2>Log match</h2>
          {decks.length ? (
            <label>Your deck<select value={deckId} onChange={(e) => chooseDeck(e.target.value)}>{decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name} · {deck.format}</option>)}</select></label>
          ) : <div className="callout">Create a deck before logging a match. <Link href="/decks">Create deck →</Link></div>}
          <label>Opponent deck<input value={opponentDeck} onChange={(e) => setOpponentDeck(e.target.value)} placeholder="e.g. Mono Red" required /></label>
          <div className="field-pair">
            <label>Result<select value={result} onChange={(e) => setResult(e.target.value as MatchResult)}><option value="W">Win</option><option value="L">Loss</option><option value="D">Draw</option></select></label>
            <label>Score<input value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric" placeholder="2-1" /></label>
          </div>
          <div className="field-pair">
            <label>Play / draw<select value={playDraw} onChange={(e) => setPlayDraw(e.target.value as "play" | "draw")}><option value="play">On the play</option><option value="draw">On the draw</option></select></label>
            <label>Round<input value={round} onChange={(e) => setRound(e.target.value)} placeholder="R3" /></label>
          </div>
          <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sideboard notes, key decisions…" /></label>
          <button className="primary" type="submit" disabled={saving || !decks.length}>{saving ? "Saving…" : "Add match"}</button>
          {message ? <small className="form-message" role="status">{message}</small> : null}
        </form>
        <section className="panel">
          <div className="section-head"><h2>History</h2><span>{matches.length} matches</span></div>
          {matches.length === 0 ? <div className="empty-state"><strong>No games logged yet</strong><span>Your first match will appear here.</span></div> : null}
          <div className="list">
            {matches.map((match) => <article className="match-row match-row-detail" key={match.id}><span className={`result result-${match.result.toLowerCase()}`}>{match.result}</span><div><strong>{match.deck}</strong><small>vs {match.opponentDeck} · {match.format}{match.playDraw ? ` · ${match.playDraw === "play" ? "play" : "draw"}` : ""}</small></div><b>{match.score}</b></article>)}
          </div>
        </section>
      </div>
    </>
  );
}

function Gate({ title, text }: { title: string; text: string }) {
  return <section className="panel gate"><p className="eyebrow">Private tracker</p><h1>{title}</h1><p className="muted">{text}</p><Link className="primary" href="/login">Sign in</Link></section>;
}
