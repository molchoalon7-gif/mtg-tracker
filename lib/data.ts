import type { Match, Tournament } from "./types";

type MatchRow = {
  id: string;
  played_at: string;
  format: string;
  deck_id: string | null;
  opponent_deck: string;
  result: "W" | "L" | "D";
  games_won: number;
  games_lost: number;
  games_drawn: number;
  play_draw: "play" | "draw" | null;
  round: string | null;
  notes: string | null;
  decks: { name: string } | { name: string }[] | null;
  tournaments: { name: string } | { name: string }[] | null;
};

type TournamentRow = {
  id: string;
  name: string;
  format: string;
  platform: string;
  starts_at: string;
  player_count: number | null;
  source: string;
  registration_url: string | null;
  source_url: string | null;
};

function relationName(value: { name: string } | { name: string }[] | null) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0]?.name : value.name;
}

export function mapMatch(row: MatchRow): Match {
  const score = [row.games_won, row.games_lost, row.games_drawn]
    .filter((value, index) => index < 2 || value > 0)
    .join("-");

  return {
    id: row.id,
    playedAt: row.played_at,
    format: row.format,
    deckId: row.deck_id,
    deck: relationName(row.decks) ?? "Unknown deck",
    opponentDeck: row.opponent_deck,
    result: row.result,
    score,
    event: relationName(row.tournaments),
    round: row.round ?? undefined,
    playDraw: row.play_draw,
    notes: row.notes,
  };
}

export function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    format: row.format,
    platform: row.platform,
    startsAt: row.starts_at,
    players: row.player_count,
    source: row.source,
    registrationUrl: row.registration_url,
    sourceUrl: row.source_url,
  };
}
