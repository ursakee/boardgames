import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PreGameLobbyLayout from "../../../layouts/PreGameLobbyLayout";
import TicTacToeBoard from "../components/TicTacToeBoard";
import { useGameSession } from "../../../hooks/useGameSession";
import { useGameStore } from "../../../store/gameStore";

const TicTacToeGamePage: React.FC = () => {
  const { gameName, gameId } = useParams<{ gameName: string; gameId?: string }>();
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false); // Flag to prevent re-joining on leave
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
    playAgain,
    performAction,
    resetSession,
  } = useGameSession();

  const disconnectionMessage = useGameStore((state) => state.disconnectionMessage); // Effect to handle joining the game when the component mounts with a gameId

  useEffect(() => {
    const attemptJoin = async () => {
      if (gameId && gameName && !activeGameId && !isLeaving) {
        const joinResult = await joinGame(gameId, gameName); // Only navigate away on an explicit failure. // The "locked" state can happen in React StrictMode and should be ignored.
        if (joinResult === "failed") {
          navigate(`/game/${gameName}`, { replace: true });
        }
      }
    };
    attemptJoin();
  }, [gameId, gameName, activeGameId, joinGame, isLeaving, navigate]); // Effect to handle being involuntarily disconnected from the game (e.g., host leaves)

  useEffect(() => {
    if (disconnectionMessage && activeGameId) {
      // A message appeared while in-game, so we were forced out.
      // Navigate to the lobby, where the message will be displayed.
      navigate(`/game/${gameName}`, { replace: true }); // Reset the session, which preserves the message for the lobby to show.
      resetSession();
    }
  }, [disconnectionMessage, activeGameId, gameName, navigate, resetSession]);

  const handleLeaveGame = async () => {
    setIsLeaving(true);
    await leaveGame();
    navigate(`/game/${gameName}`, { replace: true });
  };

  if (!activeGameId || !gameInfo || !localPlayer) {
    // This shows "Joining game..." while the attempt is in progress.
    // If the attempt fails, the effect above will navigate away.
    return <div className="text-xl">Joining game...</div>;
  }

  const displayPlayers = isHost
    ? players.filter((p) => p.id === localPlayer.id || peerConnectionStates.has(p.id))
    : players; // Show Pre-game or Post-game lobby

  if (gamePhase === "lobby" || gamePhase === "post-game") {
    return (
      <PreGameLobbyLayout
        gameName={gameInfo.displayName}
        username={localPlayer.username}
        players={displayPlayers} // Use the stable list
        isHost={isHost}
        gamePhase={gamePhase}
        peerConnectionStates={peerConnectionStates}
        onLeaveGame={handleLeaveGame}
        onSetUsername={setMyUsername}
        onStartGame={startGame}
        onPlayAgain={playAgain}
      />
    );
  } // Show the actual game board

  const statusMessage = gameInfo.getGameStatus(gameState, players);
  const isGameOver = gameInfo.isGameOver(gameState);
  const isMyTurn = gameInfo.isTurnOf(gameState, localPlayer.id);

  return (
    <TicTacToeBoard
      gameState={gameState}
      statusMessage={statusMessage}
      isGameOver={isGameOver}
      isMyTurn={isMyTurn}
      onPerformAction={performAction}
      onLeaveGame={handleLeaveGame}
    />
  );
};

export default TicTacToeGamePage;
