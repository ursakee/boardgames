import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TicTacToeBoard from "../components/TicTacToeBoard";
import { useGameSession } from "../../../hooks/useGameSession";
import { useGameStore } from "../../../store/gameStore";
import { Users, LogOut, Play, Copy, Check, WifiOff, Loader } from "lucide-react";

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
    players,
    localPlayer,
    isHost,
    peerConnectionStates,
    joinGame,
    leaveGame,
    setMyUsername,
    startGame,
    returnToLobby,
    performAction,
    resetSession,
  } = useGameSession();

  const [currentUsername, setCurrentUsername] = useState(localPlayer?.username || "");
  const disconnectionMessage = useGameStore((state) => state.disconnectionMessage);

  const [view, setView] = useState<"LOBBY" | "GAME" | "SHOWING_RESULT">("LOBBY");

  useEffect(() => {
    if (gamePhase === "in-game") {
      setView("GAME");
    } else if (gamePhase === "post-game" && view === "GAME") {
      setView("SHOWING_RESULT");
    } else if (gamePhase === "lobby") {
      setView("LOBBY");
    }
  }, [gamePhase, view]);

  useEffect(() => {
    if (view === "SHOWING_RESULT") {
      const timer = setTimeout(() => {
        if (isHost) {
          returnToLobby();
        }
        setView("LOBBY");
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [view, isHost, returnToLobby]);

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

  const handleLeaveGame = async () => {
    setIsLeaving(true);
    await leaveGame();
    navigate(`/game/${gameName}`, { replace: true });
  };

  const handleUpdateUsername = () => {
    if (currentUsername.trim()) {
      setMyUsername(currentUsername.trim());
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const gameStatus = useMemo(() => {
    if (!gameInfo || !gameState) return { message: "", isGameOver: false, isMyTurn: false };
    return {
      message: gameInfo.getGameStatus(gameState, players),
      isGameOver: gameInfo.isGameOver(gameState),
      isMyTurn: gameInfo.isTurnOf(gameState, localPlayer?.id || ""),
    };
  }, [gameState, gameInfo, players, localPlayer]);

  const areAllPlayersConnected = useMemo(() => {
    if (!gameInfo || players.length < gameInfo.minPlayers) return false;
    if (!isHost) return peerConnectionStates.get("p1") === "connected";
    const guestIds = players.filter((p) => p.id !== localPlayer?.id).map((p) => p.id);
    if (guestIds.length === 0 && gameInfo.minPlayers > 1) return false;
    return guestIds.every((id) => peerConnectionStates.get(id) === "connected");
  }, [players, gameInfo, isHost, localPlayer, peerConnectionStates]);

  const renderStatusMessage = () => {
    if (!gameInfo) return null;

    const isConnecting = Array.from(peerConnectionStates.values()).some((s) => s === "connecting");
    if (isConnecting) {
      return (
        <div className="flex items-center justify-center gap-2 text-center text-cyan-400 p-2">
          <Loader className="animate-spin" size={20} /> <span>Connecting to player...</span> 
        </div>
      );
    }

    const hasDisconnected = Array.from(peerConnectionStates.values()).some(
      (s) => s === "disconnected" || s === "failed"
    );

    if (players.length < gameInfo.minPlayers && hasDisconnected) {
      return (
        <div className="flex items-center justify-center gap-2 text-center text-red-400 p-2">
          <WifiOff size={20} /> <span>Player disconnected.</span> 
        </div>
      );
    }

    if (players.length < gameInfo.minPlayers) {
      return <li className="text-center text-slate-400 p-2">Waiting for another player...</li>;
    }

    return null;
  };

  if (!activeGameId || !gameInfo || !localPlayer) {
    return <div className="text-xl">Joining game...</div>;
  }

  if (view === "SHOWING_RESULT") {
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
      <div className="relative">
        <TicTacToeBoard
          gameState={gameState}
          statusMessage={gameStatus.message}
          isGameOver={true}
          isMyTurn={false}
          onPerformAction={() => {}}
          onLeaveGame={() => {}}
        />

        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300">
          <div className="bg-slate-800 p-12 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95">
            <h2 className={`text-4xl text-center font-black ${resultColor}`}>{resultMessage}</h2> 
          </div>
        </div>
      </div>
    );
  }

  if (view === "GAME") {
    return (
      <TicTacToeBoard
        gameState={gameState}
        statusMessage={gameStatus.message}
        isGameOver={gameStatus.isGameOver}
        isMyTurn={gameStatus.isMyTurn}
        onPerformAction={performAction}
        onLeaveGame={handleLeaveGame}
      />
    );
  }

  return (
    <div className="w-full max-w-lg p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700">
      <h2 className="text-3xl font-bold text-center text-white capitalize">{gameInfo.displayName} Lobby</h2> 
      <div className="space-y-6">
        <div className="p-3 bg-slate-900/50 rounded-md text-center">
          <p className="text-sm text-slate-400">Share Game Link</p> 
          <div className="flex items-center justify-center gap-3 mt-1">
            <p className="font-mono text-lg text-cyan-400 break-all">{window.location.href}</p> 
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
              value={currentUsername}
              onChange={(e) => setCurrentUsername(e.target.value)}
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
                <span className="text-xl font-mono font-bold px-3 py-1 bg-slate-600 text-cyan-300 rounded-md">
                  {gameState?.scores?.[p.id] ?? 0} 
                </span>
              </li>
            ))}
            {renderStatusMessage()} 
          </ul>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-700 space-y-3">
        {isHost ? (
          <button
            onClick={startGame}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold text-black bg-green-400 rounded-md hover:bg-green-300 transition transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:scale-100"
            disabled={!areAllPlayersConnected}
          >
            <Play size={20} /> Start Game
          </button>
        ) : (
          <p className="text-center text-slate-400">Waiting for the host to start the game...</p>
        )}

        <button
          onClick={handleLeaveGame}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-slate-300 bg-transparent rounded-md hover:bg-red-600/20 hover:text-red-400 transition"
        >
          <LogOut size={16} /> Leave Game
        </button>
      </div>
    </div>
  );
};

export default TicTacToeGamePage;
