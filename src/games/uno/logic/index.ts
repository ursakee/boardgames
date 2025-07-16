import type { Player } from "../../../store/gameStore";
import type { PlayerId } from "../../../types";
import type { UnoGameState, UnoAction, UnoCard } from "../types";
import { createDeck, shuffleDeck } from "./deck";

export const getInitialState = (
  playerIds: PlayerId[],
  _currentState: UnoGameState | undefined,
  options?: Record<string, any>
): UnoGameState => {
  let deck = shuffleDeck(createDeck());
  const playerHands: Record<PlayerId, UnoCard[]> = {};

  playerIds.forEach((id) => {
    playerHands[id] = deck.splice(0, 7);
  });

  let discardPile: UnoCard[] = [];
  let topCard: UnoCard;

  do {
    topCard = deck.pop()!;
    discardPile.push(topCard);
  } while (topCard.color === "black");

  return {
    deck,
    discardPile,
    playerHands,
    playerOrder: playerIds,
    currentPlayerIndex: 0,
    currentPlayerId: playerIds[0],
    direction: 1, // 1 for clockwise, -1 for counter-clockwise
    winner: null,
    activeColor: topCard.color,
    drawCount: 0,
    unoSaid: [],
    awaitingColorChoice: false,
    options: {
      turnTimer: options?.turnTimer ?? 0,
      stackPlusTwo: options?.stackPlusTwo ?? true,
      stackPlusFour: options?.stackPlusFour ?? true,
    },
    deckSize: deck.length,
  };
};

export const handleAction = (currentState: UnoGameState, action: UnoAction): UnoGameState => {
  if (currentState.winner || (currentState.awaitingColorChoice && action.type !== "CHOOSE_COLOR")) {
    return currentState;
  }

  const { playerHands, options } = currentState;
  const currentPlayerId = action.playerId;
  const playerHand = playerHands[currentPlayerId];

  // Helper function to advance to the next player
  const advanceTurn = (state: UnoGameState, steps = 1): UnoGameState => {
    const newIndex =
      (state.currentPlayerIndex + state.direction * steps + state.playerOrder.length) % state.playerOrder.length;
    return {
      ...state,
      currentPlayerIndex: newIndex,
      currentPlayerId: state.playerOrder[newIndex],
      awaitingColorChoice: false,
    };
  };

  const drawCards = (state: UnoGameState, targetPlayerId: PlayerId, count: number): UnoGameState => {
    let newDeck = [...state.deck];
    let newDiscardPile = [...state.discardPile];
    const cardsDrawn: UnoCard[] = [];

    for (let i = 0; i < count; i++) {
      if (newDeck.length === 0) {
        if (newDiscardPile.length <= 1) break;
        const top = newDiscardPile.pop()!;
        newDeck = shuffleDeck(newDiscardPile);
        newDiscardPile = [top];
      }
      if (newDeck.length > 0) {
        cardsDrawn.push(newDeck.pop()!);
      }
    }

    const newPlayerHands = { ...state.playerHands };
    newPlayerHands[targetPlayerId] = [...(newPlayerHands[targetPlayerId] || []), ...cardsDrawn];

    return {
      ...state,
      deck: newDeck,
      discardPile: newDiscardPile,
      playerHands: newPlayerHands,
      deckSize: newDeck.length,
    };
  };

  switch (action.type) {
    case "PLAY_CARD": {
      const { card } = action.payload;
      const topCard = currentState.discardPile[currentState.discardPile.length - 1];
      const cardIndex = playerHand.findIndex((c) => c.color === card.color && c.value === card.value);

      if (cardIndex === -1) return currentState;

      const isDrawTwoStack = card.value === "draw-two" && topCard.value === "draw-two" && options.stackPlusTwo;
      const isDrawFourStack =
        card.value === "wild-draw-four" &&
        ["draw-two", "wild-draw-four"].includes(topCard.value) &&
        options.stackPlusFour;

      const isValidMove =
        currentState.drawCount > 0
          ? isDrawTwoStack || isDrawFourStack
          : card.color === "black" || card.color === currentState.activeColor || card.value === topCard.value;

      if (!isValidMove) return currentState;

      let nextState: UnoGameState = { ...currentState };

      const newHand = [...playerHand];
      newHand.splice(cardIndex, 1);

      nextState.playerHands = { ...nextState.playerHands, [currentPlayerId]: newHand };
      nextState.discardPile = [...nextState.discardPile, card];

      if (card.color !== "black") {
        nextState.activeColor = card.color;
      }

      if (nextState.unoSaid.includes(currentPlayerId)) {
        nextState.unoSaid = nextState.unoSaid.filter((id) => id !== currentPlayerId);
      }

      if (newHand.length === 0) {
        nextState.winner = currentPlayerId;
        return nextState;
      }

      switch (card.value) {
        case "skip":
          return advanceTurn(nextState, 2);
        case "reverse":
          nextState.direction *= -1;
          return advanceTurn(nextState);
        case "draw-two":
          nextState.drawCount += 2;
          return advanceTurn(nextState);
        case "wild":
          nextState.awaitingColorChoice = true;
          return nextState;
        case "wild-draw-four":
          nextState.drawCount += 4;
          nextState.awaitingColorChoice = true;
          return nextState;
        default:
          return advanceTurn(nextState);
      }
    }

    case "DRAW_CARD": {
      let nextState: UnoGameState = { ...currentState };
      if (nextState.drawCount > 0) {
        nextState = drawCards(nextState, currentPlayerId, nextState.drawCount);
        nextState.drawCount = 0;
      } else {
        nextState = drawCards(nextState, currentPlayerId, 1);
      }
      return advanceTurn(nextState);
    }

    case "CHOOSE_COLOR": {
      let nextState = { ...currentState };
      if (action.playerId !== nextState.currentPlayerId) return currentState;

      nextState.activeColor = action.payload.color;
      nextState.awaitingColorChoice = false;
      return advanceTurn(nextState);
    }

    case "SAY_UNO": {
      if (playerHand.length === 1 && !currentState.unoSaid.includes(currentPlayerId)) {
        return { ...currentState, unoSaid: [...currentState.unoSaid, currentPlayerId] };
      }
      return currentState;
    }

    default:
      return currentState;
  }
};

export const isGameOver = (gameState: UnoGameState): boolean => {
  return gameState.winner !== null;
};

export const isTurnOf = (gameState: UnoGameState, playerId: PlayerId): boolean => {
  if (gameState.winner) return false;
  if (gameState.awaitingColorChoice) {
    return gameState.currentPlayerId === playerId;
  }
  return gameState.currentPlayerId === playerId;
};

export const getGameStatus = (gameState: UnoGameState, players: Player[]): string => {
  const getPlayerName = (id: PlayerId) => players.find((p) => p.id === id)?.username || "Player";

  if (gameState.winner) {
    return `${getPlayerName(gameState.winner)} wins!`;
  }
  if (gameState.awaitingColorChoice) {
    return `${getPlayerName(gameState.currentPlayerId)} is choosing a color...`;
  }
  if (gameState.drawCount > 0) {
    const victimIndex =
      (gameState.currentPlayerIndex + gameState.direction + gameState.playerOrder.length) %
      gameState.playerOrder.length;
    const victimId = gameState.playerOrder[victimIndex];
    return `${getPlayerName(victimId)} must draw ${gameState.drawCount} or play a draw card.`;
  }

  return `${getPlayerName(gameState.currentPlayerId)}'s Turn`;
};
