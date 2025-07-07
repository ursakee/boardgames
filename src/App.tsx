import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";

const App: React.FC = () => {
  return (
    // Make the root a flex container that fills the screen
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex">
      {/* Make the main content area grow and center its children */}
      <main className="flex-grow w-full flex items-center justify-center p-4">
        <Routes>
          <Route path="/" element={<HomePage />} /> {/* Route for joining a specific game room */}
          <Route path="/game/:gameName/:gameId" element={<GamePage />} />
          {/* Route for the initial game lobby where you can create a game */}
          <Route path="/game/:gameName" element={<GamePage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
