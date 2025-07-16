import React, { memo } from "react";
import type { BrainTrainPuzzle, GridState, GridCell } from "../types";
import { X } from "lucide-react";
import { getTrackPath } from "../logic";

interface PuzzleGridProps {
  puzzle: BrainTrainPuzzle;
  gridState: GridState;
  setGridState: React.Dispatch<React.SetStateAction<GridState | null>>;
  fixedTrainId: number | null;
  isInteractable: boolean;
}

const MemoizedPuzzleGrid: React.FC<PuzzleGridProps> = ({ puzzle, gridState, setGridState, isInteractable }) => {
  const { clues } = puzzle;

  const handleLeftClick = (row: number, col: number) => {
    if (!isInteractable) return;
    setGridState((prev) => {
      if (!prev) return null;
      const newGrid = prev.map((r) => [...r.map((cell) => (cell ? [...cell] : null))]);
      const cellData = (newGrid[row][col] || []) as GridCell;
      if (cellData.some((item) => item.isFixedTrain) || !cellData.some((item) => item.trackId)) return prev;

      const trainIndex = cellData.findIndex((item) => item.isUserPlacedTrain);
      if (trainIndex > -1) {
        cellData.splice(trainIndex, 1);
      } else {
        cellData.push({ isUserPlacedTrain: true });
      }
      newGrid[row][col] = cellData;
      return newGrid;
    });
  };

  const handleRightClick = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (!isInteractable) return;
    setGridState((prev) => {
      if (!prev) return null;
      const newGrid = prev.map((r) => [...r.map((cell) => (cell ? [...cell] : null))]);
      const cellData = (newGrid[row][col] || []) as GridCell;
      if (cellData.some((item) => item.isFixedTrain)) return prev;

      const markedIndex = cellData.findIndex((item) => item.isMarked);
      if (markedIndex > -1) {
        cellData.splice(markedIndex, 1);
      } else {
        cellData.push({ isMarked: true });
      }
      newGrid[row][col] = cellData;
      return newGrid;
    });
  };

  return (
    <div className="bg-slate-900/50 p-3 rounded-lg select-none">
      <table className="border-collapse mx-auto">
        <thead>
          <tr>
            <th></th>
            {clues.columnClues.map((clue, i) => (
              <th key={i} className="text-2xl font-bold text-slate-300 text-center align-middle pb-1">
                {clue}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gridState.map((row, r) => (
            <tr key={r}>
              <td className="text-2xl font-bold text-slate-300 text-right pr-2">{clues.rowClues[r]}</td>
              {row.map((cell, c) => (
                <td
                  key={c}
                  onClick={() => handleLeftClick(r, c)}
                  onContextMenu={(e) => handleRightClick(e, r, c)}
                  className="w-16 h-16 bg-slate-700 border-2 border-slate-600 relative"
                  style={{ cursor: isInteractable ? "pointer" : "not-allowed" }}
                >
                  {renderCellContent(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function renderCellContent(cell: GridCell | null) {
  if (!cell) return null;
  const trackItems = cell.filter((item) => item.connections);
  const hasFixedTrain = cell.some((item) => item.isFixedTrain);
  const hasUserTrain = cell.some((item) => item.isUserPlacedTrain);
  const isMarked = cell.some((item) => item.isMarked);

  return (
    <>
      {trackItems.map((item, index) => (
        <svg key={index} viewBox="0 0 100 100" className="absolute w-full h-full top-0 left-0">
          <path
            d={getTrackPath(item.connections!)}
            stroke={item.color}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      ))}
      {(hasFixedTrain || hasUserTrain) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-3/5 h-3/5 ${hasFixedTrain ? "bg-slate-500" : "bg-slate-100"} rounded-sm`}></div>
        </div>
      )}
      {isMarked && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400">
          <X size={50} strokeWidth={3} />
        </div>
      )}
    </>
  );
}

export const PuzzleGrid = memo(MemoizedPuzzleGrid);
