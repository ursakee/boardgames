export type TicTacToeValue = "X" | "O";

export interface TicTacToeGameState {
  board: (TicTacToeValue | null)[];
  isNext: TicTacToeValue;
  winner: TicTacToeValue | "draw" | null;
}
