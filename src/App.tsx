import React from "react";
import { useGame } from "./hooks/useGame";
import GameLobby from "./GameLobby";
import GameBoard from "./GameBoard";

const App: React.FC = () => {
  const { gameId, playerSymbol, gameState, createGame, joinGame, makeMove, leaveGame } = useGame();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold text-cyan-400">P2P Tic-Tac-Toe</h1>
        <p className="text-gray-400 mt-2">Built with React, TypeScript, WebRTC & Firebase</p>
      </header>
      <main className="w-full flex items-center justify-center">
        {gameId && playerSymbol ? (
          <GameBoard
            gameId={gameId}
            playerSymbol={playerSymbol}
            gameState={gameState}
            onMakeMove={makeMove}
            onLeaveGame={leaveGame}
          />
        ) : (
          <GameLobby onCreateGame={createGame} onJoinGame={joinGame} />
        )}
      </main>
    </div>
  );
};

export default App;
