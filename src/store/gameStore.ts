import { create } from "zustand";
import { useConnectionStore } from "./connectionStore";
import { findGame } from "../games/gameRegistry";
import type { GameAction, GameRegistryEntry, PlayerId } from "../types";

// --- Types ---
export type GamePhase = "lobby" | "in-game" | "post-game";

export interface Player {
  id: PlayerId;
  username: string;
}

type GameMessage =
  | { type: "player_join"; payload: Player }
  | { type: "players_update"; payload: Player[] }
  | { type: "username_change"; payload: { id: PlayerId; newUsername: string } }
  | { type: "start_game"; payload: any }
  | { type: "game_state_update"; payload: any }
  | { type: "game_action"; payload: GameAction }
  | { type: "reset_to_lobby"; payload: any }
  | { type: "player_disconnect" };

// --- Main State and Actions Interface ---
interface GameState {
  gameId: string | null;
  gameName: string | null;
  gameInfo: GameRegistryEntry | null;
  playerId: PlayerId | null;
  players: Player[];
  gamePhase: GamePhase;
  gameState: any;
  disconnectionMessage: string | null;
  createGame: (gameName: string) => Promise<string | undefined>;
  joinGame: (id: string, gameName: string) => Promise<void>;
  setMyUsername: (newUsername: string) => void;
  setDisconnectionMessage: (message: string | null) => void;
  performAction: (action: Omit<GameAction, "playerId">) => void;
  updateAndBroadcastState: (newState: any) => void;
  startGame: () => void;
  playAgain: () => void;
  leaveGame: () => Promise<void>;
  resetStore: () => void;
}

const broadcast = (message: GameMessage) => useConnectionStore.getState().sendMessage(message);

export const useGameStore = create<GameState>((set, get) => ({
  gameId: null,
  gameName: null,
  gameInfo: null,
  playerId: null,
  players: [],
  gamePhase: "lobby",
  gameState: null,
  disconnectionMessage: null,

  createGame: async (gameName: string) => {
    get().resetStore();
    set({ disconnectionMessage: null });
    const gameInfo = findGame(gameName);
    if (!gameInfo) {
      return undefined;
    }
    const hostId = "p1";
    const sessionId = await useConnectionStore.getState().createSession();
    if (sessionId) {
      set({
        gameId: sessionId,
        gameName: gameName,
        gameInfo: gameInfo,
        playerId: hostId,
        players: [{ id: hostId, username: "Player 1" }],
        gameState: null,
      });
    }
    return sessionId;
  },

  joinGame: async (id: string, gameName: string) => {
    get().resetStore();
    set({ disconnectionMessage: null });
    const gameInfo = findGame(gameName);
    if (!gameInfo) {
      await useConnectionStore.getState().joinSession(id);
      set({ gameId: id, gameName: gameName });
      return;
    }
    const guestId = `p${Math.floor(Math.random() * 1000) + 2}`;
    const self = { id: guestId, username: "Player 2" };
    set({
      gameId: id,
      gameName: gameName,
      gameInfo: gameInfo,
      playerId: guestId,
      players: [self],
      gameState: null,
    });

    await useConnectionStore.getState().joinSession(id);
  },

  setMyUsername: (newUsername: string) => {
    const { playerId, players } = get();
    const isHost = useConnectionStore.getState().isHost;
    if (!playerId || !newUsername.trim()) return;
    const updatedPlayers = players.map((p) => (p.id === playerId ? { ...p, username: newUsername } : p));
    set({ players: updatedPlayers });
    if (isHost) {
      broadcast({ type: "players_update", payload: updatedPlayers });
    } else {
      broadcast({ type: "username_change", payload: { id: playerId, newUsername } });
    }
  },

  setDisconnectionMessage: (message: string | null) => {
    set({ disconnectionMessage: message });
  },

  performAction: (action: Omit<GameAction, "playerId">) => {
    const { gameInfo, gameState, playerId, gamePhase } = get();
    if (gamePhase !== "in-game" || !gameInfo || !gameState || !playerId) {
      return;
    }
    const fullAction: GameAction = { ...action, playerId };
    if (!gameInfo.isTurnOf(gameState, playerId)) {
      return;
    }
    const newGameState = gameInfo.handleAction(gameState, fullAction);
    if (newGameState !== gameState) {
      set({ gameState: newGameState });
      broadcast({ type: "game_action", payload: fullAction });
      if (gameInfo.isGameOver(newGameState)) {
        set({ gamePhase: "post-game" });
      }
    }
  },

  updateAndBroadcastState: (newState: any) => {
    const { gameInfo } = get();
    set({ gameState: newState });
    broadcast({ type: "game_state_update", payload: newState });
    if (gameInfo?.isGameOver(newState)) {
      set({ gamePhase: "post-game" });
    }
  },

  startGame: () => {
    const { gameInfo, players } = get();
    if (!gameInfo) return;
    const playerIds = players.map((p) => p.id);
    const newGameState = gameInfo.getInitialState(playerIds);
    set({ gamePhase: "in-game", gameState: newGameState });
    broadcast({ type: "start_game", payload: newGameState });
  },

  playAgain: () => {
    const { gameInfo, players } = get();
    const isHost = useConnectionStore.getState().isHost;
    if (!isHost || !gameInfo) return;
    const playerIds = players.map((p) => p.id);
    const newGameState = gameInfo.getInitialState(playerIds);
    set({ gamePhase: "lobby", gameState: newGameState });
    broadcast({ type: "reset_to_lobby", payload: newGameState });
  },

  leaveGame: async () => {
    await useConnectionStore.getState().leaveSession();
    get().resetStore();
  },

  resetStore: () => {
    set((state) => ({
      gameId: null,
      gameName: null,
      gameInfo: null,
      playerId: null,
      players: [],
      gamePhase: "lobby",
      gameState: null,
      disconnectionMessage: state.disconnectionMessage,
    }));
  },
}));

// --- Inter-Store Communication ---

useConnectionStore.getState().setOnMessage((msg: GameMessage) => {
  const { getState, setState } = useGameStore;
  const { isHost, resetHostConnection } = useConnectionStore.getState();

  switch (msg.type) {
    case "player_join": {
      if (isHost) {
        const { players } = getState();
        if (!players.some((p) => p.id === msg.payload.id)) {
          const newPlayers = [...players, msg.payload];
          setState((s) => ({ ...s, players: newPlayers }));
          broadcast({ type: "players_update", payload: newPlayers });
        }
      }
      break;
    }
    case "players_update": {
      setState((s) => ({ ...s, players: msg.payload }));
      break;
    }
    case "username_change": {
      if (isHost) {
        const { players } = getState();
        const { id, newUsername } = msg.payload;
        const updatedPlayers = players.map((p) => (p.id === id ? { ...p, username: newUsername } : p));
        setState((s) => ({ ...s, players: updatedPlayers }));
        broadcast({ type: "players_update", payload: updatedPlayers });
      }
      break;
    }
    case "player_disconnect": {
      if (isHost) {
        const { playerId, players } = getState();
        const me = players.find((p) => p.id === playerId);
        setState({ players: me ? [me] : [] });
        resetHostConnection();
      } else {
        getState().setDisconnectionMessage("The host has left the game.");
        getState().leaveGame();
      }
      break;
    }
    case "game_action": {
      const { gameInfo, gameState } = getState();
      if (!gameInfo || !gameState) return;
      const newGameState = gameInfo.handleAction(gameState, msg.payload);
      setState((s) => ({
        ...s,
        gameState: newGameState,
        gamePhase: gameInfo.isGameOver(newGameState) ? "post-game" : s.gamePhase,
      }));
      break;
    }
    case "start_game":
    case "game_state_update": {
      const { gameInfo } = getState();
      setState((s) => ({
        ...s,
        gameState: msg.payload,
        gamePhase: msg.type === "start_game" ? "in-game" : s.gamePhase,
      }));
      if (gameInfo?.isGameOver(msg.payload)) {
        setState({ gamePhase: "post-game" });
      }
      break;
    }
    case "reset_to_lobby": {
      setState((s) => ({ ...s, gamePhase: "lobby", gameState: msg.payload }));
      break;
    }
  }
});

useConnectionStore.subscribe((state, prevState) => {
  if (state.dataChannelState === "open" && prevState.dataChannelState !== "open") {
    const { isHost } = state;
    const { playerId, players } = useGameStore.getState();

    if (!isHost && playerId) {
      const me = players.find((p) => p.id === playerId);
      if (me) {
        broadcast({ type: "player_join", payload: me });
      }
    }
  }
});
