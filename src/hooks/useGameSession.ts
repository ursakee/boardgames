import { useGameStore } from "../store/gameStore";
import { useConnectionStore } from "../store/connectionStore";
import { useMemo } from "react";
import { findGame } from "../games/gameRegistry";

/**
 * A custom hook to centralize access to game and connection state.
 * This simplifies components by providing a single, clean interface
 * to all the necessary data and actions for a game session.
 */
export const useGameSession = () => {
  const {
    gameId,
    gameName,
    playerId,
    players,
    gamePhase,
    gameState,
    gameOptions,
    createGame,
    joinGame,
    leaveGame,
    notifyLeave,
    setMyUsername,
    setGameOptions,
    performAction,
    startGame,
    returnToLobby,
    resetSession,
  } = useGameStore();

  const { isHost, peerConnectionStates } = useConnectionStore();

  const gameInfo = useMemo(() => findGame(gameName || undefined), [gameName]);
  const localPlayer = useMemo(() => players.find((p) => p.id === playerId), [players, playerId]);

  return {
    // State
    gameId,
    gameName,
    gameInfo,
    playerId,
    players,
    gamePhase,
    gameState,
    gameOptions,
    isHost,
    peerConnectionStates,
    localPlayer,

    // Actions
    createGame,
    joinGame,
    leaveGame,
    notifyLeave,
    setMyUsername,
    setGameOptions,
    performAction,
    startGame,
    returnToLobby,
    resetSession,
  };
};
