import type { GameAction, PlayerId } from "../../types";

export type Difficulty = "easy" | "medium" | "hard" | "veryhard";

export interface Position {
  row: number;
  col: number;
}

export interface Track {
  trackId: number;
  color: string;
  path: Position[];
}

export interface Train {
  trainId: number;
  trackId: number;
  carPositions: Position[];
  carsCount: number;
}

export interface BrainTrainPuzzle {
  difficulty: Difficulty;
  grid: { rows: number; columns: number; gridSize: number };
  tracks: Track[];
  trains: Train[];
  clues: { rowClues: number[]; columnClues: number[] };
}

export type GridCell = {
  trackId?: number;
  color?: string;
  connections?: string[];
  isFixedTrain?: boolean;
  isUserPlacedTrain?: boolean;
  isMarked?: boolean;
}[];

export type GridState = (GridCell | null)[][];

export interface PlayerState {
  id: PlayerId;
  fixedTrainId: number | null;
  submitted: boolean;
  submissionResult: "correct" | "incorrect" | null;
  submittedGrid: string | null;
}

export interface BrainTrainGameState {
  puzzle: BrainTrainPuzzle;
  playerStates: Record<PlayerId, PlayerState>;
  winner: PlayerId | null;
  options: {
    difficulty: Difficulty;
  };
  solution: string;
}

export type SubmitSolutionAction = GameAction & {
  type: "SUBMIT_SOLUTION";
  payload: GridState;
};

export type ReturnToLobbyAction = GameAction & {
  type: "RETURN_TO_LOBBY";
  payload: null;
};

export type BrainTrainAction = SubmitSolutionAction | ReturnToLobbyAction;
