import React from "react";
import type { GameRegistryEntry } from "../../types";
import type { UnoGameState, UnoAction } from "./types";

import { getInitialState, handleAction, getGameStatus, isGameOver, isTurnOf } from "./logic";

const UnoBoard = React.lazy(() => import("./components/UnoBoard"));
const UnoLobbyPage = React.lazy(() => import("./pages/UnoLobbyPage"));
const UnoGamePage = React.lazy(() => import("./pages/UnoGamePage"));

const unoGameEntry: GameRegistryEntry<UnoGameState, UnoAction> = {
  id: "uno",
  displayName: "Uno",
  description: "The classic card game of matching colors and numbers. Be the first to empty your hand!",
  minPlayers: 2,
  maxPlayers: 10,

  gameOptions: [
    {
      id: "turnTimer",
      label: "Turn Timer",
      type: "select",
      defaultValue: 0,
      choices: [
        { label: "Unlimited", value: 0 },
        { label: "15 Seconds", value: 15 },
        { label: "30 Seconds", value: 30 },
        { label: "60 Seconds", value: 60 },
      ],
    },
    {
      id: "stackPlusTwo",
      label: "Stack +2 Cards",
      type: "boolean",
      defaultValue: true,
    },
    {
      id: "stackPlusFour",
      label: "Stack +4 Cards",
      type: "boolean",
      defaultValue: true,
    },
  ],

  getInitialState,
  handleAction,
  getGameStatus,
  isGameOver,
  isTurnOf,

  BoardComponent: UnoBoard,
  LobbyPageComponent: UnoLobbyPage,
  GamePageComponent: UnoGamePage,
};

export default unoGameEntry;
