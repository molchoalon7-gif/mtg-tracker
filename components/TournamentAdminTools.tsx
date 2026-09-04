"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { FormatPicker } from "@/components/FormatPicker";
import { supabase } from "@/lib/supabase";
import type { Tournament, TournamentMode } from "@/lib/types";

type FormState = {
  name: string;
  description: string;
  format: string;
  mode: TournamentMode;
  deadline: string;
  start: string;
  end: string;
  maxPlayers: string;
};

function localDateTime(iso: string) {
  const date = new Date(iso);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function formFromTournament(event: Tournament): FormState {
  return {
    name: event.name,
    description: event.description ?? "",
    format: event.format,
    mode: event.mode,
    deadline: localDateTime(event.registration_deadline),
    start: localDateTime(event.starts_at),
    end: localDateTime(event.ends_at),
    maxPlayers: event.max_players ? String(event.max_players) : "",
  };
}

export function TournamentAdminTools() {
  const pathname = usePathname();
  const tournamentId = useMemo(() => pathname.match(/^\/tournaments\/([^/]+)$/)?.[1] ?? null, [pathname]);
  const [event, setEvent] = useState<Tournament | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEvent(null);
    setIsAdmin(false);
    setOpen(false);
    setMessage("");
    if (!tournamentId) return;

    void (async () => {
      const db = supabase();
      const { data: auth } = await db.auth.getUser();
      const uid = auth.user?.id;
      if (!uid || cancelled) return;

      const [{ data: tournament }, { data: admin }, { data: players }] = await Promise.all([
        db.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        db.from("tournament_admins").select("user_id").eq("tournament_id", tournamentId).eq("user_id", uid).maybeSingle(),
        db.from("tournament_players").select("user_id").eq("tournament_id", tournamentId),
      ]);
      if (cancelled || !tournament) return;
      const typed = tournament as Tournament;
      const allowed = typed.created_by === uid || Boolean(admin);
      setEvent(typed);
      setIsAdmin(allowed);
      setPlayerCount(players?.length ?? 0);
      if (allowed) setForm(formFromTournament(typed));
    })();

    return () => { cancelled = true; };
  }, [tournamentId]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("sheet-open");
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("sheet-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!tournamentId || !event || !isAdmin || !form) return null;

  const registration = event.status === "registration";
  const active = event.status === "active";

  async function save() {
    if (!event || !form || !tournamentId) return;
    setMessage("");
    const name = form.name.trim();
    if (name.length < 2) return setMessage("Tournament name must be at least 2 characters.");

    const payload: Record<string, string | number | null> = {
      name,
      description: form.description.trim() || null,
    };

    if (registration) {
      const deadline = new Date(form.deadline);
      const start = new Date(form.start);
      const end = new Date(form.end);
      if ([deadline, start, end].some((date) => Number.isNaN(date.getTime()))) return setMessage("Please enter valid tournament dates.");
      if (deadline > start) return setMessage("Registration must close before the tournament starts.");
      if (start >= end) return setMessage("Tournament end must be after its start.");
      const max = form.maxPlayers ? Number(form.maxPlayers) : null;
      if (max !== null && (!Number.isInteger(max) || max < 2 || max > 256)) return setMessage("Maximum players must be between 2 and 256.");
      if (max !== null && max < playerCount) return setMessage(`There are already ${playerCount} registered players, so the limit cannot be lower than that.`);
      Object.assign(payload, {
        format: form.format,
        mode: form.mode,
        registration_deadline: deadline.toISOString(),
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        max_players: max,
      });
    } else if (active) {
      const end = new Date(form.end);
      if (Number.isNaN(end.getTime())) return setMessage("Please enter a valid tournament end date.");
      if (end <= new Date(event.starts_at)) return setMessage("Tournament end must be after its start.");
      payload.ends_at = end.toISOString();
    }

    setBusy(true);
    const { error } = await supabase().from("tournaments").update(payload).eq("id", tournamentId);
    setBusy(false);
    if (error) return setMessage(error.message);
    setOpen(false);
    window.location.reload();
  }

  return <>
    <div className="tournament-admin-edit-dock">
      <button className="secondary" type="button" onClick={() => { setForm(formFromTournament(event)); setMessage(""); setOpen(true); }}>Edit tournament</button>
    </div>
    {open ? <div className="sheet-backdrop" role="presentation" onMouseDown={(e) => e.currentTarget === e.target && setOpen(false)}>
      <section className="sheet tournament-edit-sheet" role="dialog" aria-modal="true" aria-label="Edit tournament">
        <div className="sheet-head"><div><p className="eyebrow">Admin controls</p><h2>Edit tournament</h2></div><button className="sheet-close" type="button" onClick={() => setOpen(false)}>×</button></div>
        <div className="form">
          <label>Tournament name<input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
          <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional rules or event notes"/></label>
          {registration ? <>
            <div className="form-row"><label>Format<FormatPicker value={form.format} onChange={(format) => setForm({ ...form, format })}/></label><label>Mode<select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as TournamentMode })}><option value="async">Asynchronous league</option><option value="scheduled">Scheduled event</option></select></label></div>
            <div className="form-row"><label>Registration deadline<input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}/></label><label>Tournament starts<input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}/></label></div>
            <div className="form-row"><label>Tournament ends<input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}/></label><label>Maximum players <span className="hint">optional</span><input type="number" min="2" max="256" value={form.maxPlayers} onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })} placeholder="No limit"/></label></div>
            <div className="privacy-note"><strong>Before pairings:</strong> admins can edit all tournament setup details. The player limit cannot be reduced below the number already registered.</div>
          </> : active ? <>
            <label>Tournament ends<input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}/></label>
            <div className="privacy-note"><strong>Pairings already exist.</strong> Format, mode, start time, registration deadline and player limit are locked so edits cannot invalidate the tournament. Name, description and end time remain editable.</div>
          </> : <div className="privacy-note"><strong>This tournament is {event.status}.</strong> Only its name and description can be corrected.</div>}
          {message ? <div className="message error">{message}</div> : null}
          <div className="actions"><button className="primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save changes"}</button><button className="secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div>
        </div>
      </section>
    </div> : null}
  </>;
}
