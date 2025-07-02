import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./features/home/pages/HomePage";
import GamePage from "./features/game/pages/GamePage";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <main className="w-full flex items-center justify-center">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Route for joining a specific game room */}
          <Route path="/game/:gameName/:gameId" element={<GamePage />} />
          {/* Route for the initial game lobby where you can create a game */}
          <Route path="/game/:gameName" element={<GamePage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
