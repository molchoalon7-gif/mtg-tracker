export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://omeituwuxwfqkjyranpu.supabase.co";

// Publishable keys are intentionally safe for browser use when RLS is enabled.
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_AaLHXBYlas3Imk8cNL1qRQ_xFLmwFNU";
