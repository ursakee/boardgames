import type { Player } from "../../../store/gameStore";
import type { PlayerId } from "../../../types";
import type { BrainTrainGameState, BrainTrainAction, Difficulty, PlayerState } from "../types";
import { generatePuzzle } from "./puzzleGenerator";
import { validateSolution } from "./solutionValidator";

export const getInitialState = (
  playerIds: PlayerId[],
  _currentState: BrainTrainGameState | undefined,
  options?: Record<string, any>
): BrainTrainGameState => {
  const difficulty = (options?.difficulty as Difficulty) || "easy";
  const puzzle = generatePuzzle(difficulty);

  const fixedTrainForAllPlayers = puzzle.trains[0];

  const playerStates: Record<PlayerId, PlayerState> = {};
  playerIds.forEach((playerId) => {
    playerStates[playerId] = {
      id: playerId,
      fixedTrainId: fixedTrainForAllPlayers?.trainId ?? null,
      gridState: null,
      submitted: false,
      submissionResult: null,
    };
  });

  return {
    puzzle,
    playerStates,
    winner: null,
    options: { difficulty },
  };
};

export const handleAction = (currentState: BrainTrainGameState, action: BrainTrainAction): BrainTrainGameState => {
  switch (action.type) {
    case "RETURN_TO_LOBBY": {
      const playerIds = Object.keys(currentState.playerStates);
      return getInitialState(playerIds, currentState, currentState.options);
    }

    case "SUBMIT_SOLUTION": {
      if (currentState.winner || currentState.playerStates[action.playerId]?.submitted) {
        return currentState;
      }

      const playerGridState = action.payload;
      const isCorrect = validateSolution(playerGridState, currentState.puzzle);

      const newPlayerStates = JSON.parse(JSON.stringify(currentState.playerStates));
      const playerState = newPlayerStates[action.playerId];
      playerState.submitted = true;
      playerState.submissionResult = isCorrect ? "correct" : "incorrect";

      let winner: BrainTrainGameState["winner"] = currentState.winner;
      if (isCorrect) {
        winner = action.playerId;
      }

      return {
        ...currentState,
        playerStates: newPlayerStates,
        winner,
      };
    }

    default:
      return currentState;
  }
};

export const isGameOver = (gameState: BrainTrainGameState): boolean => {
  return gameState.winner !== null || Object.values(gameState.playerStates).every((p) => p.submitted);
};

export const isTurnOf = (gameState: BrainTrainGameState, playerId: PlayerId): boolean => {
  return !isGameOver(gameState) && !gameState.playerStates[playerId]?.submitted;
};

export const getGameStatus = (gameState: BrainTrainGameState, players: Player[]): string => {
  if (gameState.winner) {
    const winnerPlayer = players.find((p) => p.id === gameState.winner);
    return `${winnerPlayer?.username || "A player"} wins!`;
  }
  if (isGameOver(gameState) && !gameState.winner) {
    return "All solutions were incorrect. It's a draw!";
  }
  return "Solve the puzzle!";
};
