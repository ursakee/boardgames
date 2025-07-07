import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../../store/gameStore";
import { findGame } from "../../gameRegistry";
import { PlusCircle, Info, X, Swords, ArrowLeft } from "lucide-react";

const TicTacToeLobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const createGame = useGameStore((state) => state.createGame);
  const disconnectionMessage = useGameStore((state) => state.disconnectionMessage);
  const clearDisconnectionMessage = useGameStore((state) => state.clearDisconnectionMessage);
  const gameInfo = findGame("tic-tac-toe");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (disconnectionMessage) {
      setShowToast(true);
      const timer = setTimeout(() => {
        handleCloseToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [disconnectionMessage]);
  const handleCloseToast = () => {
    setShowToast(false);
    setTimeout(() => {
      clearDisconnectionMessage();
      if (gameInfo) {
        navigate(`/game/${gameInfo.id}`, { replace: true });
      }
    }, 300);
  };

  if (!gameInfo) return null;

  const handleCreateGame = async () => {
    const newGameId = await createGame(gameInfo.id);
    if (newGameId) {
      navigate(`/game/${gameInfo.id}/${newGameId}`, { replace: true });
    }
  };

  return (
    <>
      <div className="relative w-full max-w-md p-8 text-center bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
        <button
          onClick={() => navigate("/")}
          aria-label="Back to home"
          className="absolute top-4 left-4 p-2 text-slate-400 rounded-full hover:bg-slate-700/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-slate-700/50 rounded-full">
            <Swords size={32} className="text-cyan-400" />
          </div>
          <h2 className="text-4xl font-extrabold text-white">{gameInfo.displayName}</h2>
          <p className="text-slate-400 max-w-sm mx-auto">
            Challenge a friend to a classic duel. Create a game room and share the link to begin.
          </p>
          <div className="w-full pt-4 mt-2">
            <button
              onClick={handleCreateGame}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg font-bold text-slate-900 bg-cyan-400 rounded-lg hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:ring-opacity-50 transition-all transform hover:scale-105"
            >
              <PlusCircle size={24} /> Create New Game
            </button>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-5 right-5 w-full max-w-sm bg-yellow-900/80 backdrop-blur-sm border border-yellow-700 text-yellow-200 p-4 rounded-lg shadow-lg animate-in slide-in-from-bottom-5">
          <div className="flex items-start">
            <Info className="h-6 w-6 mr-3 text-yellow-400" />
            <p className="flex-1 font-semibold">{disconnectionMessage}</p>
            <button onClick={handleCloseToast} className="ml-2 p-1 rounded-md hover:bg-yellow-800/50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TicTacToeLobbyPage;
