"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { createClient } from "@/lib/supabase/client";
import { mapMatch, mapTournament } from "@/lib/data";
import { getMatchStats } from "@/lib/stats";
import type { Match, Tournament } from "@/lib/types";

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [deckCount, setDeckCount] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const [{ data: userData }, tournamentResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("tournaments").select("id,name,format,platform,starts_at,player_count,source,registration_url,source_url").gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
      ]);
      if (!active) return;
      setTournaments((tournamentResult.data ?? []).map((row) => mapTournament(row as never)));

      const user = userData.user;
      setSignedIn(Boolean(user));
      if (user) {
        const [matchResult, deckResult] = await Promise.all([
          supabase.from("matches").select("id,played_at,format,deck_id,opponent_deck,result,games_won,games_lost,games_drawn,play_draw,round,notes,decks(name),tournaments(name)").order("played_at", { ascending: false }).limit(6),
          supabase.from("decks").select("id", { count: "exact", head: true }),
        ]);
        if (!active) return;
        setMatches((matchResult.data ?? []).map((row) => mapMatch(row as never)));
        setDeckCount(deckResult.count ?? 0);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => getMatchStats(matches), [matches]);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Magic: The Gathering performance tracker</p>
          <h1>Track the games. Find the edge.</h1>
          <p className="muted">Log matches, measure deck performance, study matchups, and keep upcoming online tournaments in one place.</p>
        </div>
        <Link className="primary" href={signedIn ? "/matches" : "/login"}>{signedIn ? "Log a match" : "Start tracking"}</Link>
      </section>

      <section className="stats-grid">
        <StatCard label="Matches" value={loading ? "—" : stats.total} />
        <StatCard label="Win rate" value={loading ? "—" : `${stats.winRate}%`} hint={signedIn ? `${stats.wins}-${stats.losses}-${stats.draws}` : "Sign in to track"} />
        <StatCard label="Your decks" value={loading ? "—" : deckCount} />
        <StatCard label="Upcoming events" value={loading ? "—" : tournaments.length} />
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="section-head"><h2>Recent matches</h2><Link href="/matches">View all</Link></div>
          {!signedIn && !loading ? <Empty title="Your match history starts here" text="Sign in, create a deck, and your results will appear on this dashboard." action="Sign in" href="/login" /> : null}
          {signedIn && !loading && matches.length === 0 ? <Empty title="No matches yet" text="Log your first match to start building matchup and win-rate data." action="Log match" href="/matches" /> : null}
          <div className="list">
            {matches.slice(0, 4).map((match) => (
              <article className="match-row" key={match.id}>
                <span className={`result result-${match.result.toLowerCase()}`}>{match.result}</span>
                <div><strong>{match.deck}</strong><small>vs {match.opponentDeck} · {match.format}</small></div>
                <b>{match.score}</b>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-head"><h2>Upcoming tournaments</h2><Link href="/tournaments">View all</Link></div>
          {!loading && tournaments.length === 0 ? <Empty title="No upcoming events" text="The tournament feed is ready for the next imported event." action="Open calendar" href="/tournaments" /> : null}
          <div className="list">
            {tournaments.slice(0, 4).map((event) => (
              <article className="event-row" key={event.id}>
                <div><strong>{event.name}</strong><small>{event.platform} · {event.format}</small></div>
                <time>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(event.startsAt))}</time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Empty({ title, text, action, href }: { title: string; text: string; action: string; href: string }) {
  return <div className="empty-state"><strong>{title}</strong><span>{text}</span><Link href={href}>{action} →</Link></div>;
}
