import type { Player } from "../../../store/gameStore";
import type { GameAction, PlayerId } from "../../../types";
import type { BrainTrainGameState, Difficulty, GridState, PlayerState } from "../types";
import { generatePuzzle } from "./puzzleGenerator";
import { validateSolution } from "./solutionValidator";

export const getInitialState = (
  playerIds: PlayerId[],
  _currentState: BrainTrainGameState | undefined,
  options?: Record<string, any>
): BrainTrainGameState => {
  // Safely access difficulty with a fallback, matching the generic interface.
  const difficulty = (options?.difficulty as Difficulty) || "easy";
  const puzzle = generatePuzzle(difficulty);

  const fixedTrainForAllPlayers = puzzle.trains[0];

  const playerStates: Record<PlayerId, PlayerState> = {};
  playerIds.forEach((playerId, _) => {
    playerStates[playerId] = {
      id: playerId,
      fixedTrainId: fixedTrainForAllPlayers?.trainId ?? null,
      gridState: null,
      submitted: false,
    };
  });

  return {
    puzzle,
    playerStates,
    winner: null,
    options: { difficulty },
  };
};

export const handleAction = (currentState: BrainTrainGameState, action: GameAction): BrainTrainGameState => {
  if (action.type === "RETURN_TO_LOBBY") {
    const playerIds = Object.keys(currentState.playerStates);
    return getInitialState(playerIds, currentState, currentState.options);
  }

  if (action.type !== "SUBMIT_SOLUTION") {
    return currentState;
  }
  if (currentState.winner || currentState.playerStates[action.playerId]?.submitted) {
    return currentState;
  }

  const playerGridState = action.payload as GridState;
  const isCorrect = validateSolution(playerGridState, currentState.puzzle);

  const newPlayerStates = JSON.parse(JSON.stringify(currentState.playerStates));
  newPlayerStates[action.playerId] = {
    ...newPlayerStates[action.playerId],
    submitted: true,
  };

  let winner: BrainTrainGameState["winner"] = currentState.winner;

  if (isCorrect) {
    winner = action.playerId;
  } else {
    const playerIds = Object.keys(currentState.playerStates);
    if (playerIds.length <= 2) {
      winner = playerIds.find((id) => id !== action.playerId)!;
    } else {
      winner = "incorrect";
    }
  }

  return {
    ...currentState,
    playerStates: newPlayerStates,
    winner,
  };
};

export const isGameOver = (gameState: BrainTrainGameState): boolean => {
  return gameState.winner !== null;
};

export const isTurnOf = (gameState: BrainTrainGameState, playerId: PlayerId): boolean => {
  return !gameState.playerStates[playerId]?.submitted && !gameState.winner;
};

export const getGameStatus = (gameState: BrainTrainGameState, players: Player[]): string => {
  if (gameState.winner) {
    if (gameState.winner === "incorrect") {
      return "Incorrect Submission! Game Over.";
    }
    const winnerPlayer = players.find((p) => p.id === gameState.winner);
    return `${winnerPlayer?.username || "A player"} wins!`;
  }
  return "Solve the puzzle!";
};
