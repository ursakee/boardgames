import type { FC, LazyExoticComponent } from "react";
import type { Player } from "../store/gameStore";

export type PlayerId = string;

export interface GameAction {
  type: string;
  payload: any;
  playerId: PlayerId;
}

export interface GameBoardComponentProps<TGameState> {
  gameState: TGameState;
  statusMessage: string;
  isGameOver: boolean;
  isMyTurn: boolean;
  onPerformAction: (action: Omit<GameAction, "playerId">) => void;
  onLeaveGame: () => void;
}

export interface GameOption {
  id: string;
  label: string;
  type: "select" | "number" | "boolean";
  defaultValue: string | number | boolean;
  choices?: { label: string; value: string | number }[];
}

export type GameRegistryEntry<TGameState = any> = {
  id: string;
  displayName: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  gameOptions?: GameOption[];

  getInitialState: (playerIds: PlayerId[], currentState?: TGameState, options?: Record<string, any>) => TGameState;
  handleAction: (currentState: TGameState, action: GameAction) => TGameState;
  getGameStatus: (gameState: TGameState, players: Player[]) => string;
  isGameOver: (gameState: TGameState) => boolean;
  isTurnOf: (gameState: TGameState, playerId: PlayerId) => boolean;

  BoardComponent: LazyExoticComponent<FC<GameBoardComponentProps<TGameState>>>;
  LobbyPageComponent: LazyExoticComponent<FC>;
  GamePageComponent: LazyExoticComponent<FC>;
};
