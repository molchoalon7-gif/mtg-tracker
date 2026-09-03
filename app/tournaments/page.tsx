"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapTournament } from "@/lib/data";
import type { TournamentRow } from "@/lib/data";
import type { Tournament } from "@/lib/types";

export default function TournamentsPage() {
  const [events, setEvents] = useState<Tournament[]>([]);
  const [format, setFormat] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();
      const result = await supabase
        .from("tournaments")
        .select("id,name,format,platform,starts_at,player_count,source,registration_url,source_url")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at");

      if (!active) return;
      const rows = (result.data ?? []) as TournamentRow[];
      setEvents(rows.map(mapTournament));
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, []);

  const formats = useMemo(() => ["All", ...Array.from(new Set(events.map((event) => event.format)))], [events]);
  const filtered = format === "All" ? events : events.filter((event) => event.format === format);

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Event calendar</p><h1>Online tournaments</h1></div><p className="muted">Official events are stored with their source so schedules can be verified.</p></div>
      <div className="filter-row" aria-label="Tournament filters">{formats.map((item) => <button key={item} type="button" className={item === format ? "filter active" : "filter"} onClick={() => setFormat(item)}>{item}</button>)}</div>
      <section className="panel table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Platform</th><th>Format</th><th>Starts</th><th>Source</th></tr></thead>
          <tbody>{filtered.map((event) => <tr key={event.id}><td><strong>{event.registrationUrl ? <a className="table-link" href={event.registrationUrl} target="_blank" rel="noreferrer">{event.name}</a> : event.name}</strong></td><td>{event.platform}</td><td><span className="pill">{event.format}</span></td><td>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.startsAt))}</td><td>{event.sourceUrl ? <a className="source-link" href={event.sourceUrl} target="_blank" rel="noreferrer">{event.source ?? "Source"} ↗</a> : event.source ?? "—"}</td></tr>)}</tbody>
        </table>
        {!loading && filtered.length === 0 ? <div className="empty-state table-empty"><strong>No upcoming events in this filter</strong><span>Try another format.</span></div> : null}
      </section>
    </>
  );
}
