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

export type GameRegistryEntry<TGameState = any> = {
  id: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
  getInitialState: (playerIds: PlayerId[]) => TGameState;
  handleAction: (currentState: TGameState, action: GameAction) => TGameState;
  getGameStatus: (gameState: TGameState, players: Player[]) => string;
  isGameOver: (gameState: TGameState) => boolean;
  isTurnOf: (gameState: TGameState, playerId: PlayerId) => boolean;
  BoardComponent: LazyExoticComponent<FC<GameBoardComponentProps<TGameState>>>;

  // NEW: References to the game's specific page components
  LobbyPageComponent: LazyExoticComponent<FC>;
  GamePageComponent: LazyExoticComponent<FC>;
};
