import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TicTacToeBoard from "../components/TicTacToeBoard";
import { useGameSession } from "../../../hooks/useGameSession";
import { useGameStore } from "../../../store/gameStore";
import { Users, LogOut, Play, Copy, Check, WifiOff, Loader, Shield, Swords, Home, Save } from "lucide-react";

const TicTacToeGamePage: React.FC = () => {
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
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);
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
    if (!gameInfo || !gameState) return { message: "", isGameOver: false, isMyTurn: false };

    const isMyTurn = gameInfo.isTurnOf(gameState, localPlayer?.id || "");
    const baseMessage = gameInfo.getGameStatus(gameState, players);

    return {
      message: baseMessage,
      isGameOver: gameInfo.isGameOver(gameState),
      isMyTurn: isMyTurn,
    };
  }, [gameState, gameInfo, players, localPlayer, gamePhase]);

  // Effect for managing the turn timer
  useEffect(() => {
    if (gamePhase !== "in-game" || !gameState || gameStatus.isGameOver) {
      setTurnTimeLeft(null); // No timer outside of active gameplay
      return;
    }

    const timerDuration = gameState.options?.turnTimer;
    if (timerDuration <= 0) {
      setTurnTimeLeft(null); // No timer if set to unlimited
      return;
    }

    // Start a new timer when the turn changes
    setTurnTimeLeft(timerDuration);

    const intervalId = setInterval(() => {
      setTurnTimeLeft((prevTime) => {
        if (prevTime === null || prevTime <= 1) {
          clearInterval(intervalId);
          // Check if it's my turn before making a random move
          if (gameStatus.isMyTurn) {
            const emptySquares = gameState.board
              .map((val: any, index: number) => (val === null ? index : null))
              .filter((val: any): val is number => val !== null);

            if (emptySquares.length > 0) {
              const randomMove = emptySquares[Math.floor(Math.random() * emptySquares.length)];
              performAction({ type: "MAKE_MOVE", payload: randomMove });
            }
          }
          return null;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Cleanup interval on turn change or component unmount
    return () => clearInterval(intervalId);
  }, [gameState?.isNext, gamePhase, gameStatus.isGameOver]); // Reruns when turn changes

  const handleLeaveGame = async () => {
    setIsLeaving(true);
    await leaveGame();
    navigate(`/game/${gameName}`, { replace: true });
  };

  const handleReturnToLobby = async () => {
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
    const numericValue = /^\d+$/.test(value) ? Number(value) : value;
    setGameOptions({ [optionId]: numericValue });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const areAllPlayersConnected = useMemo(() => {
    if (!gameInfo || players.length < gameInfo.minPlayers) return false;
    if (!isHost) return peerConnectionStates.get("p1") === "connected";
    const guestIds = players.filter((p) => p.id !== localPlayer?.id).map((p) => p.id);
    if (guestIds.length === 0 && gameInfo.minPlayers > 1) return false;
    return guestIds.every((id) => peerConnectionStates.get(id) === "connected");
  }, [players, gameInfo, isHost, localPlayer, peerConnectionStates]);

  const renderLobbyStatus = () => {
    if (!gameInfo) return null;
    const isConnecting = Array.from(peerConnectionStates.values()).some((s) => s === "connecting");
    if (isConnecting) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-cyan-400 p-2">
          <Loader className="animate-spin" size={16} /> Connecting to player...
        </div>
      );
    }

    const hasDisconnected = Array.from(peerConnectionStates.values()).some(
      (s) => s === "disconnected" || s === "failed"
    );

    if (players.length < gameInfo.minPlayers && hasDisconnected) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-red-400 p-2">
          <WifiOff size={16} /> Player disconnected. Waiting for a new player.
        </div>
      );
    }

    if (players.length < gameInfo.minPlayers) {
      return <div className="text-center text-sm text-slate-400 p-2">Waiting for another player...</div>;
    }

    return null;
  };

  if (!activeGameId || !gameInfo || !localPlayer) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader className="animate-spin h-12 w-12 text-cyan-400" />
        <p className="mt-4 text-xl text-slate-300">Joining Game...</p>
      </div>
    );
  }

  if (gamePhase === "post-game") {
    const { winner, playerMap } = gameState;
    const localPlayerSymbol = playerMap[localPlayer.id];
    let resultMessage = "";
    let resultColor = "text-white";

    if (winner === "draw") {
      resultMessage = "It's a Draw!";
      resultColor = "text-yellow-400";
    } else if (winner === localPlayerSymbol) {
      resultMessage = "You Win!";
      resultColor = "text-green-400";
    } else {
      resultMessage = "You Lose!";
      resultColor = "text-red-400";
    }

    return (
      <div className="relative w-full flex items-center justify-center">
        <TicTacToeBoard
          gameState={gameState}
          statusMessage={gameStatus.message}
          isGameOver={true}
          isMyTurn={false}
          turnTimeLeft={null}
          onPerformAction={() => {}}
          onLeaveGame={handleLeaveGame}
        />

        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300 animate-in fade-in">
          <div className="text-center">
            <h2 className={`text-6xl font-black ${resultColor}`}>{resultMessage}</h2>
            {isHost && (
              <div className="mt-8 flex gap-4">
                <button
                  onClick={startGame}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold text-slate-900 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-transform hover:scale-105"
                >
                  <Play size={20} /> Play Again
                </button>

                <button
                  onClick={returnToLobby}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                >
                  <Home size={20} /> Back to Lobby
                </button>
              </div>
            )}
            {!isHost && <p className="mt-8 text-slate-300">Waiting for the host to start the next round...</p>}
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === "in-game") {
    return (
      <TicTacToeBoard
        gameState={gameState}
        statusMessage={gameStatus.message}
        isGameOver={gameStatus.isGameOver}
        isMyTurn={gameStatus.isMyTurn}
        turnTimeLeft={turnTimeLeft}
        onPerformAction={performAction}
        onLeaveGame={handleLeaveGame}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl p-6 md:p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      <div className="text-center border-b border-slate-700 pb-4">
        <h2 className="text-3xl font-bold text-white"> {gameInfo.displayName} Lobby </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-300">Your Settings</h3>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-slate-400">
              Display Name
            </label>
            <div className="flex items-center gap-2">
              <input
                id="username"
                type="text"
                value={currentUsername}
                onChange={(e) => setCurrentUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateUsername()}
                className="flex-grow px-3 py-2 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter your name..."
              />
              <button
                onClick={handleUpdateUsername}
                disabled={currentUsername.trim() === "" || currentUsername.trim() === localPlayer.username}
                className="p-2 text-slate-300 bg-slate-700/50 rounded-md hover:bg-slate-700 disabled:bg-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={20} />
              </button>
            </div>
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
                <label htmlFor={option.id} className="text-sm font-medium text-slate-400">
                  {option.label}
                </label>
                {option.type === "select" && (
                  <select
                    id={option.id}
                    value={gameOptions[option.id]}
                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    disabled={!isHost}
                    className="mt-1 block w-full px-3 py-2 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {option.choices?.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                )}
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
                <div className="flex items-center gap-3">
                  {p.id === "p1" ? (
                    <Shield size={18} className="text-yellow-400" />
                  ) : (
                    <Swords size={18} className="text-slate-400" />
                  )}

                  <span className="font-bold text-slate-100">
                    {p.username} {p.id === localPlayer?.id && <span className="text-xs text-cyan-400">(You)</span>}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400">Score</p>
                  <p className="text-xl font-mono font-bold text-cyan-300">{gameState?.scores?.[p.id] ?? 0}</p>
                </div>
              </div>
            ))}
            {renderLobbyStatus()}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-700 flex flex-col md:flex-row-reverse gap-3">
        {isHost ? (
          <button
            onClick={startGame}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 text-lg font-semibold text-slate-900 bg-green-500 rounded-lg hover:bg-green-400 transition transform hover:scale-105 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed disabled:scale-100"
            disabled={!areAllPlayersConnected}
          >
            <Play size={20} /> Start Game
          </button>
        ) : (
          <p className="w-full text-center text-slate-400 p-3">Waiting for the host to start the game...</p>
        )}

        <button
          onClick={handleReturnToLobby}
          className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 font-semibold text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-700/80 hover:text-red-400 transition"
        >
          <LogOut size={16} /> Leave Lobby
        </button>
      </div>
    </div>
  );
};

export default TicTacToeGamePage;
