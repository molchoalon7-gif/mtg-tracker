import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://omeituwuxwfqkjyranpu.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_AaLHXBYlas3Imk8cNL1qRQ_xFLmwFNU";
let client: SupabaseClient | null = null;

export function supabase() {
  if (!client) client = createSupabaseClient(url, key);
  return client;
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

export function validUsername(value: string) {
  return /^[a-z0-9_]{3,24}$/.test(value);
}

export function isGeneratedUsername(value: string) {
  return /^player_[a-f0-9]{8}$/i.test(value);
}

export function normalizeIsraeliPhone(value: string) {
  return value.replace(/[^0-9]/g, "").slice(0, 10);
}

export function validIsraeliMobilePhone(value: string) {
  return /^05[0-9]{8}$/.test(normalizeIsraeliPhone(value));
}

export async function ensureProfile(user: User) {
  const db = supabase();
  const { data } = await db.from("profiles").select("user_id,username").eq("user_id", user.id).maybeSingle();
  if (data) return data;

  const display = String(user.user_metadata?.display_name || user.email?.split("@")[0] || "Player").slice(0, 32);
  let desired = normalizeUsername(String(user.user_metadata?.username || user.email?.split("@")[0] || "player"));
  if (!validUsername(desired)) desired = `player_${user.id.replace(/-/g, "").slice(0, 8)}`;

  const { data: taken } = await db.from("profiles").select("user_id").eq("username", desired).maybeSingle();
  if (taken) desired = `player_${user.id.replace(/-/g, "").slice(0, 8)}`;

  const { data: inserted, error } = await db.from("profiles").insert({
    user_id: user.id,
    display_name: display.length >= 2 ? display : "Player",
    username: desired,
  }).select("user_id,username").single();
  if (error) throw error;
  return inserted;
}
