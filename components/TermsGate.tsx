"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { ensureProfile, supabase } from "@/lib/supabase";

const openPaths = new Set(["/login", "/terms", "/privacy"]);

export function TermsGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [accepted, setAccepted] = useState<boolean | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function check(currentUser?: User | null) {
    const db = supabase();
    const resolved = currentUser === undefined ? (await db.auth.getUser()).data.user : currentUser;
    setUser(resolved ?? null);
    if (!resolved) { setAccepted(true); return; }
    await ensureProfile(resolved);
    const { data } = await db.from("legal_acceptances").select("terms_version").eq("user_id", resolved.id).eq("terms_version", CURRENT_TERMS_VERSION).maybeSingle();
    setAccepted(Boolean(data));
  }

  useEffect(() => {
    void check();
    const { data } = supabase().auth.onAuthStateChange((_event, session) => { void check(session?.user ?? null); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function accept() {
    if (!user) return;
    setBusy(true); setMessage("");
    const { error } = await supabase().from("legal_acceptances").insert({ user_id: user.id, terms_version: CURRENT_TERMS_VERSION });
    setBusy(false);
    if (error && error.code !== "23505") { setMessage(error.message); return; }
    setAccepted(true);
  }

  const needsGate = user && accepted === false && !openPaths.has(pathname);
  return <>
    {children}
    {needsGate ? <div className="terms-gate-backdrop">
      <section className="terms-gate" role="dialog" aria-modal="true" aria-labelledby="terms-title">
        <p className="eyebrow">Before you continue</p>
        <h2 id="terms-title">Community tournament terms</h2>
        <p className="muted">ManaPair is a non-commercial coordination and record-keeping tool. It does not run your tournament, handle prizes or payments, supervise matches, or take responsibility for conduct or agreements outside the service.</p>
        <p className="muted">For matchup coordination, your registered email can be shown only to the opponent you are currently paired against in an active tournament.</p>
        <div className="terms-gate-links"><Link href="/terms">Read Terms of Service</Link><Link href="/privacy">Read Privacy Notice</Link></div>
        {message ? <div className="message error">{message}</div> : null}
        <button className="primary" disabled={busy} onClick={() => void accept()}>{busy ? "Saving…" : "I agree and continue"}</button>
      </section>
    </div> : null}
  </>;
}
