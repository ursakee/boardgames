import type { Player } from "../../../store/gameStore";
import type { PlayerId } from "../../../types";
import type {
  BrainTrainGameState,
  BrainTrainAction,
  Difficulty,
  PlayerState,
  GridState,
  GridCell,
  Position,
} from "../types";
import { generatePuzzle } from "./puzzleGenerator";
import { validateSolution } from "./solutionValidator";

export function getConnections(cell: Position, path: Position[]): string[] {
  const index = path.findIndex((p) => p.row === cell.row && p.col === cell.col);
  if (index === -1) return [];
  const connections: string[] = [];
  if (index > 0) {
    const prev = path[index - 1];
    if (prev.row < cell.row) connections.push("up");
    if (prev.row > cell.row) connections.push("down");
    if (prev.col < cell.col) connections.push("left");
    if (prev.col > cell.col) connections.push("right");
  }
  if (index < path.length - 1) {
    const next = path[index + 1];
    if (next.row < cell.row) connections.push("up");
    if (next.row > cell.row) connections.push("down");
    if (next.col < cell.col) connections.push("left");
    if (next.col > cell.col) connections.push("right");
  }
  return connections;
}

export function getTrackPath(connections: string[]): string {
  const key = [...connections].sort().join("-");
  switch (key) {
    case "down-up":
      return "M50,0 L50,100";
    case "left-right":
      return "M0,50 L100,50";
    case "down-left":
      return "M0,50 Q50,50 50,100";
    case "down-right":
      return "M100,50 Q50,50 50,100";
    case "left-up":
      return "M0,50 Q50,50 50,0";
    case "right-up":
      return "M100,50 Q50,50 50,0";
    case "up":
      return "M50,100 L50,0";
    case "down":
      return "M50,0 L50,100";
    case "left":
      return "M100,50 L0,50";
    case "right":
      return "M0,50 L100,50";

    default:
      return "";
  }
}

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
      submitted: false,
      submissionResult: null,
      submittedGrid: null,
    };
  });

  const solutionGrid: GridState = Array(puzzle.grid.rows)
    .fill(null)
    .map(() => Array(puzzle.grid.columns).fill(null));

  puzzle.tracks.forEach((track) => {
    track.path.forEach((cell) => {
      if (!solutionGrid[cell.row][cell.col]) {
        solutionGrid[cell.row][cell.col] = [];
      }
      (solutionGrid[cell.row][cell.col] as GridCell).push({
        trackId: track.trackId,
        color: track.color,
        connections: getConnections(cell, track.path),
      });
    });
  });

  puzzle.trains.forEach((train) => {
    train.carPositions.forEach((cell) => {
      const isFixed = train.trainId === fixedTrainForAllPlayers?.trainId;
      if (!solutionGrid[cell.row][cell.col]) {
        solutionGrid[cell.row][cell.col] = [];
      }
      (solutionGrid[cell.row][cell.col] as GridCell).push(
        isFixed ? { isFixedTrain: true } : { isUserPlacedTrain: true }
      );
    });
  });

  return {
    puzzle,
    playerStates,
    winner: null,
    options: { difficulty },
    solution: JSON.stringify(solutionGrid),
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

      const updatedPlayerState: PlayerState = {
        ...currentState.playerStates[action.playerId],
        submitted: true,
        submissionResult: isCorrect ? "correct" : "incorrect",
        submittedGrid: JSON.stringify(playerGridState),
      };

      const newPlayerStates = {
        ...currentState.playerStates,
        [action.playerId]: updatedPlayerState,
      };

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
