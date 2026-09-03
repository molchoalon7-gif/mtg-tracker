# ManaPair

Minimal Magic: The Gathering tournament software for player-run events.

## Core features

- Player-created asynchronous or scheduled tournaments
- Required private decklist submission with Scryfall card validation
- Automatic unique-opponent pairings based on actual registration count
- Organizer-selected target matches per player with fair automatic adjustment when needed
- Best-of-three score reporting and 3/1/0 standings
- Score disputes and tournament-admin corrections
- Tournament owners can add co-admins by unique username
- Admin-only tournament cancellation
- Unique usernames and friend requests
- Player profiles with lifetime record, win rate and tournament history
- Decklists become public only after a tournament is completed
- Persistent light/dark mode
- Minimal motion/blur transitions and slide-over format selection

## Stack

- Next.js + TypeScript
- Supabase Auth + Postgres + Row Level Security
- Scryfall card data
- Vercel

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` if you want to override the public Supabase configuration.
