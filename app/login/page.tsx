"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage(error.message);
    window.location.href = "/matches";
  }

  async function signup() {
    setLoading(true);
    setMessage("");
    const redirectTo = `${window.location.origin}/login`;
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) return setMessage(error.message);
    if (data.session) {
      window.location.href = "/matches";
    } else {
      setMessage("Account created. Check your email to confirm your address, then sign in.");
    }
  }

  return (
    <section className="auth-shell">
      <div className="panel auth-card">
        <p className="eyebrow">Your MTG record</p>
        <h1>Sign in</h1>
        <p className="muted">Your decks and match history are private to your account.</p>
        <form className="form-grid" onSubmit={login}>
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="primary" type="submit" disabled={loading}>{loading ? "Working…" : "Sign in"}</button>
          <button className="secondary" type="button" disabled={loading} onClick={signup}>Create account</button>
          {message ? <p className="form-message" role="status">{message}</p> : null}
        </form>
      </div>
    </section>
  );
}
