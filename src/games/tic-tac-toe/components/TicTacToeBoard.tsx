import React from "react";
import type { GameBoardComponentProps } from "../../../types";
import type { TicTacToeGameState } from "../types";
import { useGameStore } from "../../../store/gameStore";
import { LogOut } from "lucide-react";

const TicTacToeBoard: React.FC<Omit<GameBoardComponentProps<TicTacToeGameState>, "gameId">> = ({
  gameState,
  statusMessage,
  isGameOver,
  isMyTurn,
  onPerformAction, // MODIFIED
  onLeaveGame,
}) => {
  const { gameId, playerId, players } = useGameStore();

  const handleSquareClick = (index: number) => {
    if (isMyTurn && !gameState.board[index] && !isGameOver) {
      // Dispatch a structured action instead of just the move
      onPerformAction({ type: "MAKE_MOVE", payload: index });
    }
  };

  const localPlayer = players.find((p) => p.id === playerId);
  const localPlayerSymbol = localPlayer ? gameState.playerMap[localPlayer.id] : null;

  return (
    <div className="w-full max-w-md p-6 space-y-4 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      <div className="p-3 bg-slate-900/50 rounded-md text-center">
        <p className="text-sm text-slate-400">Game ID</p>
        <p className="font-mono text-lg text-cyan-400 break-all">{gameId}</p>
      </div>
      <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-md">
        <p className="text-lg text-white">
          You are:
          <span className="font-bold text-2xl">
            {localPlayer?.username} ({localPlayerSymbol})
          </span>
        </p>
        <p
          className={`text-lg font-semibold px-3 py-1 rounded-md ${
            isGameOver ? "bg-yellow-500 text-black" : "bg-slate-600 text-white"
          }`}
        >
          {statusMessage}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 bg-slate-900/50 p-3 rounded-md aspect-square">
        {gameState.board.map((value, index) => (
          <button
            key={index}
            onClick={() => handleSquareClick(index)}
            className={`w-full h-full flex items-center justify-center text-6xl font-bold rounded-md transition duration-150
              ${value === "X" ? "text-red-400" : "text-blue-400"}
              ${
                isMyTurn && !value && !isGameOver
                  ? "cursor-pointer bg-slate-700 hover:bg-slate-600"
                  : "bg-slate-800 cursor-not-allowed"
              }`}
            disabled={!isMyTurn || !!value || isGameOver}
          >
            {value || "\u00A0"}
          </button>
        ))}
      </div>
      <button
        onClick={onLeaveGame}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-slate-300 bg-transparent rounded-md hover:bg-red-600/20 hover:text-red-400 transition"
      >
        <LogOut size={16} />
        Leave Game
      </button>
    </div>
  );
};

export default TicTacToeBoard;
