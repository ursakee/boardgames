import type { FC, LazyExoticComponent } from "react";
import type { Player } from "../store/gameStore";

export type PlayerSymbol = string;

// The properties that every game board component will receive.
// We've added statusMessage and isGameOver to be controlled by the main GamePage.
export interface GameBoardComponentProps<TGameState> {
  gameState: TGameState;
  statusMessage: string;
  isGameOver: boolean;
  onMakeMove: (move: any) => void;
  onLeaveGame: () => void;
}

// The contract that every game must fulfill to be included in the hub.
// This makes adding new games a plug-and-play process.
export type GameRegistryEntry<TGameState = any> = {
  // Metadata
  id: string; // e.g., "tic-tac-toe"
  displayName: string; // e.g., "Tic Tac Toe"
  minPlayers: number;
  maxPlayers: number;

  // Core game logic functions
  getInitialState: () => TGameState;
  calculateMove: (currentState: TGameState, move: any, playerSymbol: PlayerSymbol) => TGameState;
  getGameStatus: (gameState: TGameState, players: Player[]) => string;
  isGameOver: (gameState: TGameState) => boolean;

  // The React component for the game board
  BoardComponent: LazyExoticComponent<FC<GameBoardComponentProps<TGameState>>>;
};
