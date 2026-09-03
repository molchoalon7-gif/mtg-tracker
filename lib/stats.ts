import type { Match } from "./types";

export function getMatchStats(matches: Match[]) {
  const wins = matches.filter((m) => m.result === "W").length;
  const losses = matches.filter((m) => m.result === "L").length;
  const draws = matches.filter((m) => m.result === "D").length;
  const decided = wins + losses;
  return {
    total: matches.length,
    wins,
    losses,
    draws,
    winRate: decided ? Math.round((wins / decided) * 1000) / 10 : 0,
  };
}
