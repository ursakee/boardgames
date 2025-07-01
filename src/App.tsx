import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./features/home/pages/HomePage";
import GamePage from "./features/game/pages/GamePage";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold text-cyan-400">Board Game Hub</h1>
      </header>
      <main className="w-full flex items-center justify-center">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:gameName" element={<GamePage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
