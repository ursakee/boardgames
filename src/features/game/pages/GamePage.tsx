import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "../../../store/gameStore";
import { findGame } from "../../../games/gameRegistry";
import GameLobby from "../components/GameLobby";
import PreGameLobby from "../components/PreGameLobby";

const GamePage: React.FC = () => {
  const { gameName, gameId: gameIdFromUrl } = useParams<{ gameName: string; gameId?: string }>();
  const navigate = useNavigate();

  const {
    gameId,
    gameInfo,
    gamePhase,
    gameState,
    players,
    playerId,
    disconnectionMessage,
    createGame,
    joinGame,
    leaveGame,
    notifyLeave,
    resetSession,
    performAction,
  } = useGameStore();

  useEffect(() => {
    // This effect handles the logic for a user joining a game room.
    // It correctly handles React 18's StrictMode double-mount behavior in development.
    if (gameIdFromUrl && gameName && !useGameStore.getState().gameId) {
      joinGame(gameIdFromUrl, gameName);
    }
  }, [gameIdFromUrl, gameName, joinGame]); // Dependencies ensure the effect runs if the URL changes

  useEffect(() => {
    // This effect handles graceful disconnects when the tab is closed.
    const handleBeforeUnload = () => {
      if (useGameStore.getState().gameId) {
        notifyLeave();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [notifyLeave]);

  useEffect(() => {
    // This effect handles being disconnected by the host.
    if (disconnectionMessage && gameId) {
      const lobbyUrl = `/game/${gameName}`;
      resetSession();
      navigate(lobbyUrl, { replace: true });
    }
  }, [disconnectionMessage, gameId, gameName, navigate, resetSession]);

  const handleCreateGame = async () => {
    if (!gameName) return;
    const newGameId = await createGame(gameName);
    if (newGameId) {
      navigate(`/game/${gameName}/${newGameId}`, { replace: true });
    }
  };

  const handleLeaveGame = async () => {
    const currentGameName = useGameStore.getState().gameName;
    await leaveGame();
    if (currentGameName) {
      navigate(`/game/${currentGameName}`);
    } else {
      navigate("/");
    }
  };

  if (!gameName) {
    return <div className="text-xl text-red-500">Error: No game specified in URL!</div>;
  }

  // If there's no gameId in the store, we are either creating or joining.
  if (!gameId) {
    if (gameIdFromUrl) {
      return <div className="text-xl">Joining game...</div>;
    }
    const lobbyGameInfo = findGame(gameName);
    if (!lobbyGameInfo) {
      return <div className="text-xl text-red-500">Error: Game '{gameName}' not found!</div>;
    }
    return (
      <GameLobby
        gameName={lobbyGameInfo.displayName}
        onCreateGame={handleCreateGame}
        disconnectionMessage={disconnectionMessage}
      />
    );
  }

  if (!gameInfo) {
    return <div className="text-xl">Loading game...</div>;
  }

  if (gamePhase === "lobby" || gamePhase === "post-game") {
    return <PreGameLobby gameName={gameInfo.displayName} onLeaveGame={handleLeaveGame} />;
  }

  const GameBoardComponent = gameInfo.BoardComponent;
  const statusMessage = gameInfo.getGameStatus(gameState, players);
  const isGameOver = gameInfo.isGameOver(gameState);
  const isMyTurn = playerId ? gameInfo.isTurnOf(gameState, playerId) : false;

  return (
    <React.Suspense fallback={<div className="text-xl">Loading Game Board...</div>}>
      <GameBoardComponent
        gameState={gameState}
        statusMessage={statusMessage}
        isGameOver={isGameOver}
        isMyTurn={isMyTurn}
        onPerformAction={performAction}
        onLeaveGame={handleLeaveGame}
      />
    </React.Suspense>
  );
};

export default GamePage;
