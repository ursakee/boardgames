import type { PlayerSymbol } from "../../../types"; // Import the generic PlayerSymbol
import type { TicTacToeGameState, TicTacToeValue } from "../types";

// Helper function to check if a symbol is a valid TicTacToeValue
function isValidTicTacToeValue(symbol: string): symbol is TicTacToeValue {
  return symbol === "X" || symbol === "O";
}

// The initial state for any new Tic-Tac-Toe game
export const getInitialState = (): TicTacToeGameState => ({
  board: Array(9).fill(null),
  isNext: "X",
  winner: null,
  status: "Waiting for player...",
});

// This function calculates the result of a move
export const calculateMove = (
  currentState: TicTacToeGameState,
  moveIndex: number,
  playerSymbol: PlayerSymbol // Accept the generic `string` type
): TicTacToeGameState => {
  // TYPE GUARD: Ensure the provided symbol is valid for this specific game's logic.
  // This makes the function compatible with the generic registry while keeping internal logic safe.
  if (!isValidTicTacToeValue(playerSymbol)) {
    return currentState; // Not a valid symbol for this game
  }

  // From this point on, TypeScript knows `playerSymbol` is "X" | "O"
  if (currentState.board[moveIndex] || currentState.winner || currentState.isNext !== playerSymbol) {
    return currentState; // Invalid move, return current state
  }

  const newBoard = [...currentState.board];
  newBoard[moveIndex] = playerSymbol;
  const newIsNext = playerSymbol === "X" ? "O" : "X";

  // --- The rest of the function remains the same ---
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

  let status = "";
  if (winner) {
    status = winner === "draw" ? "It's a Draw!" : `Winner is ${winner}!`;
  } else {
    status = `Next player: ${newIsNext}`;
  }

  return {
    board: newBoard,
    isNext: newIsNext,
    winner,
    status,
  };
};
