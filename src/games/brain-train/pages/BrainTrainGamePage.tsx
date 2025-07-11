import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameSession } from "../../../hooks/useGameSession";
import BrainTrainBoard from "../components/BrainTrainBoard";
import { Check, Copy, Loader, LogOut, Play, Save, Users, Info } from "lucide-react";
import { useGameStore, type Player } from "../../../store/gameStore";
import type { BrainTrainGameState } from "../types";

const BrainTrainGamePage: React.FC = () => {
  const { gameName, gameId } = useParams<{ gameName: string; gameId?: string }>();
  const navigate = useNavigate();
  const {
    gameId: activeGameId,
    gameInfo,
    gamePhase,
    gameState,
    gameOptions,
    players,
    localPlayer,
    isHost,
    peerConnectionStates,
    joinGame,
    leaveGame,
    setMyUsername,
    setGameOptions,
    startGame,
    performAction,
    resetSession,
  } = useGameSession();

  const [isLeaving, setIsLeaving] = useState(false);
  const [currentUsername, setCurrentUsername] = useState(localPlayer?.username || "");
  const [isCopied, setIsCopied] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const previousPlayersRef = useRef<Player[]>(players);
  const disconnectionMessage = useGameStore((state) => state.disconnectionMessage);

  const areAllPlayersConnected = useMemo(() => {
    if (!gameInfo || players.length < gameInfo.minPlayers) return false;
    if (gameInfo.minPlayers === 1) return true;
    if (!isHost) {
      return peerConnectionStates.get("p1") === "connected";
    }

    const guestIds = players.filter((p) => p.id !== localPlayer?.id).map((p) => p.id);
    if (guestIds.length === 0 && players.length < gameInfo.minPlayers) return false;
    return guestIds.every((id) => peerConnectionStates.get(id) === "connected");
  }, [players, gameInfo, isHost, localPlayer, peerConnectionStates]);

  useEffect(() => {
    if (disconnectionMessage && activeGameId) {
      navigate(`/game/${gameName}`, { replace: true });
      resetSession();
    }
  }, [disconnectionMessage, activeGameId, gameName, navigate, resetSession]);

  useEffect(() => {
    if (localPlayer?.username) {
      setCurrentUsername(localPlayer.username);
    }
  }, [localPlayer?.username]);

  useEffect(() => {
    if (gamePhase === "in-game" && previousPlayersRef.current.length > players.length) {
      const leftPlayer = previousPlayersRef.current.find((pOld) => !players.some((pNew) => pNew.id === pOld.id));
      if (leftPlayer) {
        setNotification(`${leftPlayer.username} has left the game.`);
        const timer = setTimeout(() => setNotification(null), 4000);
        return () => clearTimeout(timer);
      }
    }
    previousPlayersRef.current = players;
  }, [players, gamePhase]);

  useEffect(() => {
    const attemptJoin = async () => {
      if (gameId && gameName && !activeGameId && !isLeaving) {
        const joinResult = await joinGame(gameId, gameName);
        if (joinResult === "failed") {
          navigate(`/game/${gameName}`, { replace: true });
        }
      }
    };
    attemptJoin();
  }, [gameId, gameName, activeGameId, joinGame, isLeaving, navigate]);

  const gameStatus = useMemo(() => {
    if (!gameInfo || !gameState || !localPlayer) return { message: "", isMyTurn: false };
    return {
      message: gameInfo.getGameStatus(gameState, players),
      isMyTurn: gameInfo.isTurnOf(gameState, localPlayer.id),
    };
  }, [gameInfo, gameState, players, localPlayer]);

  if (!activeGameId || !gameInfo || !localPlayer) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Loader className="animate-spin h-12 w-12 text-cyan-400" />
        <p className="mt-4 text-xl text-slate-300">Joining Game...</p>
      </div>
    );
  }

  const typedGameState = gameState as BrainTrainGameState | null;

  const handleLeaveGame = async () => {
    setIsLeaving(true);
    const currentGaneName = gameName;
    await leaveGame();
    navigate(currentGaneName ? `/game/${currentGaneName}` : "/", { replace: true });
  };

  const handleUpdateUsername = () => setMyUsername(currentUsername.trim());
  const handleOptionChange = (optionId: string, value: any) => setGameOptions({ [optionId]: value });
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (gamePhase === "in-game" || gamePhase === "post-game") {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {notification && (
          <div className="fixed top-5 right-5 z-50 bg-slate-700 text-white p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
            <Info className="h-5 w-5 text-cyan-400" />
            <p>{notification}</p>
          </div>
        )}
        <BrainTrainBoard
          gameState={typedGameState!}
          isGameOver={gamePhase === "post-game"}
          onPerformAction={performAction}
          onLeaveGame={handleLeaveGame}
          statusMessage={gameStatus.message}
          isMyTurn={gameStatus.isMyTurn}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl p-6 md:p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      <h2 className="text-3xl font-bold text-white text-center border-b border-slate-700 pb-4">
        {gameInfo.displayName} Lobby
      </h2>
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-300">Your Settings</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentUsername}
              onChange={(e) => setCurrentUsername(e.target.value)}
              className="flex-grow px-3 py-2 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter your name..."
            />
            <button
              onClick={handleUpdateUsername}
              disabled={!currentUsername.trim()}
              className="p-2 text-slate-300 bg-slate-700/50 rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              <Save size={20} />
            </button>
          </div>
          <button
            onClick={handleCopyLink}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md transition-colors ${
              isCopied ? "bg-green-600/20 text-green-400" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {isCopied ? (
              <>
                <Check size={18} /> Copied!
              </>
            ) : (
              <>
                <Copy size={18} /> Copy Invite Link
              </>
            )}
          </button>
          <div className="space-y-4 pt-4 border-t border-slate-700/50">
            <h3 className="font-semibold text-slate-300">Game Options</h3>
            {gameInfo.gameOptions?.map((option) => (
              <div key={option.id}>
                <label className="text-sm font-medium text-slate-400">{option.label}</label>
                <select
                  value={gameOptions[option.id]}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  disabled={!isHost}
                  className="mt-1 block w-full px-3 py-2 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {option.choices?.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-300 flex items-center gap-2">
            <Users size={20} /> Players
          </h3>
          <div className="space-y-2 p-3 bg-slate-900/50 rounded-md min-h-[120px]">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-700/50 rounded-lg">
                <span className="font-bold text-slate-100">
                  {p.username} {p.id === localPlayer.id && "(You)"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pt-6 border-t border-slate-700 flex flex-col md:flex-row-reverse gap-3">
        {isHost ? (
          <button
            onClick={startGame}
            disabled={!areAllPlayersConnected}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 text-lg font-semibold text-slate-900 bg-green-500 rounded-lg hover:bg-green-400"
          >
            <Play size={20} /> Start Game
          </button>
        ) : (
          <p className="w-full text-center text-slate-400 p-3">Waiting for host...</p>
        )}
        <button
          onClick={handleLeaveGame}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 font-semibold text-slate-300 bg-slate-700/50 rounded-lg hover:text-red-400"
        >
          <LogOut size={16} /> Leave
        </button>
      </div>
    </div>
  );
};

export default BrainTrainGamePage;
