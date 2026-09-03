export type MatchResult = "W" | "L" | "D";

export type Match = {
  id: string;
  playedAt: string;
  format: string;
  deckId?: string | null;
  deck: string;
  opponentDeck: string;
  result: MatchResult;
  score: string;
  event?: string;
  round?: string;
  playDraw?: "play" | "draw" | null;
  notes?: string | null;
};

export type Tournament = {
  id: string;
  name: string;
  format: string;
  platform: string;
  startsAt: string;
  players?: number | null;
  source?: string;
  registrationUrl?: string | null;
  sourceUrl?: string | null;
};

export type Deck = {
  id: string;
  name: string;
  format: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
};
