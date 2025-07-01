import React from "react";
import type { GameRegistryEntry } from "../types";
import type { TicTacToeGameState } from "./tic-tac-toe/types";

// Import the logic and components for each game
import {
  getInitialState as getTicTacToeState,
  calculateMove as calculateTicTacToeMove,
  getGameStatus as getTicTacToeStatus,
  isGameOver as isTicTacToeGameOver,
} from "./tic-tac-toe/logic";
const TicTacToeBoard = React.lazy(() => import("./tic-tac-toe/components/TicTacToeBoard"));

// The master list of all playable games in the hub.
export const gameRegistry: GameRegistryEntry[] = [
  {
    id: "tic-tac-toe",
    displayName: "Tic Tac Toe",
    minPlayers: 2,
    maxPlayers: 2,
    getInitialState: getTicTacToeState,
    calculateMove: calculateTicTacToeMove,
    getGameStatus: getTicTacToeStatus,
    isGameOver: isTicTacToeGameOver,
    BoardComponent: TicTacToeBoard,
  } as GameRegistryEntry<TicTacToeGameState>, // Type assertion for specific game state
  // --- Add new games here ---
  // e.g., { id: 'connect-four', ... }
];

// A helper to easily find a game's configuration by its ID.
export const findGame = (id: string) => gameRegistry.find((g) => g.id === id);
