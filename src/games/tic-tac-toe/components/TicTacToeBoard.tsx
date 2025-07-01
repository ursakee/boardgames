import React from "react";
import type { GameBoardComponentProps } from "../../../types"; // Use "import type"
import type { TicTacToeGameState, TicTacToeValue } from "../types";

// The rest of the file is correct and does not need changes.
const TicTacToeBoard: React.FC<GameBoardComponentProps<TicTacToeGameState>> = ({
  gameId,
  playerSymbol,
  gameState,
  onMakeMove,
  onLeaveGame,
}) => {
  const handleSquareClick = (index: number) => {
    if (gameState.isNext === playerSymbol && !gameState.board[index] && !gameState.winner) {
      onMakeMove(index);
    }
  };

  return (
    <div className="w-full max-w-md p-6 space-y-4 bg-gray-800 rounded-lg shadow-lg text-center">
      <div className="p-3 bg-gray-900 rounded-md">
        <p className="text-sm text-gray-400">Game ID</p>
        <p className="font-mono text-lg text-cyan-400 break-all">{gameId}</p>
      </div>
      <div className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
        <p className="text-lg text-white">
          You are Player: <span className="font-bold text-2xl">{playerSymbol}</span>
        </p>
        <p
          className={`text-lg font-semibold px-3 py-1 rounded-md ${
            gameState.winner ? "bg-yellow-500 text-black" : "bg-gray-600 text-white"
          }`}
        >
          {gameState.status}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 bg-gray-900 p-3 rounded-md">
        {gameState.board.map((value: TicTacToeValue | null, index: number) => (
          <button
            key={index}
            onClick={() => handleSquareClick(index)}
            className={`w-24 h-24 flex items-center justify-center text-5xl font-bold rounded-md transition
              ${value === "X" ? "text-red-400" : "text-blue-400"}
              ${
                gameState.isNext === playerSymbol && !value && !gameState.winner
                  ? "cursor-pointer bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-800 cursor-not-allowed"
              }`}
            disabled={gameState.isNext !== playerSymbol || !!value || !!gameState.winner}
          >
            {value}
          </button>
        ))}
      </div>
      <button
        onClick={onLeaveGame}
        className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition"
      >
        Leave Game
      </button>
    </div>
  );
};

export default TicTacToeBoard;
