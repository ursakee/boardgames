import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface GameTileProps {
  gameId: string;
  name: string;
  description: string;
}

const GameTile: React.FC<GameTileProps> = ({ gameId, name, description }) => {
  return (
    <Link
      to={`/game/${gameId}`}
      className="group bg-slate-800 rounded-xl shadow-lg p-6 flex flex-col justify-between text-left transition-all duration-300 hover:bg-slate-700/80 hover:shadow-cyan-500/20 hover:ring-2 hover:ring-cyan-500"
    >
      <div>
        <h3 className="text-2xl font-bold text-slate-100">{name}</h3>
        <p className="text-slate-400 mt-2 text-sm">{description}</p>
      </div>
      <div className="mt-6 flex items-center justify-end">
        <span className="text-sm font-semibold text-cyan-400 group-hover:underline">Play Now</span>
        <ArrowRight className="ml-2 h-4 w-4 text-cyan-400 transform transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
};

export default GameTile;
