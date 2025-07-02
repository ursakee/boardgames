import React from "react";
import type { GameRegistryEntry } from "../types";
import type { TicTacToeGameState } from "./tic-tac-toe/types";

// Import the logic and components for each game
import {
  getInitialState as getTicTacToeState,
  handleAction as handleTicTacToeAction, // MODIFIED: Import handleAction instead
  getGameStatus as getTicTacToeStatus,
  isGameOver as isTicTacToeGameOver,
  isTurnOf as isTicTacToeTurnOf, // MODIFIED: Import the new turn function
} from "./tic-tac-toe/logic"; // NOTE: No need for '/index.ts' in the path
const TicTacToeBoard = React.lazy(() => import("./tic-tac-toe/components/TicTacToeBoard"));

// The master list of all playable games in the hub.
export const gameRegistry: GameRegistryEntry[] = [
  {
    id: "tic-tac-toe",
    displayName: "Tic Tac Toe",
    minPlayers: 2,
    maxPlayers: 2,
    getInitialState: getTicTacToeState,
    handleAction: handleTicTacToeAction, // MODIFIED: Use handleAction
    getGameStatus: getTicTacToeStatus,
    isGameOver: isTicTacToeGameOver,
    isTurnOf: isTicTacToeTurnOf, // MODIFIED: Add the new turn function
    BoardComponent: TicTacToeBoard,
  } as GameRegistryEntry<TicTacToeGameState>, // Type assertion for specific game state
  // --- Add new games here ---
  // e.g., { id: 'connect-four', ... }
];

// A helper to easily find a game's configuration by its ID.
export const findGame = (id: string) => gameRegistry.find((g) => g.id === id);
