import type { Player } from "../../../store/gameStore";
import type { PlayerSymbol } from "../../../types";
import type { TicTacToeGameState, TicTacToeValue } from "../types";

function isValidTicTacToeValue(symbol: string): symbol is TicTacToeValue {
  return symbol === "X" || symbol === "O";
}

export const getInitialState = (): TicTacToeGameState => ({
  board: Array(9).fill(null),
  isNext: "X",
  winner: null,
});

export const calculateMove = (
  currentState: TicTacToeGameState,
  moveIndex: number,
  playerSymbol: PlayerSymbol
): TicTacToeGameState => {
  if (!isValidTicTacToeValue(playerSymbol)) {
    return currentState;
  }

  if (currentState.board[moveIndex] || currentState.winner || currentState.isNext !== playerSymbol) {
    return currentState;
  }

  const newBoard = [...currentState.board];
  newBoard[moveIndex] = playerSymbol;
  const newIsNext = playerSymbol === "X" ? "O" : "X";

  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // columns
    [0, 4, 8],
    [2, 4, 6], // diagonals
  ];

  let winner: TicTacToeValue | "draw" | null = null;
  for (const line of lines) {
    const [a, b, c] = line;
    if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
      winner = newBoard[a];
      break;
    }
  }

  if (!winner && newBoard.every(Boolean)) {
    winner = "draw";
  }

  return {
    board: newBoard,
    isNext: newIsNext,
    winner,
  };
};

// NEW: Required by the GameRegistryEntry contract
export const isGameOver = (gameState: TicTacToeGameState): boolean => {
  return gameState.winner !== null;
};

// NEW: Required by the GameRegistryEntry contract
export const getGameStatus = (gameState: TicTacToeGameState, players: Player[]): string => {
  const getPlayerName = (symbol: TicTacToeValue) => {
    return players.find((p) => p.id === symbol)?.username || `Player ${symbol}`;
  };

  if (gameState.winner) {
    return gameState.winner === "draw" ? "It's a Draw!" : `${getPlayerName(gameState.winner)} wins!`;
  }
  return `${getPlayerName(gameState.isNext)}'s Turn`;
};
