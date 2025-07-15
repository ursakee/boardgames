import React from "react";
import type { GameBoardComponentProps } from "../../../types";
import type { TicTacToeGameState, TicTacToeAction } from "../types";
import { useGameStore } from "../../../store/gameStore";
import { LogOut, Circle, XIcon } from "lucide-react";

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface TicTacToeBoardProps extends GameBoardComponentProps<TicTacToeGameState, TicTacToeAction> {
  turnTimeLeft?: number | null;
}

const PlayerCard: React.FC<{
  symbol: "X" | "O";
  isNext: boolean;
  isGameOver: boolean;
  timeleft: number | null | undefined;
  totalTime: number;
}> = ({ symbol, isNext, isGameOver, timeleft, totalTime }) => {
  const players = useGameStore((state) => state.players);
  const gameState = useGameStore((state) => state.gameState as TicTacToeGameState);

  const getPlayerBySymbol = (s: "X" | "O") => {
    const playerId = Object.keys(gameState.playerMap).find((id) => gameState.playerMap[id] === s);
    return players.find((p) => p.id === playerId);
  };

  const player = getPlayerBySymbol(symbol);
  const isActive = isNext && !isGameOver;
  const progress =
    timeleft !== null && timeleft !== undefined && totalTime > 0
      ? (timeleft / totalTime) * CIRCUMFERENCE
      : CIRCUMFERENCE;

  const symbolColor = symbol === "X" ? "text-red-400" : "text-blue-400";
  const ringColor = symbol === "X" ? "ring-red-500" : "ring-blue-500";
  const bgColor = symbol === "X" ? "bg-red-500/20" : "bg-blue-500/20";
  const timerColor = symbol === "X" ? "stroke-red-400" : "stroke-blue-400";

  return (
    <div
      className={`p-4 w-full lg:w-48 rounded-lg transition-all duration-300 transform ${
        isActive ? `${bgColor} ${ringColor} ring-2 scale-105 shadow-lg` : "bg-slate-800"
      }`}
    >
      <div className="flex lg:flex-col items-center gap-4">
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Timer Circle */}
          {isActive && timeleft !== null && timeleft !== undefined && (
            <svg className="absolute w-full h-full" viewBox="0 0 100 100">
              {/* Background */}
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                className="stroke-current text-slate-700/50"
                strokeWidth="4"
                fill="transparent"
              />
              {/* Progress */}
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                className={`${timerColor} transition-all duration-500`}
                strokeWidth="5"
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={progress}
                transform="rotate(-90 50 50)"
              />
            </svg>
          )}
          {/* Player Symbol */}
          <div className="absolute">
            {symbol === "X" ? (
              <XIcon size={64} className={`${isActive ? symbolColor : "text-slate-600"}`} />
            ) : (
              <Circle size={56} className={`${isActive ? symbolColor : "text-slate-600"}`} />
            )}
          </div>
          {/* Countdown Text */}
          {isActive && timeleft !== null && timeleft !== undefined && (
            <span className="absolute text-2xl font-mono font-bold text-slate-200">{timeleft}</span>
          )}
        </div>

        <div className="flex-1 text-left lg:text-center">
          <p className="font-bold text-lg text-slate-100">{player?.username || `Player ${symbol}`}</p>
          <p className="text-sm text-slate-400">Score: {gameState.scores[player?.id || ""] || 0}</p>
        </div>
      </div>
    </div>
  );
};

const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({
  gameState,
  statusMessage,
  isGameOver,
  isMyTurn,
  turnTimeLeft,
  onPerformAction,
  onLeaveGame,
}) => {
  const handleSquareClick = (index: number) => {
    if (isMyTurn && !gameState.board[index] && !isGameOver) {
      onPerformAction({ type: "MAKE_MOVE", payload: index });
    }
  };

  const timerDuration = gameState.options.turnTimer;
  const renderSymbol = (value: "X" | "O" | null) => {
    if (value === "X") return <XIcon size={64} className="text-red-400" />;
    if (value === "O") return <Circle size={56} className="text-blue-400" />;
    return null;
  };

  return (
    <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center lg:items-start gap-8 p-4">
      {/* Player O Card */}
      <PlayerCard
        symbol="O"
        isNext={gameState.isNext === "O"}
        isGameOver={isGameOver}
        timeleft={turnTimeLeft}
        totalTime={timerDuration}
      />

      {/* Game Board & Status */}
      <div className="w-full max-w-md flex-shrink-0">
        <div className="w-full p-4 space-y-4 bg-slate-800/50 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
          {/* Status Display - now only shows on game over */}
          <div className="h-12 flex items-center justify-center p-3 bg-slate-900/50 rounded-md text-center">
            {isGameOver && (
              <p
                className={`text-lg font-semibold px-3 py-1 rounded-md transition-colors duration-300 animate-in fade-in text-yellow-400`}
              >
                {statusMessage}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-900/50 p-3 rounded-md aspect-square">
            {gameState.board.map((value, index) => (
              <button
                key={index}
                onClick={() => handleSquareClick(index)}
                className={`w-full h-full flex items-center justify-center rounded-md transition duration-150 ease-in-out transform focus:outline-none ${
                  isMyTurn && !value && !isGameOver
                    ? "cursor-pointer bg-slate-700 hover:bg-slate-600"
                    : "bg-slate-800 cursor-not-allowed"
                }`}
                disabled={!isMyTurn || !!value || isGameOver}
              >
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
      <PlayerCard
        symbol="X"
        isNext={gameState.isNext === "X"}
        isGameOver={isGameOver}
        timeleft={turnTimeLeft}
        totalTime={timerDuration}
      />
    </div>
  );
};

export default TicTacToeBoard;
