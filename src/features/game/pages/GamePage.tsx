import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "../../../store/gameStore";
import { findGame } from "../../../games/gameRegistry";
import GameLobby from "../components/GameLobby";
import PreGameLobby from "../components/PreGameLobby";

const GamePage: React.FC = () => {
  const { gameName } = useParams<{ gameName: string }>();
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
  }, [leaveGame, navigate]);

  if (!gameInfo) {
    return <div className="text-xl text-red-500">Error: Game '{gameName}' not found!</div>;
  }

  const handleCreateGame = () => createGame();

  const handleMakeMove = (move: any) => {
    const { playerSymbol, gameState: currentGameState } = useGameStore.getState();
    if (!playerSymbol || !currentGameState) return;

    const newGameState = gameInfo.calculateMove(currentGameState, move, playerSymbol);
    updateAndBroadcastState(newGameState);
  };

  const GameBoardComponent = gameInfo.BoardComponent;

  if (!gameId) {
    return <GameLobby gameName={gameInfo.displayName} onCreateGame={handleCreateGame} onJoinGame={joinGame} />;
  }

  if (gamePhase === "lobby" || gamePhase === "post-game") {
    return <PreGameLobby gameName={gameName!} />;
  }

  const statusMessage = gameInfo.getGameStatus(gameState, players);
  const isGameOver = gameInfo.isGameOver(gameState);

  return (
    <React.Suspense fallback={<div className="text-xl">Loading Game...</div>}>
      <GameBoardComponent
        gameState={gameState}
        statusMessage={statusMessage}
        isGameOver={isGameOver}
        onMakeMove={handleMakeMove}
        onLeaveGame={leaveGame}
      />
    </React.Suspense>
  );
};

export default GamePage;
