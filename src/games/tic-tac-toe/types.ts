import type { GameAction, PlayerId } from "../../types";

export type TicTacToeValue = "X" | "O";

export interface TicTacToeGameState {
  board: (TicTacToeValue | null)[];
  isNext: TicTacToeValue;
  winner: TicTacToeValue | "draw" | null;
  playerMap: { [id: PlayerId]: TicTacToeValue };
  scores: { [id: PlayerId]: number };
  options: {
    turnTimer: number;
  };
}

export type MakeMoveAction = GameAction & {
  type: "MAKE_MOVE";
  payload: number;
};

export type TicTacToeAction = MakeMoveAction;
