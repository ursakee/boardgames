import React from "react";
import { Link } from "react-router-dom";

interface GameTileProps {
  gameId: string;
  name: string;
}

const GameTile: React.FC<GameTileProps> = ({ gameId, name }) => {
  return (
    <Link
      to={`/game/${gameId}`}
      className="group bg-slate-800/50 rounded-lg shadow-lg p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:bg-slate-700/80 hover:shadow-cyan-500/20 hover:-translate-y-1 aspect-square"
    >
      <h3 className="text-xl font-semibold text-slate-200 group-hover:text-cyan-400">{name}</h3>
    </Link>
  );
};

export default GameTile;
