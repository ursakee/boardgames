import React from "react";
import type { GameRegistryEntry } from "../../types";
import type { BrainTrainGameState } from "./types";

// --- Import all game-specific logic and components ---
import { getInitialState, handleAction, getGameStatus, isGameOver, isTurnOf } from "./logic";

// --- Lazily import all UI components for this game ---
const BrainTrainBoard = React.lazy(() => import("./components/BrainTrainBoard"));
const BrainTrainLobbyPage = React.lazy(() => import("./pages/BrainTrainLobbyPage"));
const BrainTrainGamePage = React.lazy(() => import("./pages/BrainTrainGamePage"));

const brainTrainGameEntry: GameRegistryEntry<BrainTrainGameState> = {
  id: "brain-train",
  displayName: "Brain Train",
  description: "A logic puzzle where you must correctly place trains on tracks based on clues.",
  minPlayers: 1,
  maxPlayers: 4,

  gameOptions: [
    {
      id: "difficulty",
      label: "Difficulty",
      type: "select",
      defaultValue: "easy",
      choices: [
        { label: "Easy", value: "easy" },
        { label: "Medium", value: "medium" },
        { label: "Hard", value: "hard" },
        { label: "Very Hard", value: "veryhard" },
      ],
    },
  ],

  getInitialState,
  handleAction,
  getGameStatus,
  isGameOver,
  isTurnOf,

  BoardComponent: BrainTrainBoard,
  LobbyPageComponent: BrainTrainLobbyPage,
  GamePageComponent: BrainTrainGamePage,
};

export default brainTrainGameEntry;
