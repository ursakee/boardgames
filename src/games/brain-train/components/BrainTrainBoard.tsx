import React, { useState, useEffect, useMemo } from "react";
import type { GameBoardComponentProps } from "../../../types";
import type { BrainTrainGameState, GridState, BrainTrainAction, GridCell } from "../types";
import { PuzzleGrid } from "./PuzzleGrid";
import { TrainCars } from "./TrainCars";
import { Loader, Play, Home, Settings, XCircle, Eye } from "lucide-react";
import { useGameSession } from "../../../hooks/useGameSession";
import MistakesViewer from "./MistakesViewer";
import { getConnections } from "../logic";

type BrainTrainBoardProps = GameBoardComponentProps<BrainTrainGameState, BrainTrainAction>;

const BrainTrainBoard: React.FC<BrainTrainBoardProps> = ({ gameState, isGameOver, onPerformAction, onLeaveGame }) => {
  const { localPlayer, isHost, startGame, gameOptions, setGameOptions, gameInfo, returnToLobby } = useGameSession();

  const { puzzle, playerStates, winner } = gameState;
  const localPlayerState = localPlayer ? playerStates[localPlayer.id] : null;

  const [gridState, setGridState] = useState<GridState | null>(null);
  const [showMistakes, setShowMistakes] = useState(false);

  const puzzleKey = useMemo(() => {
    if (!puzzle) return null;
    return JSON.stringify(puzzle.tracks);
  }, [puzzle]);

  useEffect(() => {
    setShowMistakes(false);
    if (puzzle && localPlayerState) {
      const newGridState: GridState = Array(puzzle.grid.rows)
        .fill(null)
        .map(() => Array(puzzle.grid.columns).fill(null));

      puzzle.tracks.forEach((track) => {
        track.path.forEach((cell) => {
          if (!newGridState[cell.row][cell.col]) newGridState[cell.row][cell.col] = [];
          (newGridState[cell.row][cell.col] as GridCell).push({
            trackId: track.trackId,
            color: track.color,
            connections: getConnections(cell, track.path),
          });
        });
      });

      const fixedTrain = puzzle.trains.find((train) => train.trainId === localPlayerState.fixedTrainId);
      if (fixedTrain) {
        fixedTrain.carPositions.forEach((cell) => {
          if (!newGridState[cell.row][cell.col]) newGridState[cell.row][cell.col] = [];
          (newGridState[cell.row][cell.col] as GridCell).push({ isFixedTrain: true });
        });
      }
      setGridState(newGridState);
    }
  }, [puzzleKey, localPlayerState?.fixedTrainId]);

  const handleSubmit = () => {
    if (gridState && !localPlayerState?.submitted) {
      onPerformAction({ type: "SUBMIT_SOLUTION", payload: gridState });
    }
  };

  if (showMistakes && localPlayerState?.submittedGrid && gameState.solution) {
    return (
      <MistakesViewer
        puzzle={puzzle}
        playerGrid={JSON.parse(localPlayerState.submittedGrid)}
        solutionGrid={JSON.parse(gameState.solution)}
        onClose={() => setShowMistakes(false)}
      />
    );
  }

  if (!puzzle || !gridState || !localPlayerState || !localPlayer) {
    return <Loader className="animate-spin h-12 w-12 text-cyan-400" />;
  }

  const getResult = () => {
    if (!isGameOver) return { message: "", color: "" };
    if (winner === localPlayer.id) return { message: "You Win!", color: "text-green-400" };
    if (winner) return { message: "You Lose!", color: "text-red-400" };
    return { message: "It's a Draw!", color: "text-slate-300" };
  };

  const { message, color } = getResult();
  const wasIncorrect = localPlayerState.submissionResult === "incorrect" && !isGameOver;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center">
      <div className="flex flex-col md:flex-row items-center gap-8 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 relative">
        {wasIncorrect && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
            <XCircle className="h-20 w-20 text-yellow-400 mb-4" />
            <h2 className="text-4xl font-bold text-yellow-400">Incorrect Solution</h2>
            <p className="mt-2 text-slate-300">Waiting for other players to finish...</p>
            <button
              onClick={() => setShowMistakes(true)}
              className="mt-6 flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-slate-100 bg-slate-600/80 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <Eye size={18} /> See Mistakes
            </button>
          </div>
        )}

        <div className="w-full md:w-56 p-4 bg-slate-800 rounded-xl space-y-4 self-stretch flex flex-col">
          <h3 className="text-xl font-bold text-center text-slate-200 border-b border-slate-600 pb-2">
            Available Trains
          </h3>

          <div className="flex-grow">
            <TrainCars tracks={puzzle.tracks} trains={puzzle.trains} fixedTrainId={localPlayerState.fixedTrainId} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isGameOver || localPlayerState.submitted}
            className="w-full px-4 py-2 font-bold text-slate-900 bg-green-500 rounded-lg hover:bg-green-400 transition disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            Submit Solution
          </button>

          <button
            onClick={onLeaveGame}
            className="w-full px-4 py-2 font-semibold text-slate-300 bg-red-800/50 rounded-lg hover:bg-red-700/80"
          >
            Leave Game
          </button>
        </div>

        <div className="flex-grow flex items-center justify-center">
          <PuzzleGrid
            puzzle={puzzle}
            gridState={gridState}
            setGridState={setGridState}
            fixedTrainId={localPlayerState.fixedTrainId}
            isInteractable={!isGameOver && !localPlayerState.submitted}
          />
        </div>
      </div>

      {isGameOver && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300 animate-in fade-in">
          <div className="text-center p-6 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className={`text-6xl font-black ${color}`}>{message}</h2>
            {localPlayerState.submissionResult === "incorrect" && (
              <button
                onClick={() => setShowMistakes(true)}
                className="mt-6 flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-slate-100 bg-slate-600/80 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <Eye size={18} /> Review Mistakes
              </button>
            )}

            {isHost && (
              <div className="mt-8 flex flex-col items-center gap-4 w-64 mx-auto">
                {/* --- Difficulty Dropdown --- */}
                <div className="w-full">
                  <label className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 mb-2">
                    <Settings size={16} /> Difficulty
                  </label>

                  <select
                    value={gameOptions.difficulty}
                    onChange={(e) => setGameOptions({ difficulty: e.target.value })}
                    className="w-full px-3 py-2 text-center text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {gameInfo?.gameOptions
                      ?.find((opt) => opt.id === "difficulty")
                      ?.choices?.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                  </select>
                </div>
                {/* --- Play Again Button --- */}
                <button
                  onClick={startGame}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold text-slate-900 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors"
                >
                  <Play size={20} /> Play Again
                </button>
                {/* --- Back to Lobby Button --- */}
                <button
                  onClick={returnToLobby}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2 font-semibold text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Home size={18} /> Back to Lobby
                </button>
              </div>
            )}
            {!isHost && <p className="mt-8 text-slate-300">Waiting for host to start the next game...</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrainTrainBoard;
