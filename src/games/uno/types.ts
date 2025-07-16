import type { GameAction, PlayerId } from "../../types";

export type CardColor = "red" | "yellow" | "green" | "blue" | "black";
export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw-two"
  | "wild"
  | "wild-draw-four";

export interface UnoCard {
  color: CardColor;
  value: CardValue;
}

export interface UnoGameState {
  deck: UnoCard[];
  discardPile: UnoCard[];
  playerHands: Record<PlayerId, UnoCard[]>;
  playerOrder: PlayerId[];
  currentPlayerIndex: number;
  currentPlayerId: PlayerId;
  direction: 1 | -1;
  winner: PlayerId | null;
  activeColor: CardColor;
  drawCount: number;
  unoSaid: PlayerId[];
  awaitingColorChoice: boolean;
  options: {
    turnTimer: number;
    stackPlusTwo: boolean;
    stackPlusFour: boolean;
  };
  // For UI display, not core logic
  deckSize: number;
}

export type PlayCardAction = GameAction & {
  type: "PLAY_CARD";
  payload: { card: UnoCard; chosenColor: CardColor | null };
};

export type DrawCardAction = GameAction & {
  type: "DRAW_CARD";
  payload: null;
};

export type SayUnoAction = GameAction & {
  type: "SAY_UNO";
  payload: null;
};

export type ChooseColorAction = GameAction & {
  type: "CHOOSE_COLOR";
  payload: { color: CardColor };
};

export type UnoAction = PlayCardAction | DrawCardAction | SayUnoAction | ChooseColorAction;
