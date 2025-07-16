import type { UnoCard, CardColor, CardValue } from "../types";

const COLORS: CardColor[] = ["red", "yellow", "green", "blue"];
const NUMBERS: CardValue[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const ACTIONS: CardValue[] = ["skip", "reverse", "draw-two"];

export const createDeck = (): UnoCard[] => {
  const deck: UnoCard[] = [];

  // Number and action cards
  for (const color of COLORS) {
    // One '0' card
    deck.push({ color, value: "0" });

    // Two of each number 1-9
    for (let i = 1; i < NUMBERS.length; i++) {
      deck.push({ color, value: NUMBERS[i] });
      deck.push({ color, value: NUMBERS[i] });
    }

    // Two of each action
    for (const action of ACTIONS) {
      deck.push({ color, value: action });
      deck.push({ color, value: action });
    }
  }

  // Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ color: "black", value: "wild" });
    deck.push({ color: "black", value: "wild-draw-four" });
  }

  return deck;
};

export const shuffleDeck = (deck: UnoCard[]): UnoCard[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
