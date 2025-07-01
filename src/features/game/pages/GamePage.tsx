import React from "react";
import { useParams } from "react-router-dom";
import { useGame } from "../hooks/useGame";
import GameLobby from "../components/GameLobby";

import {
  getInitialState as getTicTacToeState,
  calculateMove as calculateTicTacToeMove,
} from "../../../games/tic-tac-toe/logic";
// Use "import type" for all type-only imports
import type { GameBoardComponentProps, PlayerSymbol } from "../../../types";

const TicTacToeBoard = React.lazy(() => import("../../../games/tic-tac-toe/components/TicTacToeBoard"));

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

const GamePage: React.FC = () => {
  const { gameName } = useParams<{ gameName: string }>();

  const gameInfo = gameName ? gameRegistry[gameName] : null;

  const { gameId, playerSymbol, gameState, createGame, joinGame, updateAndBroadcastState, leaveGame } = useGame(
    gameInfo?.getInitialState()
  );

  if (!gameInfo) {
    return <div className="text-xl text-red-500">Error: Game '{gameName}' not found!</div>;
  }

  const handleMakeMove = (move: any) => {
    if (!playerSymbol) return;
    const newGameState = gameInfo.calculateMove(gameState, move, playerSymbol);
    updateAndBroadcastState(newGameState);
  };

  const GameBoardComponent = gameInfo.Component;

  return (
    <>
      {gameId && playerSymbol && GameBoardComponent ? (
        <React.Suspense fallback={<div>Loading Game...</div>}>
          <GameBoardComponent
            gameId={gameId}
            playerSymbol={playerSymbol}
            gameState={gameState}
            onMakeMove={handleMakeMove}
            onLeaveGame={leaveGame}
          />
        </React.Suspense>
      ) : (
        <GameLobby gameName={gameName || "Game"} onCreateGame={createGame} onJoinGame={joinGame} />
      )}
    </>
  );
};

export default GamePage;
