# ManaPair

Minimal tournament software for Magic: The Gathering.

Players can create tournaments, register with private decklists, receive automatic unique-opponent pairings, report match scores, dispute incorrect results, and keep permanent tournament history. Tournament admins can correct any score. Decklists remain private to the player and tournament admin until the tournament is completed, then become visible in event history.

Card names are validated against Scryfall's complete Magic card catalog. Scryfall requests are proxied server-side with an identifying User-Agent and cached where appropriate.

## Stack
Next.js 16, React 19, Supabase Auth/Postgres/RLS, Vercel.

## Run
1. Copy `.env.example` to `.env.local` and add the public Supabase URL + publishable key.
2. `npm install`
3. `npm run dev`

No secret/service-role key belongs in this repository.
