import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://omeituwuxwfqkjyranpu.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_AaLHXBYlas3Imk8cNL1qRQ_xFLmwFNU";
let client: SupabaseClient | null = null;

export function supabase() {
  if (!client) client = createSupabaseClient(url, key);
  return client;
}

export async function ensureProfile(user: User) {
  const db = supabase();
  const { data } = await db.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  if (data) return;
  const fallback = String(user.user_metadata?.display_name || user.email?.split("@")[0] || "Player").slice(0, 32);
  await db.from("profiles").insert({ user_id: user.id, display_name: fallback.length >= 2 ? fallback : "Player" });
}
