"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Deck } from "@/lib/types";

type DeckRow = { id: string; name: string; format: string };
type ResultRow = { deck_id: string | null; result: "W" | "L" | "D" };

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [format, setFormat] = useState("Standard");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setSignedIn(false);
    setSignedIn(true);
    const [deckResult, matchResult] = await Promise.all([
      supabase.from("decks").select("id,name,format").order("created_at", { ascending: false }),
      supabase.from("matches").select("deck_id,result"),
    ]);
    const results = (matchResult.data ?? []) as ResultRow[];
    setDecks(((deckResult.data ?? []) as DeckRow[]).map((deck) => {
      const rows = results.filter((match) => match.deck_id === deck.id);
      return {
        ...deck,
        matches: rows.length,
        wins: rows.filter((row) => row.result === "W").length,
        losses: rows.filter((row) => row.result === "L").length,
        draws: rows.filter((row) => row.result === "D").length,
      };
    }));
  }

  async function addDeck(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setSignedIn(false);
    const { error } = await supabase.from("decks").insert({ user_id: userData.user.id, name: name.trim(), format });
    setSaving(false);
    if (error) return setMessage(error.message);
    setName("");
    setMessage("Deck created.");
    await load();
  }

  if (signedIn === false) return <section className="panel gate"><p className="eyebrow">Private tracker</p><h1>Sign in to manage decks</h1><p className="muted">Deck records and performance belong to your account.</p><Link className="primary" href="/login">Sign in</Link></section>;

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Deck performance</p><h1>Your decks</h1></div></div>
      <form className="panel inline-form" onSubmit={addDeck}>
        <label>Deck name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Azorius Control" /></label>
        <label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}><option>Standard</option><option>Pioneer</option><option>Modern</option><option>Legacy</option><option>Vintage</option><option>Pauper</option><option>Premodern</option><option>Commander</option></select></label>
        <button className="primary" type="submit" disabled={saving}>{saving ? "Adding…" : "Add deck"}</button>
        {message ? <span className="form-message" role="status">{message}</span> : null}
      </form>
      <section className="deck-grid">
        {decks.map((deck) => {
          const decided = deck.wins + deck.losses;
          const wr = decided ? Math.round((deck.wins / decided) * 100) : 0;
          return <article className="panel deck-card" key={deck.id}><span className="pill">{deck.format}</span><h2>{deck.name}</h2><strong>{wr}%</strong><small>{deck.wins} wins · {deck.losses} losses · {deck.draws} draws · {deck.matches} matches</small><div className="bar"><i style={{ width: `${wr}%` }} /></div></article>;
        })}
        {signedIn && decks.length === 0 ? <article className="panel empty-deck"><strong>No decks yet</strong><span>Create your first deck above, then log matches against it.</span></article> : null}
      </section>
    </>
  );
}
