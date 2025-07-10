import { create } from "zustand";
import { useConnectionStore } from "./connectionStore";
import { findGame } from "../games/gameRegistry";
import type { GameAction, GameRegistryEntry, PlayerId } from "../types";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDoc,
  arrayUnion,
  deleteField,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// A module-level lock to prevent race conditions during the join process,
// especially when dealing with React's StrictMode.
let isJoining = false;

// --- Types ---
export type GamePhase = "lobby" | "in-game" | "post-game";

export interface Player {
  id: PlayerId;
  username: string;
}

type GameMessage =
  | { type: "player_leaving" }
  | { type: "username_change"; payload: { newUsername: string } }
  | { type: "game_options_change"; payload: Record<string, any> }
  | { type: "game_action"; payload: GameAction }
  | { type: "start_game"; payload: any }
  | { type: "game_state_update"; payload: any }
  | { type: "sync_players"; payload: Player[] }
  | {
      type: "sync_full_game_state";
      payload: { players: Player[]; gameState: any; gamePhase: GamePhase; gameOptions: Record<string, any> };
    }
  | { type: "return_to_lobby" };

// --- Main State and Actions Interface ---
interface GameState {
  gameId: string | null;
  gameName: string | null;
  gameInfo: GameRegistryEntry | null;
  playerId: PlayerId | null;
  players: Player[];
  gamePhase: GamePhase;
  gameState: any;
  gameOptions: Record<string, any>;
  disconnectionMessage: string | null;
  unsubscribes: Unsubscribe[];

  createGame: (gameName: string) => Promise<string | undefined>;
  joinGame: (id: string, gameName: string) => Promise<"success" | "failed" | "locked">;
  leaveGame: () => Promise<void>;
  notifyLeave: () => void;
  resetSession: () => void;
  clearDisconnectionMessage: () => void;
  setMyUsername: (newUsername: string) => void;
  setGameOptions: (newOptions: Record<string, any>) => void;
  performAction: (action: Omit<GameAction, "playerId">) => void;
  startGame: () => void;
  playAgain: () => void;
  returnToLobby: () => void;

  handleMessage: (message: GameMessage, fromPlayerId: PlayerId) => void;
  handlePlayerConnect: (connectedPlayerId: PlayerId) => void;
  handlePlayerDisconnect: (disconnectedPlayerId: PlayerId) => void;
  resetStore: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  gameId: null,
  gameName: null,
  gameInfo: null,
  playerId: null,
  players: [],
  gamePhase: "lobby",
  gameState: null,
  gameOptions: {},
  disconnectionMessage: null,
  unsubscribes: [],

  createGame: async (gameName: string) => {
    if (get().gameId) return;

    const gameInfo = findGame(gameName);
    if (!gameInfo) return;

    get().resetStore();

    const hostId = "p1";
    const newGameId = doc(collection(db, "games")).id;
    const hostPlayer: Player = { id: hostId, username: "Player 1" };

    const defaultOptions =
      gameInfo.gameOptions?.reduce((acc, opt) => {
        acc[opt.id] = opt.defaultValue;
        return acc;
      }, {} as Record<string, any>) || {};

    set({
      gameId: newGameId,
      gameName,
      gameInfo,
      playerId: hostId,
      players: [hostPlayer],
      gamePhase: "lobby",
      gameOptions: defaultOptions,
    });

    useConnectionStore.getState().initAsHost(newGameId);
    await setDoc(doc(db, "games", newGameId), {
      players: [hostPlayer],
      connections: {},
      gamePhase: "lobby",
      options: defaultOptions,
    });

    const unsub = onSnapshot(doc(db, "games", newGameId), (snapshot) => {
      if (!snapshot.exists()) {
        get().leaveGame();
        return;
      }

      const { players: playersFromFS = [], options: updatedOptions = {} } = snapshot.data();
      const { players: currentLocalPlayers, gameId: currentLobbyId } = get();

      if (currentLobbyId !== newGameId) return;

      if (playersFromFS.length > currentLocalPlayers.length) {
        const localPlayerIds = new Set(currentLocalPlayers.map((p) => p.id));
        const newPlayer = playersFromFS.find((p: Player) => !localPlayerIds.has(p.id));

        if (newPlayer) {
          set((state) => ({ players: [...state.players, newPlayer] }));
          useConnectionStore.getState().initiateConnectionForGuest(newPlayer.id);
          useConnectionStore.getState().broadcastMessage({
            type: "sync_players",
            payload: get().players,
          });
        }
      }
      set({ gameOptions: updatedOptions });
    });

    set({ unsubscribes: [unsub] });
    return newGameId;
  },

  joinGame: async (id: string, gameName: string): Promise<"success" | "failed" | "locked"> => {
    if (isJoining) return "locked";
    isJoining = true;

    try {
      if (get().gameId) return "success";

      const gameInfo = findGame(gameName);
      if (!gameInfo) {
        set({ disconnectionMessage: `Invalid game type: ${gameName}` });
        return "failed";
      }

      const gameRef = doc(db, "games", id);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        set({ disconnectionMessage: "Game not found or has been ended by the host." });
        return "failed";
      }

      const gameData = gameSnap.data();
      const existingPlayers = gameData.players as Player[];

      if (existingPlayers.length >= gameInfo.maxPlayers) {
        set({ disconnectionMessage: "This game lobby is already full." });
        return "failed";
      }

      get().resetStore();

      const unsub = onSnapshot(gameRef, (snapshot) => {
        if (!snapshot.exists()) {
          set({ disconnectionMessage: "The host has left the game." });
        } else {
          const data = snapshot.data();
          if (get().gamePhase !== "in-game" && data.gameState) {
            set({ gameState: data.gameState });
          }
          if (data.options) {
            set({ gameOptions: data.options });
          }
        }
      });

      const guestId = `p${Math.random().toString(36).substring(2, 9)}`;
      const guestPlayer: Player = { id: guestId, username: `Player ${existingPlayers.length + 1}` };

      set({
        gameId: id,
        gameName,
        gameInfo,
        playerId: guestId,
        gamePhase: "lobby",
        gameOptions: gameData.options || {},
        unsubscribes: [unsub],
      });

      await updateDoc(gameRef, { players: arrayUnion(guestPlayer) });
      useConnectionStore.getState().initAsGuest(id, guestId, "p1");
      return "success";
    } finally {
      isJoining = false;
    }
  },

  notifyLeave: () => {
    const { isHost } = useConnectionStore.getState();
    if (!isHost) {
      useConnectionStore.getState().sendMessageToHost({ type: "player_leaving" });
    }
  },

  leaveGame: async () => {
    get().notifyLeave();
    const { isHost } = useConnectionStore.getState();
    const { gameId } = get();

    if (isHost && gameId) {
      await deleteDoc(doc(db, "games", gameId));
    }

    get().resetStore();
  },

  resetSession: () => {
    useConnectionStore.getState().leaveSession();
    get().unsubscribes.forEach((unsub) => unsub());

    set((state) => ({
      gameId: null,
      gameName: state.gameName,
      gameInfo: state.gameInfo,
      playerId: null,
      players: [],
      gamePhase: "lobby",
      gameState: null,
      gameOptions: {},
      unsubscribes: [],
      disconnectionMessage: state.disconnectionMessage,
    }));
  },

  clearDisconnectionMessage: () => {
    set({ disconnectionMessage: null });
  },

  resetStore: () => {
    useConnectionStore.getState().leaveSession();
    get().unsubscribes.forEach((unsub) => unsub());
    set({
      gameId: null,
      gameName: null,
      gameInfo: null,
      playerId: null,
      players: [],
      gamePhase: "lobby",
      gameState: null,
      gameOptions: {},
      disconnectionMessage: null,
      unsubscribes: [],
    });
  },

  setMyUsername: (newUsername: string) => {
    const { playerId, players, gameId } = get();
    const { isHost, sendMessageToHost } = useConnectionStore.getState();
    if (!playerId || !newUsername.trim()) return;

    if (isHost) {
      const updatedPlayers = players.map((p) => (p.id === playerId ? { ...p, username: newUsername } : p));
      set({ players: updatedPlayers });
      useConnectionStore.getState().broadcastMessage({ type: "sync_players", payload: updatedPlayers });
      if (gameId) updateDoc(doc(db, "games", gameId), { players: updatedPlayers });
    } else {
      sendMessageToHost({ type: "username_change", payload: { newUsername } });
    }
  },

  setGameOptions: (newOptions: Record<string, any>) => {
    const { gameId, gameOptions } = get();
    const { isHost } = useConnectionStore.getState();
    if (!isHost || !gameId) return;

    const updatedOptions = { ...gameOptions, ...newOptions };
    set({ gameOptions: updatedOptions });
    updateDoc(doc(db, "games", gameId), { options: updatedOptions });
    // No need to broadcast here, Firestore snapshot listener will handle it
  },

  performAction: (action: Omit<GameAction, "playerId">) => {
    const { playerId, gamePhase } = get();
    const { isHost, sendMessageToHost } = useConnectionStore.getState();
    if (gamePhase !== "in-game" || !playerId) return;

    const fullAction: GameAction = { ...action, playerId };
    if (isHost) {
      get().handleMessage({ type: "game_action", payload: fullAction }, playerId);
    } else {
      sendMessageToHost({ type: "game_action", payload: fullAction });
    }
  },

  startGame: () => {
    const { gameInfo, players, gameId, gameState, gameOptions } = get();
    const { isHost, broadcastMessage } = useConnectionStore.getState();
    if (!isHost || !gameInfo) return;

    const newGameState = gameInfo.getInitialState(
      players.map((p) => p.id),
      gameState,
      gameOptions // Pass the selected options
    );
    const newPhase = "in-game";
    set({ gameState: newGameState, gamePhase: newPhase });

    broadcastMessage({ type: "start_game", payload: newGameState });
    if (gameId) {
      updateDoc(doc(db, "games", gameId), { gameState: newGameState, gamePhase: newPhase });
    }
  },

  playAgain: () => {
    get().startGame();
  },

  returnToLobby: () => {
    const { isHost, broadcastMessage } = useConnectionStore.getState();
    const { gameId } = get();
    if (!isHost || !gameId) return;

    set({ gamePhase: "lobby", gameState: null }); // Clear game board on return
    broadcastMessage({ type: "return_to_lobby" });
    updateDoc(doc(db, "games", gameId), { gamePhase: "lobby", gameState: null });
  },

  handlePlayerConnect: (connectedPlayerId: PlayerId) => {
    const { isHost } = useConnectionStore.getState();
    if (isHost) {
      const { players, gameState, gamePhase, gameOptions } = get();
      useConnectionStore.getState().sendMessageToGuest(connectedPlayerId, {
        type: "sync_full_game_state",
        payload: { players, gameState, gamePhase, gameOptions },
      });
    }
  },

  handleMessage: (message: GameMessage, fromPlayerId: PlayerId) => {
    const { isHost } = useConnectionStore.getState();
    if (!isHost) return;

    const { players, gameId, gameInfo, gameState } = get();

    switch (message.type) {
      case "player_leaving": {
        get().handlePlayerDisconnect(fromPlayerId);
        break;
      }
      case "username_change": {
        const updatedPlayers = players.map((p) =>
          p.id === fromPlayerId ? { ...p, username: message.payload.newUsername } : p
        );
        set({ players: updatedPlayers });
        useConnectionStore.getState().broadcastMessage({ type: "sync_players", payload: updatedPlayers });
        if (gameId) updateDoc(doc(db, "games", gameId), { players: updatedPlayers });
        break;
      }
      case "game_action": {
        if (!gameInfo || !gameState || !gameInfo.isTurnOf(gameState, message.payload.playerId)) return;
        const newGameState = gameInfo.handleAction(gameState, message.payload);
        const newPhase = gameInfo.isGameOver(newGameState) ? "post-game" : "in-game";
        set({ gameState: newGameState, gamePhase: newPhase });
        useConnectionStore.getState().broadcastMessage({ type: "game_state_update", payload: newGameState });
        if (gameId) {
          updateDoc(doc(db, "games", gameId), { gameState: newGameState, gamePhase: newPhase });
        }
        break;
      }
    }
  },

  handlePlayerDisconnect: async (disconnectedPlayerId: PlayerId) => {
    const { isHost, broadcastMessage } = useConnectionStore.getState();
    if (isHost) {
      const { gameId, players, gameInfo, gameOptions, gamePhase } = get();
      if (!gameInfo) return;

      const updatedPlayers = players.filter((p) => p.id !== disconnectedPlayerId);

      if (updatedPlayers.length < players.length) {
        if (gamePhase === "in-game" && updatedPlayers.length >= gameInfo.minPlayers) {
          set({ players: updatedPlayers });

          if (gameId) {
            await updateDoc(doc(db, "games", gameId), {
              players: updatedPlayers,
              [`connections.${disconnectedPlayerId}`]: deleteField(),
            });
          }

          broadcastMessage({
            type: "sync_players",
            payload: updatedPlayers,
          });
        } else {
          const newGameState = null;
          const newPhase = "lobby";

          set({
            players: updatedPlayers,
            gameState: newGameState,
            gamePhase: newPhase,
          });

          if (gameId) {
            await updateDoc(doc(db, "games", gameId), {
              players: updatedPlayers,
              gameState: newGameState,
              gamePhase: newPhase,
              [`connections.${disconnectedPlayerId}`]: deleteField(),
            });
          }

          broadcastMessage({
            type: "sync_full_game_state",
            payload: { players: updatedPlayers, gameState: newGameState, gamePhase: newPhase, gameOptions },
          });
        }
      }
    } else {
      if (disconnectedPlayerId === "p1") {
        set({ disconnectionMessage: "The host has disconnected." });
      }
    }
  },
}));

useConnectionStore.setState({
  onMessageCallback: (message, fromPlayerId) => {
    const { getState, setState } = useGameStore;
    const { isHost } = useConnectionStore.getState();

    if (isHost) {
      getState().handleMessage(message, fromPlayerId);
    }

    switch (message.type) {
      case "sync_full_game_state":
        setState({
          players: message.payload.players,
          gameState: message.payload.gameState,
          gamePhase: message.payload.gamePhase,
          gameOptions: message.payload.gameOptions,
        });
        break;
      case "sync_players":
        setState({ players: message.payload });
        break;
      case "start_game":
        setState({ gameState: message.payload, gamePhase: "in-game" });
        break;
      case "game_state_update":
        const gameInfo = getState().gameInfo;
        const newGameState = message.payload;
        setState({
          gameState: newGameState,
          gamePhase: gameInfo?.isGameOver(newGameState) ? "post-game" : "in-game",
        });
        break;
      case "return_to_lobby":
        setState({ gamePhase: "lobby", gameState: null });
        break;
    }
  },
});
