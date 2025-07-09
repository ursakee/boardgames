import React from "react";
import type { GameRegistryEntry } from "../../types";
import type { TicTacToeGameState } from "./types";

// --- Import all game-specific logic and components ---
import { getInitialState, handleAction, getGameStatus, isGameOver, isTurnOf } from "./logic";

// --- Lazily import all UI components for this game ---
const TicTacToeBoard = React.lazy(() => import("./components/TicTacToeBoard"));
const TicTacToeLobbyPage = React.lazy(() => import("./pages/TicTacToeLobbyPage"));
const TicTacToeGamePage = React.lazy(() => import("./pages/TicTacToeGamePage"));

const ticTacToeGameEntry: GameRegistryEntry<TicTacToeGameState> = {
  id: "tic-tac-toe",
  displayName: "Tic Tac Toe",
  description: "The classic game of X's and O's. First to get three in a row wins.",
  minPlayers: 2,
  maxPlayers: 2,

  gameOptions: [
    {
      id: "turnTimer",
      label: "Turn Timer",
      type: "select",
      defaultValue: 0,
      choices: [
        { label: "Unlimited", value: 0 },
        { label: "2 Seconds", value: 2 },
        { label: "5 Seconds", value: 5 },
        { label: "10 Seconds", value: 10 },
      ],
    },
  ],

  // Game Logic Functions
  getInitialState: getInitialState,
  handleAction: handleAction,
  getGameStatus: getGameStatus,
  isGameOver: isGameOver,
  isTurnOf: isTurnOf,

  // UI Component References
  BoardComponent: TicTacToeBoard,
  LobbyPageComponent: TicTacToeLobbyPage,
  GamePageComponent: TicTacToeGamePage,
};

export default ticTacToeGameEntry;
