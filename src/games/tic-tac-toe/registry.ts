import React from "react";
import type { GameRegistryEntry } from "../../types";
import type { TicTacToeGameState, TicTacToeAction } from "./types";

import { getInitialState, handleAction, getGameStatus, isGameOver, isTurnOf } from "./logic";

const TicTacToeBoard = React.lazy(() => import("./components/TicTacToeBoard"));
const TicTacToeLobbyPage = React.lazy(() => import("./pages/TicTacToeLobbyPage"));
const TicTacToeGamePage = React.lazy(() => import("./pages/TicTacToeGamePage"));

const ticTacToeGameEntry: GameRegistryEntry<TicTacToeGameState, TicTacToeAction> = {
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

  getInitialState,
  handleAction,
  getGameStatus,
  isGameOver,
  isTurnOf,

  BoardComponent: TicTacToeBoard,
  LobbyPageComponent: TicTacToeLobbyPage,
  GamePageComponent: TicTacToeGamePage,
};

export default ticTacToeGameEntry;
