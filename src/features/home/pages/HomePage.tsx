import React from "react";
import GameGrid from "../components/GameGrid";

const HomePage: React.FC = () => {
  return (
    <div>
      <header className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 text-transparent bg-clip-text">
          Board Game Hub
        </h1>
        <p className="text-slate-400 mt-2">Peer-to-Peer gaming, no strings attached.</p>
      </header>
      <GameGrid />
    </div>
  );
};

export default HomePage;
