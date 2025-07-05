import React from "react";
import type { GameRegistryEntry } from "../types";
import type { TicTacToeGameState } from "./tic-tac-toe/types";

import {
  getInitialState as getTicTacToeState,
  handleAction as handleTicTacToeAction,
  getGameStatus as getTicTacToeStatus,
  isGameOver as isTicTacToeGameOver,
  isTurnOf as isTicTacToeTurnOf,
} from "./tic-tac-toe/logic";

// Lazily import all components, including the new page components
const TicTacToeBoard = React.lazy(() => import("./tic-tac-toe/components/TicTacToeBoard"));
const TicTacToeLobbyPage = React.lazy(() => import("./tic-tac-toe/pages/TicTacToeLobbyPage"));
const TicTacToeGamePage = React.lazy(() => import("./tic-tac-toe/pages/TicTacToeGamePage"));

export const gameRegistry: GameRegistryEntry[] = [
  {
    id: "tic-tac-toe",
    displayName: "Tic Tac Toe",
    minPlayers: 2,
    maxPlayers: 2,
    getInitialState: getTicTacToeState,
    handleAction: handleTicTacToeAction,
    getGameStatus: getTicTacToeStatus,
    isGameOver: isTicTacToeGameOver,
    isTurnOf: isTicTacToeTurnOf,
    BoardComponent: TicTacToeBoard,

    // NEW: Add the page components to the registry
    LobbyPageComponent: TicTacToeLobbyPage,
    GamePageComponent: TicTacToeGamePage,
  } as GameRegistryEntry<TicTacToeGameState>,
  // --- Add new games here ---
];

export const findGame = (id: string) => gameRegistry.find((g) => g.id === id);
