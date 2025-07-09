import type { GridState, BrainTrainPuzzle } from "../types";

/**
 * Validates the player's submitted grid state against the puzzle's solution.
 * This logic is ported from the original server-side `validate_solution.js`.
 * @param gridState The player's current grid state.
 * @param puzzle The original puzzle object containing the clues.
 * @returns `true` if the solution is correct, otherwise `false`.
 */
export function validateSolution(gridState: GridState, puzzle: BrainTrainPuzzle): boolean {
  const { grid, clues } = puzzle;
  const { rows, columns } = grid;
  const { rowClues, columnClues } = clues;

  let invalidPlacement = false;

  const rowTrainCounts = Array(rows).fill(0);
  const colTrainCounts = Array(columns).fill(0);

  // Validate train placements and count train cars
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const cellItems = gridState[row]?.[col];
      if (cellItems) {
        const hasTrain = cellItems.some((item) => item.isUserPlacedTrain || item.isFixedTrain);
        if (hasTrain) {
          // Check if there is a track in this cell
          const hasTrack = cellItems.some((item) => item.connections);
          if (!hasTrack) {
            invalidPlacement = true;
            break;
          }
          rowTrainCounts[row]++;
          colTrainCounts[col]++;
        }
      }
    }
    if (invalidPlacement) {
      break;
    }
  }

  if (invalidPlacement) {
    return false;
  }

  // Check row clues
  for (let row = 0; row < rows; row++) {
    if (rowTrainCounts[row] !== rowClues[row]) {
      return false;
    }
  }

  // Check column clues
  for (let col = 0; col < columns; col++) {
    if (colTrainCounts[col] !== columnClues[col]) {
      return false;
    }
  }

  return true;
}
