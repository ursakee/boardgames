import React from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../../store/gameStore";
import LobbyLayout from "../../../features/game/layouts/LobbyLayout";
import { findGame } from "../../gameRegistry";

const TicTacToeLobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const createGame = useGameStore((state) => state.createGame);
  const gameInfo = findGame("tic-tac-toe");

  if (!gameInfo) return null; // Or show an error

  const handleCreateGame = async () => {
    const newGameId = await createGame(gameInfo.id);
    if (newGameId) {
      navigate(`/game/${gameInfo.id}/${newGameId}`, { replace: true });
    }
  };

  return <LobbyLayout gameName={gameInfo.displayName} gameIdSlug={gameInfo.id} onCreateGame={handleCreateGame} />;
};

export default TicTacToeLobbyPage;
