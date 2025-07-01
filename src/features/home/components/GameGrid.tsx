import React from "react";
import GameTile from "./GameTile";

// This can be expanded with more games later
const games = [
  { name: "Tic Tac Toe", id: "tic-tac-toe", imageUrl: "/tic-tac-toe.png" },
  // Add other games here e.g. { name: 'Catan', id: 'catan', imageUrl: '/catan.png' }
];

const GameGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {games.map((game) => (
        <GameTile key={game.id} gameId={game.id} name={game.name} imageUrl={game.imageUrl} />
      ))}
    </div>
  );
};

export default GameGrid;
