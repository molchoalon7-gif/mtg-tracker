"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ensureProfile, supabase } from "@/lib/supabase";

export function AccountMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const db = supabase();
    void db.auth.getUser().then(async ({ data }) => {
      if (data.user) await ensureProfile(data.user);
      setUser(data.user ?? null); setReady(true);
    });
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null); setReady(true);
      if (session?.user) void ensureProfile(session.user);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return <span className="nav-fade">•••</span>;
  if (!user) return <Link className="nav-strong" href="/login">Sign in</Link>;
  return <button className="nav-button" type="button" onClick={async () => { await supabase().auth.signOut(); location.href = "/"; }}>Sign out</button>;
}
