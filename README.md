# MTG Tracker

A live Magic: The Gathering match, deck-performance, and online tournament tracker built with Next.js + Supabase.

## V0.2 features
- Supabase email/password authentication
- Private match history protected by Row Level Security
- Persistent deck creation and deck win-rate tracking
- Match logging with score, play/draw, round, and notes
- Public upcoming tournament calendar
- Seeded official September 2026 MTGO Premier Play events with source links
- Responsive dashboard
- Next.js 16 / Node 22 deployment setup

## Environment
The app reads:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

For the first connected deployment, the public Supabase URL and publishable key also have a safe source-code fallback. Never add a Supabase secret/service-role key to frontend code.

## Database
Apply `supabase/migrations/001_initial_schema.sql` to the linked Supabase project.

## Run
```bash
npm install
npm run dev
```

## Next product work
1. Automated tournament source adapters (MTGO schedule/decklists first)
2. Scryfall autocomplete + decklist parsing
3. Matchup matrix and format/deck filters
4. Tournament result imports and deck metagame stats
5. Public player/deck profiles
6. MTGO/Arena CSV imports
