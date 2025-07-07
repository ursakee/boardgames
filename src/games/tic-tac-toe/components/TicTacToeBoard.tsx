// ..\src/games/tic-tac-toe/components/TicTacToeBoard.tsx

import React from "react";
import type { GameBoardComponentProps } from "../../../types";
import type { TicTacToeGameState } from "../types";
import { useGameStore } from "../../../store/gameStore";
import { LogOut, Circle, XIcon } from "lucide-react";

const TicTacToeBoard: React.FC<GameBoardComponentProps<TicTacToeGameState>> = ({
  gameState,
  statusMessage,
  isGameOver,
  isMyTurn,
  onPerformAction,
  onLeaveGame,
}) => {
  const players = useGameStore((state) => state.players);

  const handleSquareClick = (index: number) => {
    if (isMyTurn && !gameState.board[index] && !isGameOver) {
      onPerformAction({ type: "MAKE_MOVE", payload: index });
    }
  };

  const getPlayerBySymbol = (symbol: "X" | "O") => {
    const playerId = Object.keys(gameState.playerMap).find((id) => gameState.playerMap[id] === symbol);
    return players.find((p) => p.id === playerId);
  };

  const playerX = getPlayerBySymbol("X");
  const playerO = getPlayerBySymbol("O");

  const renderSymbol = (value: "X" | "O" | null) => {
    if (value === "X") return <XIcon size={64} className="text-red-400" />;
    if (value === "O") return <Circle size={56} className="text-blue-400" />;
    return null; // Return null instead of a space
  };

  return (
    <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center lg:items-start gap-8 p-4">
      {/* Player O Card */}
      <div
        className={`p-4 w-full lg:w-48 rounded-lg transition-all duration-300 ${
          gameState.isNext === "O" && !isGameOver ? "bg-blue-500/20 ring-2 ring-blue-500" : "bg-slate-800"
        }`}
      >
        <div className="flex lg:flex-col items-center gap-3">
          <Circle
            className={`w-8 h-8 ${gameState.isNext === "O" && !isGameOver ? "text-blue-400" : "text-slate-500"}`}
          />
          <div className="flex-1 text-left lg:text-center">
            <p className="font-bold text-lg text-slate-100">{playerO?.username || "Player O"}</p>
            <p className="text-sm text-slate-400">Score: {gameState.scores[playerO?.id || ""] || 0}</p>
          </div>
        </div>
      </div>

      {/* Game Board & Status */}
      <div className="w-full max-w-md flex-shrink-0">
        <div className="w-full p-4 space-y-4 bg-slate-800/50 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
          <div className="p-3 bg-slate-900/50 rounded-md text-center">
            <p
              className={`text-lg font-semibold px-3 py-1 rounded-md transition-colors duration-300 ${
                isGameOver ? "text-yellow-400" : "text-slate-200"
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
                className={`w-full h-full flex items-center justify-center rounded-md transition duration-150 ease-in-out transform focus:outline-none
         ${
           isMyTurn && !value && !isGameOver
             ? "cursor-pointer bg-slate-700 hover:bg-slate-600"
             : "bg-slate-800 cursor-not-allowed"
         }`}
                disabled={!isMyTurn || !!value || isGameOver}
              >
                {/* This fixed-size div prevents the button from resizing */}
                <div className="w-16 h-16 flex items-center justify-center">{renderSymbol(value)}</div>
              </button>
            ))}
          </div>
          <button
            onClick={onLeaveGame}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-slate-400 bg-transparent rounded-md hover:bg-red-600/20 hover:text-red-400 transition"
          >
            <LogOut size={16} />
            Leave Game
          </button>
        </div>
      </div>

      {/* Player X Card */}
      <div
        className={`p-4 w-full lg:w-48 rounded-lg transition-all duration-300 ${
          gameState.isNext === "X" && !isGameOver ? "bg-red-500/20 ring-2 ring-red-500" : "bg-slate-800"
        }`}
      >
        <div className="flex lg:flex-col items-center gap-3">
          <XIcon className={`w-8 h-8 ${gameState.isNext === "X" && !isGameOver ? "text-red-400" : "text-slate-500"}`} />
          <div className="flex-1 text-left lg:text-center">
            <p className="font-bold text-lg text-slate-100">{playerX?.username || "Player X"}</p>
            <p className="text-sm text-slate-400">Score: {gameState.scores[playerX?.id || ""] || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicTacToeBoard;
