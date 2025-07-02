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
    gamePhase,
    gameState,
    players,
    createGame,
    joinGame,
    leaveGame,
    updateAndBroadcastState,
    setGameState,
  } = useGameStore();

  const gameInfo = gameName ? findGame(gameName) : null;

  useEffect(() => {
    if (gameIdFromUrl && !useGameStore.getState().gameId) {
      joinGame(gameIdFromUrl);
    }
  }, [gameIdFromUrl, joinGame]);

  useEffect(() => {
    if (gameInfo && !gameState) {
      setGameState(gameInfo.getInitialState());
    }
  }, [gameInfo, gameState, setGameState]);

  useEffect(() => {
    return () => {
      if (useGameStore.getState().gameId) {
        leaveGame();
      }
    };
  }, [leaveGame]);

  if (!gameInfo) {
    return <div className="text-xl text-red-500">Error: Game '{gameName}' not found!</div>;
  }

  const handleCreateGame = async () => {
    const newGameId = await createGame();
    if (newGameId && gameName) {
      navigate(`/game/${gameName}/${newGameId}`, { replace: true });
    }
  };

  // NEW: Centralized handler for leaving the game
  const handleLeaveGame = async () => {
    // First, execute the leave game logic from the store
    await leaveGame();
    // Then, navigate the user back to the game's main lobby page
    if (gameName) {
      navigate(`/game/${gameName}`);
    }
  };

  const handleMakeMove = (move: any) => {
    const { playerSymbol, gameState: currentGameState } = useGameStore.getState();
    if (!playerSymbol || !currentGameState) return;

    const newGameState = gameInfo.calculateMove(currentGameState, move, playerSymbol);
    updateAndBroadcastState(newGameState);
  };

  const GameBoardComponent = gameInfo.BoardComponent;

  if (!gameId) {
    return <GameLobby gameName={gameInfo.displayName} onCreateGame={handleCreateGame} />;
  }

  // MODIFIED: Pass the new handler to the PreGameLobby
  if (gamePhase === "lobby" || gamePhase === "post-game") {
    return <PreGameLobby gameName={gameName!} onLeaveGame={handleLeaveGame} />;
  }

  const statusMessage = gameInfo.getGameStatus(gameState, players);
  const isGameOver = gameInfo.isGameOver(gameState);

  return (
    <React.Suspense fallback={<div className="text-xl">Loading Game...</div>}>
      {/* MODIFIED: Pass the new handler to the GameBoardComponent */}
      <GameBoardComponent
        gameState={gameState}
        statusMessage={statusMessage}
        isGameOver={isGameOver}
        onMakeMove={handleMakeMove}
        onLeaveGame={handleLeaveGame}
      />
    </React.Suspense>
  );
};

export default GamePage;
