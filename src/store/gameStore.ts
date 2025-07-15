import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useConnectionStore } from "./connectionStore";
import { findGame } from "../games/gameRegistry";
import * as gameService from "../services/gameService";
import type { GameAction, PlayerId } from "../types";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";

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
  | { type: "private_state_update"; payload: any }
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
  playerId: PlayerId | null;
  players: Player[];
  gamePhase: GamePhase;
  gameState: any;
  gameOptions: Record<string, any>;
  privateState: any;
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
  returnToLobby: () => void;
  handleMessage: (message: GameMessage, fromPlayerId: PlayerId) => void;
  handlePlayerConnect: (connectedPlayerId: PlayerId) => void;
  handlePlayerDisconnect: (disconnectedPlayerId: PlayerId) => void;
  resetStore: () => void;
}

export const useGameStore = create(
  immer<GameState>((set, get) => ({
    gameId: null,
    gameName: null,
    playerId: null,
    players: [],
    gamePhase: "lobby",
    gameState: null,
    gameOptions: {},
    privateState: null,
    disconnectionMessage: null,
    unsubscribes: [],

    createGame: async (gameName: string) => {
      if (get().gameId) return;
      const gameInfo = findGame(gameName);
      if (!gameInfo) return;

      get().resetStore();
      const hostId = "p1";
      const hostPlayer: Player = { id: hostId, username: "Player 1" };
      const newGameId = await gameService.createGameInFirestore(gameInfo, hostPlayer);

      set((state) => {
        state.gameId = newGameId;
        state.gameName = gameName;
        state.playerId = hostId;
        state.players = [hostPlayer];
        state.gamePhase = "lobby";
        state.gameOptions =
          gameInfo.gameOptions?.reduce((acc, opt) => {
            acc[opt.id] = opt.defaultValue;
            return acc;
          }, {} as Record<string, any>) || {};
      });

      useConnectionStore.getState().initAsHost(newGameId);

      const unsub = onSnapshot(doc(db, "games", newGameId), (snapshot) => {
        if (!snapshot.exists()) {
          get().leaveGame();
          return;
        }
        const data = snapshot.data();
        const { players: currentLocalPlayers, gameId: currentLobbyId } = get();
        if (currentLobbyId !== newGameId) return;

        if (data.players.length > currentLocalPlayers.length) {
          const localPlayerIds = new Set(currentLocalPlayers.map((p) => p.id));
          const newPlayer = data.players.find((p: Player) => !localPlayerIds.has(p.id));
          if (newPlayer) {
            const updatedPlayers = [...get().players, newPlayer];
            set({ players: updatedPlayers });
            useConnectionStore.getState().broadcastMessage({ type: "sync_players", payload: updatedPlayers });
            useConnectionStore.getState().initiateConnectionForGuest(newPlayer.id);
          }
        }
        set((state) => {
          state.gameOptions = data.options;
        });
      });

      set((state) => {
        state.unsubscribes = [unsub];
      });
      return newGameId;
    },

    joinGame: async (id: string, gameName: string) => {
      if (isJoining) return "locked";
      isJoining = true;

      try {
        if (get().gameId) return "success";
        const gameInfo = findGame(gameName);
        if (!gameInfo) throw new Error(`Invalid game type: ${gameName}`);

        const gameData = await gameService.joinGameInFirestore(id, gameInfo);

        get().resetStore();

        const guestId = `p${Math.random().toString(36).substring(2, 9)}`;
        const guestPlayer: Player = { id: guestId, username: `Player ${gameData.players.length + 1}` };

        set((state) => {
          state.gameId = id;
          state.gameName = gameName;
          state.playerId = guestId;
          state.players = [...gameData.players, guestPlayer];
          state.gamePhase = "lobby";
          state.gameOptions = gameData.options || {};
        });

        useConnectionStore.getState().initAsGuest(id, guestId, "p1");

        await gameService.addPlayerToFirestore(id, guestPlayer);

        return "success";
      } catch (error: any) {
        set({ disconnectionMessage: error.message });
        return "failed";
      } finally {
        isJoining = false;
      }
    },

    leaveGame: async () => {
      get().notifyLeave();
      const { isHost } = useConnectionStore.getState();
      const { gameId } = get();
      if (isHost && gameId) {
        await gameService.deleteGameInFirestore(gameId);
      }
      get().resetStore();
    },

    notifyLeave: () => {
      const { isHost } = useConnectionStore.getState();
      if (!isHost) {
        useConnectionStore.getState().sendMessageToHost({ type: "player_leaving" });
      }
    },

    setMyUsername: (newUsername: string) => {
      const { playerId, players, gameId } = get();
      const { isHost, sendMessageToHost } = useConnectionStore.getState();
      if (!playerId || !newUsername.trim()) return;

      if (isHost) {
        const updatedPlayers = players.map((p) => (p.id === playerId ? { ...p, username: newUsername } : p));
        set((state) => {
          state.players = updatedPlayers;
        });
        useConnectionStore.getState().broadcastMessage({ type: "sync_players", payload: updatedPlayers });
        if (gameId) gameService.updatePlayersInFirestore(gameId, updatedPlayers);
      } else {
        sendMessageToHost({ type: "username_change", payload: { newUsername } });
      }
    },

    setGameOptions: (newOptions: Record<string, any>) => {
      const { gameId, gameOptions } = get();
      const { isHost, broadcastMessage } = useConnectionStore.getState();
      if (!isHost || !gameId) return;

      const updatedOptions = { ...gameOptions, ...newOptions };
      set({ gameOptions: updatedOptions });
      gameService.updateOptionsInFirestore(gameId, updatedOptions);
      broadcastMessage({ type: "game_options_change", payload: updatedOptions });
    },

    startGame: () => {
      const { players, gameId, gameState, gameOptions, gameName } = get();
      const gameInfo = findGame(gameName!);
      const { isHost, broadcastMessage } = useConnectionStore.getState();
      if (!isHost || !gameInfo) return;

      const newGameState = gameInfo.getInitialState(
        players.map((p) => p.id),
        gameState,
        gameOptions
      );
      const newPhase = "in-game";
      set((state) => {
        state.gameState = newGameState;
        state.gamePhase = newPhase;
      });

      broadcastMessage({ type: "start_game", payload: newGameState });
      if (gameId) {
        gameService.updateGameStateInFirestore(gameId, newGameState, newPhase);
      }
    },

    returnToLobby: () => {
      const { isHost, broadcastMessage } = useConnectionStore.getState();
      const { gameId } = get();
      if (!isHost || !gameId) return;

      set((state) => {
        state.gamePhase = "lobby";
        state.gameState = null;
        state.privateState = null;
      });
      broadcastMessage({ type: "return_to_lobby" });
      gameService.updateGameStateInFirestore(gameId, null, "lobby");
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

    handleMessage: (message: GameMessage, fromPlayerId: PlayerId) => {
      const { isHost } = useConnectionStore.getState();
      if (!isHost) return;
      const { players, gameId, gameState, gameName } = get();
      const gameInfo = findGame(gameName!);

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
          if (gameId) gameService.updatePlayersInFirestore(gameId, updatedPlayers);
          break;
        }
        case "game_action": {
          if (!gameInfo || !gameState || !gameInfo.isTurnOf(gameState, message.payload.playerId)) return;

          const result = gameInfo.handleAction(gameState, message.payload);

          let newGameState: any;
          let privateStates: Record<PlayerId, any> | null = null;

          if (result && typeof result === "object" && "publicState" in result) {
            newGameState = result.publicState;
            privateStates = result.privateStates;
          } else {
            newGameState = result;
          }

          const newPhase = gameInfo.isGameOver(newGameState) ? "post-game" : "in-game";
          set({ gameState: newGameState, gamePhase: newPhase, privateState: privateStates?.[get().playerId!] ?? null });

          useConnectionStore.getState().broadcastMessage({ type: "game_state_update", payload: newGameState });

          if (privateStates) {
            for (const playerId in privateStates) {
              if (playerId !== get().playerId) {
                useConnectionStore.getState().sendMessageToGuest(playerId, {
                  type: "private_state_update",
                  payload: privateStates[playerId],
                });
              }
            }
          }

          if (gameId) {
            gameService.updateGameStateInFirestore(gameId, newGameState, newPhase);
          }
          break;
        }
      }
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

    handlePlayerDisconnect: async (disconnectedPlayerId: PlayerId) => {
      const { isHost, broadcastMessage } = useConnectionStore.getState();
      if (isHost) {
        const { gameId, players, gameOptions, gamePhase, gameName } = get();
        const gameInfo = findGame(gameName!);
        if (!gameInfo) return;

        const updatedPlayers = players.filter((p) => p.id !== disconnectedPlayerId);
        if (updatedPlayers.length >= players.length) return;

        await gameService.removePlayerConnectionInFirestore(gameId!, disconnectedPlayerId);

        if (gamePhase === "in-game" && updatedPlayers.length >= gameInfo.minPlayers) {
          set({ players: updatedPlayers });
          await gameService.updatePlayersInFirestore(gameId!, updatedPlayers);
          broadcastMessage({ type: "sync_players", payload: updatedPlayers });
        } else {
          set({ players: updatedPlayers, gameState: null, gamePhase: "lobby" });
          await gameService.updatePlayersInFirestore(gameId!, updatedPlayers);
          await gameService.updateGameStateInFirestore(gameId!, null, "lobby");
          broadcastMessage({
            type: "sync_full_game_state",
            payload: { players: updatedPlayers, gameState: null, gamePhase: "lobby", gameOptions },
          });
        }
      } else {
        if (disconnectedPlayerId === "p1") {
          set({ disconnectionMessage: "The host has disconnected." });
        }
      }
    },

    resetStore: () => {
      useConnectionStore.getState().leaveSession();
      get().unsubscribes.forEach((unsub) => unsub());
      set({
        gameId: null,
        gameName: null,
        playerId: null,
        players: [],
        gamePhase: "lobby",
        gameState: null,
        gameOptions: {},
        privateState: null,
        disconnectionMessage: null,
        unsubscribes: [],
      });
    },

    resetSession: () => {
      useConnectionStore.getState().leaveSession();
      get().unsubscribes.forEach((unsub) => unsub());
      set((state) => ({
        gameId: null,
        playerId: null,
        players: [],
        gamePhase: "lobby",
        gameState: null,
        gameOptions: {},
        privateState: null,
        unsubscribes: [],
        gameName: state.gameName,
        disconnectionMessage: state.disconnectionMessage,
      }));
    },

    clearDisconnectionMessage: () => {
      set({ disconnectionMessage: null });
    },
  }))
);

// This part connects the two stores
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
        const gameName = getState().gameName;
        const gameInfo = findGame(gameName!);
        const newGameState = message.payload;
        setState({
          gameState: newGameState,
          gamePhase: gameInfo?.isGameOver(newGameState) ? "post-game" : "in-game",
        });
        break;
      case "private_state_update":
        setState({ privateState: message.payload });
        break;
      case "game_options_change":
        setState({ gameOptions: message.payload });
        break;
      case "return_to_lobby":
        setState({ gamePhase: "lobby", gameState: null, privateState: null });
        break;
    }
  },
});
