import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UnoBoard from "../components/UnoBoard";
import { useGameSession } from "../../../hooks/useGameSession";
import { useGameStore } from "../../../store/gameStore";
import { Users, LogOut, Play, Copy, Check, Loader, Home, Save } from "lucide-react";

const UnoGamePage: React.FC = () => {
  const { gameName, gameId } = useParams<{ gameName: string; gameId?: string }>();
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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
    returnToLobby,
    performAction,
    resetSession,
  } = useGameSession();

  const [currentUsername, setCurrentUsername] = useState(localPlayer?.username || "");
  const disconnectionMessage = useGameStore((state) => state.disconnectionMessage);

  useEffect(() => {
    if (localPlayer?.username) {
      setCurrentUsername(localPlayer.username);
    }
  }, [localPlayer?.username]);

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

  useEffect(() => {
    if (disconnectionMessage && activeGameId) {
      navigate(`/game/${gameName}`, { replace: true });
      resetSession();
    }
  }, [disconnectionMessage, activeGameId, gameName, navigate, resetSession]);

  const gameStatus = useMemo(() => {
    if (!gameInfo || !gameState || !localPlayer) return { message: "", isGameOver: false, isMyTurn: false };
    const isMyTurn = gameInfo.isTurnOf(gameState, localPlayer.id);
    return {
      message: gameInfo.getGameStatus(gameState, players),
      isGameOver: gameInfo.isGameOver(gameState),
      isMyTurn,
    };
  }, [gameState, gameInfo, players, localPlayer]);

  const handleLeaveGame = async () => {
    setIsLeaving(true);
    await leaveGame();
    navigate(`/game/${gameName}`, { replace: true });
  };

  const handleUpdateUsername = () => {
    if (currentUsername.trim() && currentUsername.trim() !== localPlayer?.username) {
      setMyUsername(currentUsername.trim());
    }
  };

  const handleOptionChange = (optionId: string, value: any) => {
    const isCheckbox = gameInfo?.gameOptions?.find((o) => o.id === optionId)?.type === "boolean";
    const processedValue = isCheckbox ? value : /^\d+$/.test(value) ? Number(value) : value;
    setGameOptions({ [optionId]: processedValue });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const areAllPlayersConnected = useMemo(() => {
    if (!gameInfo || players.length < gameInfo.minPlayers) return false;
    if (isHost) {
      const guestIds = players.filter((p) => p.id !== localPlayer?.id).map((p) => p.id);
      if (guestIds.length === 0 && players.length < gameInfo.minPlayers) return false;
      return guestIds.every((id) => peerConnectionStates.get(id) === "connected");
    }
    return peerConnectionStates.get("p1") === "connected";
  }, [players, gameInfo, isHost, localPlayer, peerConnectionStates]);

  if (!activeGameId || !gameInfo || !localPlayer) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader className="animate-spin h-12 w-12 text-cyan-400" />
        <p className="mt-4 text-xl text-slate-300">Joining Game...</p>
      </div>
    );
  }

  if (gamePhase === "post-game") {
    const winnerId = gameState?.winner;
    const winnerName = players.find((p) => p.id === winnerId)?.username || "A player";
    const isWinner = winnerId === localPlayer.id;

    return (
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300 animate-in fade-in">
        <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-xl">
          <h2 className={`text-6xl font-black ${isWinner ? "text-green-400" : "text-red-400"}`}>
            {isWinner ? "You Win!" : `${winnerName} Wins!`}
          </h2>
          {isHost && (
            <div className="mt-8 flex gap-4">
              <button
                onClick={startGame}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold text-slate-900 bg-cyan-400 rounded-lg hover:bg-cyan-300"
              >
                <Play size={20} /> Play Again
              </button>
              <button
                onClick={returnToLobby}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
              >
                <Home size={20} /> Back to Lobby
              </button>
            </div>
          )}
          {!isHost && <p className="mt-8 text-slate-300">Waiting for host...</p>}
        </div>
      </div>
    );
  }

  if (gamePhase === "in-game") {
    return (
      <UnoBoard
        gameState={gameState}
        statusMessage={gameStatus.message}
        isGameOver={gameStatus.isGameOver}
        isMyTurn={gameStatus.isMyTurn}
        onPerformAction={performAction}
        onLeaveGame={handleLeaveGame}
      />
    );
  }

  // Lobby View
  return (
    <div className="w-full max-w-2xl p-6 md:p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      <h2 className="text-3xl font-bold text-white text-center border-b border-slate-700 pb-4">
        {gameInfo.displayName} Lobby
      </h2>
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
        {/* Left Column: Settings */}
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
              disabled={!currentUsername.trim() || currentUsername.trim() === localPlayer.username}
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
                {option.type === "select" && (
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
                )}
                {option.type === "boolean" && (
                  <label className="mt-2 flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!gameOptions[option.id]}
                      onChange={(e) => handleOptionChange(option.id, e.target.checked)}
                      disabled={!isHost}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Right Column: Players */}
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
      {/* Footer Actions */}
      <div className="pt-6 border-t border-slate-700 flex flex-col md:flex-row-reverse gap-3">
        {isHost ? (
          <button
            onClick={startGame}
            disabled={!areAllPlayersConnected}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 text-lg font-semibold text-slate-900 bg-green-500 rounded-lg hover:bg-green-400 disabled:bg-slate-600 disabled:cursor-not-allowed"
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

export default UnoGamePage;
