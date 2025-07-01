export type PlayerSymbol = "X" | "O";

export interface GameState {
  board: (PlayerSymbol | null)[];
  isNext: PlayerSymbol;
  winner: PlayerSymbol | "draw" | null;
  status: string;
}
