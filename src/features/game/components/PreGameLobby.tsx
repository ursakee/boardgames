import React, { useState, useEffect } from "react";
import { useGameStore } from "../../../store/gameStore";
import { Users, LogOut, Play, Copy, Check, RotateCcw, WifiOff, Loader } from "lucide-react";

interface PreGameLobbyProps {
  gameName: string;
  onLeaveGame: () => void;
}

const PreGameLobby: React.FC<PreGameLobbyProps> = ({ gameName, onLeaveGame }) => {
  const { playerSymbol, players, gamePhase, connectionState, setMyUsername, startGame, playAgain } = useGameStore();

  const localPlayer = players.find((p) => p.id === playerSymbol);
  const [username, setUsername] = useState(localPlayer?.username || "");
  const [isCopied, setIsCopied] = useState(false);

  const shareableLink = window.location.href;

  useEffect(() => {
    if (localPlayer) {
      setUsername(localPlayer.username);
    }
  }, [localPlayer]);

  const handleUpdateUsername = () => {
    if (username.trim()) {
      setMyUsername(username.trim());
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const isHost = playerSymbol === "X";

  const renderStatusMessage = () => {
    if (connectionState === "connecting") {
      return (
        <div className="flex items-center justify-center gap-2 text-center text-cyan-400 p-2">
          <Loader className="animate-spin" size={20} />
          <span>Connecting to peer...</span>
        </div>
      );
    }
    if (connectionState === "disconnected") {
      return (
        <div className="flex items-center justify-center gap-2 text-center text-red-400 p-2">
          <WifiOff size={20} />
          <span>Player disconnected.</span>
        </div>
      );
    }
    if (players.length < 2) {
      return <li className="text-center text-slate-400 p-2">Waiting for another player...</li>;
    }
    return null;
  };

  return (
    <div className="w-full max-w-lg p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      <h2 className="text-3xl font-bold text-center text-white capitalize">
        {gamePhase === "post-game" ? "Game Over" : `Lobby: ${gameName}`}
      </h2>

      <div className="p-3 bg-slate-900/50 rounded-md text-center">
        <p className="text-sm text-slate-400">Share Game Link</p>
        <div className="flex items-center justify-center gap-3 mt-1">
          <p className="font-mono text-lg text-cyan-400 break-all">{shareableLink}</p>
          <button onClick={handleCopyLink} className="p-1.5 text-slate-400 hover:text-white transition">
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
            onChange={(e) => setUsername(e.target.value)}
            onBlur={handleUpdateUsername}
            onKeyDown={(e) => e.key === "Enter" && handleUpdateUsername()}
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
          {renderStatusMessage()}
        </ul>
      </div>

      <div className="pt-4 border-t border-slate-700 space-y-3">
        {isHost && gamePhase === "lobby" && (
          <button
            onClick={startGame}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold text-black bg-green-400 rounded-md hover:bg-green-300 transition transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:scale-100"
            disabled={players.length < 2 || connectionState !== "connected"}
          >
            <Play size={20} /> Start Game
          </button>
        )}
        {isHost && gamePhase === "post-game" && (
          <button
            onClick={() => playAgain(gameName)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition transform hover:scale-105"
          >
            <RotateCcw size={20} /> Play Again
          </button>
        )}
        {!isHost && connectionState === "connected" && (
          <p className="text-center text-slate-400">
            {gamePhase === "post-game"
              ? "Waiting for the host to start a new game."
              : "Waiting for the host to start the game..."}
          </p>
        )}

        <button
          onClick={onLeaveGame}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-slate-300 bg-transparent rounded-md hover:bg-red-600/20 hover:text-red-400 transition"
        >
          <LogOut size={16} /> Leave Game
        </button>
      </div>
    </div>
  );
};

export default PreGameLobby;
