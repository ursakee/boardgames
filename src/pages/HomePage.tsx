import React from "react";
import GameGrid from "../components/GameGrid";
import { Gamepad2 } from "lucide-react";

const HomePage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 md:py-16">
      <header className="text-center mb-12 md:mb-16">
        <div className="inline-block bg-slate-800 p-4 rounded-full mb-4">
          <Gamepad2 className="h-12 w-12 text-cyan-400" />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-500 text-transparent bg-clip-text">
          GameHub
        </h1>
        <p className="text-slate-400 mt-4 text-lg md:text-xl max-w-2xl mx-auto">
          Your destination for classic board games, reimagined for the modern web. Peer-to-peer, no sign-ups, just play.
        </p>
      </header>
      <GameGrid />
    </div>
  );
};

export default HomePage;
