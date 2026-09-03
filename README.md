# ManaPair

Minimal community tournament software for Magic: The Gathering.

## Current features
- User-created asynchronous or scheduled tournaments
- Required Scryfall-validated decklists with private-until-complete visibility
- Automatic unique-opponent pairings that adapt to actual registration count
- Player score reporting, disputes, admin corrections, co-admins and cancellation
- Standings and player history
- Globally unique usernames and friends
- Light/dark themes and full mobile navigation
- Pairing-only email contact: registered email is readable only by the account owner or a current opponent in an active tournament
- Versioned Terms of Service acceptance and Privacy Notice

## Security model
Private records are protected in Supabase with Row Level Security. Login emails are stored separately from public profiles. No service-role or secret key belongs in frontend code or this repository.

## Stack
Next.js 16, React 19, Supabase Auth/Postgres/RLS, Vercel, Scryfall.

## Run
1. Copy `.env.example` to `.env.local` and add the public Supabase URL + publishable key.
2. `npm install`
3. `npm run dev`
