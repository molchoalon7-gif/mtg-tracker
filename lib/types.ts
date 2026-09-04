export type TournamentStatus = "registration" | "active" | "completed" | "cancelled";
export type TournamentMode = "async" | "scheduled";

export type Tournament = {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  format: string;
  mode: TournamentMode;
  status: TournamentStatus;
  starts_at: string;
  ends_at: string;
  registration_deadline: string;
  matches_per_player: number;
  resolved_matches_per_player: number | null;
  round_count: number | null;
  max_players: number | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
};

export type Profile = { user_id: string; display_name: string; username: string };
export type Standing = { tournament_id:string; user_id:string; display_name:string; played:number; wins:number; draws:number; losses:number; points:number; game_wins:number; game_losses:number; win_rate:number };
export type MatchRow = { id:string; tournament_id:string; player_a:string; player_b:string; round_number:number; player_a_wins:number|null; player_b_wins:number|null; status:"pending"|"reported"; reported_by:string|null };
export type DeckCard = { card_name:string; scryfall_id:string|null; oracle_id:string|null; quantity:number; section:"main"|"sideboard" };
export type Decklist = { id:string; tournament_id:string; user_id:string; name:string|null; submitted_at:string };
export type UserDeck = { id:string; user_id:string; name:string; format:string|null; created_at:string; updated_at:string };
export type Friendship = { id:string; requester_id:string; addressee_id:string; status:"pending"|"accepted"; created_at:string; updated_at:string };
