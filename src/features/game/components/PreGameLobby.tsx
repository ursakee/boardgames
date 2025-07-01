import React, { useState, useEffect } from "react";
import { useGameStore } from "../../../store/gameStore";
import { Users, LogOut, Play, Copy, Check, RotateCcw } from "lucide-react";

interface PreGameLobbyProps {
  gameName: string;
}

const PreGameLobby: React.FC<PreGameLobbyProps> = ({ gameName }) => {
  const {
    gameId,
    playerSymbol,
    players,
    gamePhase,
    setMyUsername, // Use the new dedicated action
    startGame,
    leaveGame,
    playAgain,
  } = useGameStore();

  const localPlayer = players.find((p) => p.id === playerSymbol);
  const [username, setUsername] = useState(localPlayer?.username || "");
  const [isCopied, setIsCopied] = useState(false);

  // Effect to update local username state if it changes from the server
  useEffect(() => {
    if (localPlayer) {
      setUsername(localPlayer.username);
    }
  }, [localPlayer]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  // This function is now simplified and calls the robust store action
  const handleUpdateUsername = () => {
    if (username.trim()) {
      setMyUsername(username.trim());
    }
  };

  const handleCopyId = () => {
    if (!gameId) return;
    navigator.clipboard.writeText(gameId).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleStartGame = () => {
    startGame();
  };

  const handlePlayAgain = () => {
    playAgain(gameName);
  };

  const isHost = playerSymbol === "X";

  return (
    <div className="w-full max-w-lg p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      <h2 className="text-3xl font-bold text-center text-white capitalize">
        {gamePhase === "post-game" ? "Game Over" : `Lobby: ${gameName}`}
      </h2>

      <div className="p-3 bg-slate-900/50 rounded-md text-center">
        <p className="text-sm text-slate-400">Game ID (Share with friends)</p>
        <div className="flex items-center justify-center gap-3 mt-1">
          <p className="font-mono text-lg text-cyan-400 break-all">{gameId}</p>
          <button onClick={handleCopyId} className="p-1.5 text-slate-400 hover:text-white transition">
            {isCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="username" className="font-semibold text-slate-300">
          Your Username
        </label>
        <div className="flex gap-2">
          <input
            id="username"
            type="text"
            value={username}
            onChange={handleUsernameChange}
            onBlur={handleUpdateUsername} // Update when input loses focus
            onKeyDown={(e) => e.key === "Enter" && handleUpdateUsername()} // Update on Enter key
            className="flex-grow px-3 py-2 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={handleUpdateUsername}
            className="px-4 py-2 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition"
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-300 flex items-center gap-2">
          <Users size={20} /> Players
        </h3>
        <ul className="space-y-2 p-3 bg-slate-900/50 rounded-md min-h-[80px]">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
              <span className="font-bold text-slate-100">{p.username}</span>
              <span className="text-sm font-mono px-2 py-1 bg-slate-600 text-cyan-300 rounded">
                {p.id === "X" ? "Host" : "Guest"}
              </span>
            </li>
          ))}
          {players.length < 2 && <li className="text-center text-slate-400 p-2">Waiting for another player...</li>}
        </ul>
      </div>

      <div className="pt-4 border-t border-slate-700 space-y-3">
        {isHost && gamePhase === "lobby" && (
          <button
            onClick={handleStartGame}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold text-black bg-green-400 rounded-md hover:bg-green-300 transition transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:scale-100"
            disabled={players.length < 2}
          >
            <Play size={20} /> Start Game
          </button>
        )}
        {isHost && gamePhase === "post-game" && (
          <button
            onClick={handlePlayAgain}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition transform hover:scale-105"
          >
            <RotateCcw size={20} /> Play Again
          </button>
        )}
        {!isHost && (
          <p className="text-center text-slate-400">
            {gamePhase === "post-game"
              ? "Waiting for the host to start a new game."
              : "Waiting for the host to start the game..."}
          </p>
        )}

        <button
          onClick={leaveGame}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-slate-300 bg-transparent rounded-md hover:bg-red-600/20 hover:text-red-400 transition"
        >
          <LogOut size={16} /> Leave Game
        </button>
      </div>
    </div>
  );
};

export default PreGameLobby;
