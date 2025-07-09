import React from "react";
import GameTile from "./GameTile";
import { gameRegistry } from "../games/gameRegistry";

const GameGrid: React.FC = () => {
  return (
    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
      <h2 className="text-2xl font-bold text-slate-200 mb-6 px-2">Select a Game</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gameRegistry.map((game) => (
          <GameTile key={game.id} gameId={game.id} name={game.displayName} description={game.description} />
        ))}
      </div>
    </div>
  );
};

export default GameGrid;
