import type { FC, LazyExoticComponent } from "react";
import type { Player } from "../store/gameStore";

export type PlayerId = string;

export interface GameAction {
  type: string;
  payload: any;
  playerId: PlayerId;
}

export interface GameBoardComponentProps<TGameState, TGameAction extends GameAction = GameAction> {
  gameState: TGameState;
  statusMessage: string;
  isGameOver: boolean;
  isMyTurn: boolean;
  onPerformAction: (action: Omit<TGameAction, "playerId">) => void;
  onLeaveGame: () => void;
  privateState?: any;
}

export interface GameOption {
  id: string;
  label: string;
  type: "select" | "number" | "boolean";
  defaultValue: string | number | boolean;
  choices?: { label: string; value: string | number }[];
}

export type HandleActionResult<TGameState> =
  | TGameState
  | {
      publicState: TGameState;
      privateStates: Record<PlayerId, any>;
    };

export type GameRegistryEntry<TGameState = any, TGameAction extends GameAction = GameAction> = {
  id: string;
  displayName: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  gameOptions?: GameOption[];

  getInitialState: (playerIds: PlayerId[], currentState?: TGameState, options?: Record<string, any>) => TGameState;
  handleAction: (currentState: TGameState, action: TGameAction) => HandleActionResult<TGameState>;
  getGameStatus: (gameState: TGameState, players: Player[]) => string;
  isGameOver: (gameState: TGameState) => boolean;
  isTurnOf: (gameState: TGameState, playerId: PlayerId) => boolean;

  BoardComponent: LazyExoticComponent<FC<GameBoardComponentProps<TGameState, TGameAction>>>;
  LobbyPageComponent: LazyExoticComponent<FC>;
  GamePageComponent: LazyExoticComponent<FC>;
};
