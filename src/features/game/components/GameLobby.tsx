import React, { useState } from "react";

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
      onJoinGame(joinId);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center text-white capitalize">{gameName}</h2>
      <button
        onClick={onCreateGame}
        className="w-full px-4 py-2 text-lg font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 transition"
      >
        Create New Game
      </button>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative px-2 text-sm text-gray-400 bg-gray-800">OR</div>
      </div>
      <form onSubmit={handleJoin} className="space-y-4">
        <input
          type="text"
          placeholder="Enter Game ID to Join"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition"
        >
          Join Game
        </button>
      </form>
    </div>
  );
};

export default GameLobby;
