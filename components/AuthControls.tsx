"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function AuthControls() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((result: { data: { user: User | null } }) => {
      setUser(result.data.user ?? null);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  if (!ready) return <span className="auth-placeholder" aria-hidden="true" />;
  if (!user) return <Link className="nav-login" href="/login">Sign in</Link>;

  return (
    <button type="button" className="nav-login nav-button" onClick={signOut}>
      Sign out
    </button>
  );
}
