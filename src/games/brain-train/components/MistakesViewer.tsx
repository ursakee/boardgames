import React from "react";
import type { BrainTrainPuzzle, GridState, GridCell } from "../types";
import { ArrowLeft, X, XCircle, CircleQuestionMark } from "lucide-react";
import { getTrackPath } from "../logic";

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
          <X size={30} strokeWidth={3} />
        </div>
      )}
    </>
  );
}

interface GridDisplayProps {
  title: string;
  puzzle: BrainTrainPuzzle;
  gridState: GridState;
  comparisonGrid?: GridState;
}

const GridDisplay: React.FC<GridDisplayProps> = ({ title, puzzle, gridState, comparisonGrid }) => {
  const { clues } = puzzle;
  const checkMistake = (r: number, c: number): "correct" | "missed" | "extra" => {
    if (!comparisonGrid) return "correct";

    const playerHasTrain = gridState[r]?.[c]?.some((item) => item.isUserPlacedTrain || item.isFixedTrain) ?? false;
    const solutionHasTrain =
      comparisonGrid[r]?.[c]?.some((item) => item.isUserPlacedTrain || item.isFixedTrain) ?? false;

    if (playerHasTrain && !solutionHasTrain) return "extra";
    if (!playerHasTrain && solutionHasTrain) return "missed";
    return "correct";
  };

  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold text-slate-200 mb-3">{title}</h3>
      <div className="bg-slate-900/50 p-2 rounded-lg select-none">
        <table className="border-collapse mx-auto">
          <thead>
            <tr>
              <th></th>
              {clues.columnClues.map((clue, i) => (
                <th key={i} className="text-lg font-bold text-slate-300 text-center align-middle pb-1 h-8 w-8">
                  {clue}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {gridState.map((row, r) => (
              <tr key={r}>
                <td className="text-lg font-bold text-slate-300 text-right pr-2 h-8 w-8">{clues.rowClues[r]}</td>

                {row.map((cell, c) => {
                  const mistakeType = checkMistake(r, c);
                  return (
                    <td key={c} className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 border-2 border-slate-600 relative">
                      {renderCellContent(cell)}
                      {mistakeType === "extra" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/40">
                          <XCircle className="text-red-300" size={24} />
                        </div>
                      )}

                      {mistakeType === "missed" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/30">
                          <CircleQuestionMark className="text-yellow-200" size={24} />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface MistakesViewerProps {
  puzzle: BrainTrainPuzzle;
  playerGrid: GridState;
  solutionGrid: GridState;
  onClose: () => void;
}

const MistakesViewer: React.FC<MistakesViewerProps> = ({ puzzle, playerGrid, solutionGrid, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 animate-in fade-in">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold text-yellow-400">Review Solution</h2>
        <p className="text-slate-400 mt-2">Compare your submission with the correct solution.</p>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <XCircle className="text-red-300" size={18} /> Incorrect Placement
          </div>

          <div className="flex items-center gap-2">
            <CircleQuestionMark className="text-yellow-300" size={18} /> Missed Placement
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-10">
        <GridDisplay title="Your Submission" puzzle={puzzle} gridState={playerGrid} comparisonGrid={solutionGrid} />
        <GridDisplay title="Correct Solution" puzzle={puzzle} gridState={solutionGrid} />
      </div>

      <button
        onClick={onClose}
        className="mt-8 flex items-center justify-center gap-2 px-6 py-3 font-semibold text-slate-100 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors"
      >
        <ArrowLeft size={20} /> Go Back
      </button>
    </div>
  );
};

export default MistakesViewer;
