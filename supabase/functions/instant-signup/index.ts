import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const body = await req.json();
    const displayName = String(body.display_name ?? "").trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").replace(/\D/g, "");
    const password = String(body.password ?? "");
    const acceptedTerms = body.accepted_terms === true;

    if (displayName.length < 2 || displayName.length > 32) return json({ error: "Display name must be 2–32 characters." }, 400);
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return json({ error: "Username must be 3–24 characters using lowercase letters, numbers or _." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!/^05\d{8}$/.test(phone)) return json({ error: "Phone number must be a 10-digit Israeli mobile number starting with 05." }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
    if (!acceptedTerms) return json({ error: "You must accept the Terms of Service and Privacy Notice." }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Signup service is not configured." }, 500);

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown").split(",")[0].trim();
    const ipHash = await sha256(ip || "unknown");
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("signup_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
    if ((count ?? 0) >= 30) return json({ error: "Too many signup attempts from this network. Try again later." }, 429);
    await admin.from("signup_attempts").insert({ ip_hash: ipHash });

    const { data: existingUsername } = await admin.from("profiles").select("user_id").eq("username", username).maybeSingle();
    if (existingUsername) return json({ error: "That username is already taken." }, 409);

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, username, phone },
    });

    if (error || !data.user) {
      const message = error?.message?.toLowerCase().includes("already")
        ? "An account with that email already exists."
        : error?.message || "Could not create account.";
      return json({ error: message }, 400);
    }

    const { error: legalError } = await admin.from("legal_acceptances").insert({
      user_id: data.user.id,
      terms_version: "2026-09-04",
    });

    if (legalError && legalError.code !== "23505") {
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: "Could not finish creating the account. Please try again." }, 500);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Could not create account." }, 500);
  }
});
