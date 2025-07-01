import React, { useState } from "react";
import { PlusCircle, LogIn } from "lucide-react";

interface GameLobbyProps {
  gameName: string;
  onCreateGame: () => void;
  onJoinGame: (id: string) => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({ gameName, onCreateGame, onJoinGame }) => {
  const [joinId, setJoinId] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      onJoinGame(joinId.trim());
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      <h2 className="text-3xl font-bold text-center text-white capitalize">{gameName}</h2>
      <button
        onClick={onCreateGame}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 transition-all transform hover:scale-105"
      >
        <PlusCircle size={24} />
        Create New Game
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-600" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-800 px-2 text-slate-400">OR</span>
        </div>
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <input
          type="text"
          placeholder="Enter Game ID to Join"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          className="w-full px-4 py-3 font-mono text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400"
        />
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-slate-600 rounded-md hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75 transition transform hover:scale-105"
        >
          <LogIn size={20} />
          Join Game
        </button>
      </form>
    </div>
  );
};

export default GameLobby;
