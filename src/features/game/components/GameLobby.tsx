import React, { useEffect } from "react";
import { PlusCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../../store/gameStore";

interface GameLobbyProps {
  gameName: string;
  onCreateGame: () => void;
  disconnectionMessage?: string | null;
}

const GameLobby: React.FC<GameLobbyProps> = ({ gameName, onCreateGame, disconnectionMessage }) => {
  const navigate = useNavigate();
  const clearDisconnectionMessage = useGameStore((state) => state.clearDisconnectionMessage);

  useEffect(() => {
    // This effect now handles the temporary display of the error message.
    if (disconnectionMessage) {
      const timer = setTimeout(() => {
        // After 3 seconds, navigate to the base lobby URL and clear the message.
        // This removes the invalid game ID from the URL, fixing the loop.
        const gameIdSlug = gameName.toLowerCase().replace(/\s+/g, "-");
        navigate(`/game/${gameIdSlug}`, { replace: true });
        clearDisconnectionMessage();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [disconnectionMessage, clearDisconnectionMessage, navigate, gameName]);

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      {disconnectionMessage && (
        <div className="p-4 mb-4 text-center text-yellow-200 bg-yellow-900/50 border border-yellow-700 rounded-lg flex items-center justify-center gap-3">
          <Info size={24} /> <p className="font-semibold">{disconnectionMessage}</p>
        </div>
      )}
      <h2 className="text-3xl font-bold text-center text-white capitalize">{gameName}</h2>
      <p className="text-center text-slate-400">
        Ready to play? Create a new game room and share the link with your friends.
      </p>

      <button
        onClick={onCreateGame}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 transition-all transform hover:scale-105"
      >
        <PlusCircle size={24} /> Create New Game
      </button>
    </div>
  );
};

export default GameLobby;
