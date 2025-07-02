import React from "react";
import { PlusCircle } from "lucide-react";

interface GameLobbyProps {
  gameName: string;
  onCreateGame: () => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({ gameName, onCreateGame }) => {
  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      <h2 className="text-3xl font-bold text-center text-white capitalize">{gameName}</h2>
      <p className="text-center text-slate-400">
        Ready to play? Create a new game room and share the link with your friends.
      </p>
      <button
        onClick={onCreateGame}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 transition-all transform hover:scale-105"
      >
        <PlusCircle size={24} />
        Create New Game
      </button>
    </div>
  );
};

export default GameLobby;
