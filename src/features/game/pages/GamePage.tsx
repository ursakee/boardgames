import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "../../../store/gameStore";
import GameLobby from "../components/GameLobby";
import PreGameLobby from "../components/PreGameLobby";

// Game-specific imports
import {
  getInitialState as getTicTacToeState,
  calculateMove as calculateTicTacToeMove,
} from "../../../games/tic-tac-toe/logic";
import type { GameBoardComponentProps, PlayerSymbol } from "../../../types";

const TicTacToeBoard = React.lazy(() => import("../../../games/tic-tac-toe/components/TicTacToeBoard"));

// --- Game Registry ---
type GameRegistryEntry = {
  getInitialState: () => any;
  calculateMove: (currentState: any, move: any, playerSymbol: PlayerSymbol) => any;
  Component: React.LazyExoticComponent<React.FC<GameBoardComponentProps<any>>>;
};

const gameRegistry: { [key: string]: GameRegistryEntry } = {
  "tic-tac-toe": {
    getInitialState: getTicTacToeState,
    calculateMove: calculateTicTacToeMove,
    Component: TicTacToeBoard,
  },
};

// --- Component ---
const GamePage: React.FC = () => {
  const { gameName } = useParams<{ gameName: string }>();
  const navigate = useNavigate();

  // Zustand Store
  const { gameId, gamePhase, gameState, createGame, joinGame, leaveGame, updateAndBroadcastState, setGameState } =
    useGameStore();

  const gameInfo = gameName ? gameRegistry[gameName] : null;

  // Set initial game state when component loads for a specific game
  useEffect(() => {
    if (gameInfo && !gameState) {
      setGameState(gameInfo.getInitialState());
    }
  }, [gameInfo, gameState, setGameState]);

  // Cleanup on unmount or navigation
  useEffect(() => {
    return () => {
      if (gameId) {
        leaveGame();
      }
    };
  }, [leaveGame, gameId, navigate]);

  if (!gameInfo) {
    return <div className="text-xl text-red-500">Error: Game '{gameName}' not found!</div>;
  }

  const handleCreateGame = () => createGame(gameName!);
  const handleMakeMove = (move: any) => {
    const playerSymbol = useGameStore.getState().playerSymbol;
    if (!playerSymbol || !gameState) return;
    const newGameState = gameInfo.calculateMove(gameState, move, playerSymbol);
    updateAndBroadcastState(newGameState);
  };

  const GameBoardComponent = gameInfo.Component;

  // Conditional Rendering Logic
  if (!gameId) {
    return <GameLobby gameName={gameName!} onCreateGame={handleCreateGame} onJoinGame={joinGame} />;
  }

  if (gamePhase === "lobby" || gamePhase === "post-game") {
    return <PreGameLobby gameName={gameName!} />;
  }

  return (
    <React.Suspense fallback={<div className="text-xl">Loading Game...</div>}>
      <GameBoardComponent gameState={gameState} onMakeMove={handleMakeMove} onLeaveGame={leaveGame} />
    </React.Suspense>
  );
};

export default GamePage;
