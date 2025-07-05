import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { findGame } from "../games/gameRegistry";

const GamePage: React.FC = () => {
  const { gameName, gameId } = useParams<{ gameName: string; gameId?: string }>();

  // Effect to handle graceful disconnects when the tab is closed.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (useGameStore.getState().gameId) {
        useGameStore.getState().notifyLeave();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  if (!gameName) {
    // Should ideally redirect to home or show a generic error page
    return <div className="text-xl text-red-500">Error: No game specified in URL!</div>;
  }

  const gameInfo = findGame(gameName);

  if (!gameInfo) {
    // This can be improved with a "Not Found" page component
    return <div className="text-xl text-red-500">Error: Game '{gameName}' not found!</div>;
  }

  // If a gameId is present in the URL, the user is joining or is in a game session.
  // Render the specific GamePageComponent for that game. It will handle all logic.
  if (gameId) {
    const GamePageComponent = gameInfo.GamePageComponent;
    return (
      <React.Suspense fallback={<div className="text-xl">Loading Game...</div>}>
        <GamePageComponent />
      </React.Suspense>
    );
  }

  // If there's no gameId, the user is at the initial lobby screen for the game.
  // Render the specific LobbyPageComponent for that game.
  const LobbyPageComponent = gameInfo.LobbyPageComponent;
  return (
    <React.Suspense fallback={<div className="text-xl">Loading Lobby...</div>}>
      <LobbyPageComponent />
    </React.Suspense>
  );
};

export default GamePage;
