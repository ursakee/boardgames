import type { FC, LazyExoticComponent } from "react";
import type { Player } from "../store/gameStore";

export type PlayerId = string;

// The generic action that any game component can dispatch.
// It now includes the ID of the player who performed it.
export interface GameAction {
  type: string;
  payload: any;
  playerId: PlayerId; // ADDED: The player who initiated the action.
}

// The properties that every game board component will receive.
export interface GameBoardComponentProps<TGameState> {
  gameState: TGameState;
  statusMessage: string;
  isGameOver: boolean;
  isMyTurn: boolean;
  // The component will call this with an action, but without the playerId,
  // as the store will add it automatically.
  onPerformAction: (action: Omit<GameAction, "playerId">) => void;
  onLeaveGame: () => void;
}

// The contract that every game must fulfill to be included in the hub.
export type GameRegistryEntry<TGameState = any> = {
  // Metadata
  id: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;

  // Core game logic functions
  getInitialState: (playerIds: PlayerId[]) => TGameState;
  // handleAction now correctly expects a full GameAction.
  handleAction: (currentState: TGameState, action: GameAction) => TGameState;
  getGameStatus: (gameState: TGameState, players: Player[]) => string;
  isGameOver: (gameState: TGameState) => boolean;
  isTurnOf: (gameState: TGameState, playerId: PlayerId) => boolean;

  // The React component for the game board
  BoardComponent: LazyExoticComponent<FC<GameBoardComponentProps<TGameState>>>;
};
