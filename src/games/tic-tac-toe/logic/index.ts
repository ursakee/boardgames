import type { Player } from "../../../store/gameStore";
import type { PlayerId } from "../../../types";
import type { TicTacToeGameState, TicTacToeAction, TicTacToeValue } from "../types";

export const getInitialState = (
  playerIds: PlayerId[],
  currentState?: TicTacToeGameState,
  options?: Record<string, any>
): TicTacToeGameState => {
  const [p1, p2] = playerIds;
  const isPlayer1_X = Math.random() < 0.5;
  const scores = currentState?.scores || { [p1]: 0, [p2]: 0 };

  const newOptions = {
    turnTimer: options?.turnTimer ?? currentState?.options?.turnTimer ?? 0,
  };

  return {
    board: Array(9).fill(null),
    isNext: "X",
    winner: null,
    playerMap: {
      [p1]: isPlayer1_X ? "X" : "O",
      [p2]: isPlayer1_X ? "O" : "X",
    },
    scores,
    options: newOptions,
  };
};

export const handleAction = (currentState: TicTacToeGameState, action: TicTacToeAction): TicTacToeGameState => {
  const moveIndex = action.payload;
  const playerSymbol = currentState.playerMap[action.playerId];

  if (!playerSymbol || currentState.board[moveIndex] || currentState.winner || currentState.isNext !== playerSymbol) {
    return currentState;
  }

  const newBoard = [...currentState.board];
  newBoard[moveIndex] = playerSymbol;
  const newIsNext = playerSymbol === "X" ? "O" : "X";

  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  let winner: TicTacToeValue | "draw" | null = null;
  for (const line of lines) {
    const [a, b, c] = line;
    if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
      winner = newBoard[a] as TicTacToeValue;
      break;
    }
  }

  if (!winner && newBoard.every(Boolean)) {
    winner = "draw";
  }

  const newScores = { ...currentState.scores };
  if (winner && winner !== "draw") {
    const winnerId = Object.keys(currentState.playerMap).find((id) => currentState.playerMap[id] === winner);
    if (winnerId) {
      newScores[winnerId] = (newScores[winnerId] || 0) + 1;
    }
  }

  return {
    ...currentState,
    board: newBoard,
    isNext: newIsNext,
    winner,
    scores: newScores,
  };
};

export const isGameOver = (gameState: TicTacToeGameState): boolean => {
  return gameState.winner !== null;
};

export const isTurnOf = (gameState: TicTacToeGameState, playerId: PlayerId): boolean => {
  return gameState.playerMap[playerId] === gameState.isNext;
};

export const getGameStatus = (gameState: TicTacToeGameState, players: Player[]): string => {
  const getPlayerBySymbol = (symbol: TicTacToeValue) => {
    const playerId = Object.keys(gameState.playerMap).find((id) => gameState.playerMap[id] === symbol);
    return players.find((p) => p.id === playerId);
  };

  if (gameState.winner) {
    if (gameState.winner === "draw") return "It's a Draw!";
    const winnerName = getPlayerBySymbol(gameState.winner)?.username || `Player ${gameState.winner}`;
    return `${winnerName} wins!`;
  }

  const nextPlayerName = getPlayerBySymbol(gameState.isNext)?.username || `Player ${gameState.isNext}`;
  const timer = gameState.options?.turnTimer;
  const timerText = timer && timer > 0 ? ` (${timer}s)` : "";
  return `${nextPlayerName}'s Turn${timerText}`;
};
