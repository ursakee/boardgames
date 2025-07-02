import { create } from "zustand";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, deleteDoc, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";
import { findGame } from "../games/gameRegistry";

// --- Types ---
export type PlayerSymbol = "X" | "O";
export type GamePhase = "lobby" | "in-game" | "post-game";
export type ConnectionState = "idle" | "connecting" | "connected" | "disconnected";

export interface Player {
  id: string;
  username: string;
}

type GameMessage =
  | { type: "player_join"; payload: Player }
  | { type: "players_update"; payload: Player[] }
  | { type: "username_change"; payload: { id: string; newUsername: string } }
  | { type: "start_game"; payload: any }
  | { type: "game_state_update"; payload: any }
  | { type: "reset_to_lobby"; payload: any }
  | { type: "player_disconnect" };

// --- Main State and Actions Interface ---
interface GameState {
  // Core State
  gameId: string | null;
  playerSymbol: PlayerSymbol | null;
  players: Player[];
  gamePhase: GamePhase;
  gameState: any;
  connectionState: ConnectionState;

  // WebRTC
  pc: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  unsubscribes: (() => void)[];

  // Actions
  setGameState: (newState: any) => void;
  createGame: () => Promise<string | undefined>; // MODIFIED: Returns the game ID
  joinGame: (id: string) => Promise<void>;
  setMyUsername: (newUsername: string) => void;
  broadcastPlayers: (players: Player[]) => void;
  updateAndBroadcastState: (newState: any) => void;
  startGame: () => void;
  playAgain: (gameName: string) => void;
  leaveGame: () => Promise<void>;
  resetStore: () => void;
}

const servers = {
  iceServers: [{ urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }],
  iceCandidatePoolSize: 10,
};

// --- Helper Functions ---
const broadcastMessage = (dataChannel: RTCDataChannel | null, message: GameMessage) => {
  if (dataChannel?.readyState === "open") {
    dataChannel.send(JSON.stringify(message));
  }
};

const initializeConnection = (
  isHost: boolean,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void
): RTCPeerConnection => {
  const pc = new RTCPeerConnection(servers);

  pc.onconnectionstatechange = () => {
    switch (pc.connectionState) {
      case "connecting":
        set({ connectionState: "connecting" });
        break;
      case "connected":
        set({ connectionState: "connected" });
        break;
      case "disconnected":
      case "failed":
      case "closed":
        set({ connectionState: "disconnected" });
        break;
    }
  };

  if (isHost) {
    const channel = pc.createDataChannel("gameData");
    set({ dataChannel: channel });
    setupDataChannel(get, set);
  } else {
    pc.ondatachannel = (event) => {
      set({ dataChannel: event.channel });
      setupDataChannel(get, set);
    };
  }
  set({ pc });
  return pc;
};

const setupDataChannel = (get: () => GameState, set: (partial: Partial<GameState>) => void) => {
  const { dataChannel } = get();
  if (!dataChannel) return;

  dataChannel.onopen = () => {
    set({ connectionState: "connected" });
    if (get().playerSymbol === "O") {
      const localPlayer: Player = { id: "O", username: "Player O" };
      const message: GameMessage = { type: "player_join", payload: localPlayer };
      broadcastMessage(dataChannel, message);
    }
  };

  dataChannel.onclose = () => {
    set({ connectionState: "disconnected" });
  };

  dataChannel.onmessage = (event) => {
    const msg = JSON.parse(event.data) as GameMessage;
    const { players, playerSymbol } = get();
    const gameInfo = findGame("tic-tac-toe");

    switch (msg.type) {
      case "player_join": {
        if (playerSymbol === "X") {
          const newPlayers = [...players, msg.payload];
          set({ players: newPlayers });
          get().broadcastPlayers(newPlayers);
        }
        break;
      }
      case "players_update": {
        set({ players: msg.payload });
        break;
      }
      case "username_change": {
        if (playerSymbol === "X") {
          const { id, newUsername } = msg.payload;
          const updatedPlayers = players.map((p) => (p.id === id ? { ...p, username: newUsername } : p));
          set({ players: updatedPlayers });
          get().broadcastPlayers(updatedPlayers);
        }
        break;
      }
      case "start_game": {
        set({ gamePhase: "in-game", gameState: msg.payload });
        break;
      }
      case "game_state_update": {
        set({ gameState: msg.payload });
        if (gameInfo?.isGameOver(msg.payload)) {
          set({ gamePhase: "post-game" });
        }
        break;
      }
      case "reset_to_lobby": {
        set({ gamePhase: "lobby", gameState: msg.payload });
        break;
      }
      case "player_disconnect": {
        set({ connectionState: "disconnected" });
        break;
      }
    }
  };
};

// --- Zustand Store Implementation ---
export const useGameStore = create<GameState>((set, get) => ({
  // Initial State...
  gameId: null,
  playerSymbol: null,
  players: [],
  gamePhase: "lobby",
  gameState: null,
  connectionState: "idle",
  pc: null,
  dataChannel: null,
  unsubscribes: [],

  // Actions...
  setGameState: (newState: any) => set({ gameState: newState }),

  createGame: async () => {
    try {
      get().resetStore();
      set({ playerSymbol: "X", connectionState: "connecting" });
      const pc = initializeConnection(true, get, set);

      // Generate a unique ID for the game
      const gameId = Math.random().toString(36).substring(2, 15); // Or use a proper UUID library
      set({ gameId, players: [{ id: "X", username: "Player X" }] });

      const newGameRef = doc(db, "games", gameId);

      let hostCandidatesAdded = 0;

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await updateDoc(newGameRef, { hostCandidates: arrayUnion(event.candidate.toJSON()) });
        }
      };

      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      await setDoc(newGameRef, {
        offer: { sdp: offerDescription.sdp, type: offerDescription.type },
        hostCandidates: [],
        guestCandidates: [],
      });

      const unsubGame = onSnapshot(newGameRef, (snapshot) => {
        const data = snapshot.data();
        if (!data) return;
        if (!pc.currentRemoteDescription && data.answer) {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
        if (data.guestCandidates) {
          const newCandidates = data.guestCandidates.slice(hostCandidatesAdded);
          newCandidates.forEach((candidate: any) => pc.addIceCandidate(new RTCIceCandidate(candidate)));
          hostCandidatesAdded = data.guestCandidates.length;
        }
      });

      set({ unsubscribes: [...get().unsubscribes, unsubGame] });
      return gameId; // MODIFIED: Return the ID
    } catch (error) {
      console.error("Error creating game:", error);
      get().resetStore();
      return undefined;
    }
  },

  joinGame: async (id: string) => {
    get().resetStore();
    set({ playerSymbol: "O", gameId: id, connectionState: "connecting" });
    const pc = initializeConnection(false, get, set);

    const gameRef = doc(db, "games", id);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      alert("Game not found!");
      get().resetStore();
      return;
    }

    let guestCandidatesAdded = 0;
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await updateDoc(gameRef, { guestCandidates: arrayUnion(event.candidate.toJSON()) });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(gameDoc.data().offer));
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);
    await updateDoc(gameRef, { answer: { type: answerDescription.type, sdp: answerDescription.sdp } });

    const unsubGame = onSnapshot(gameRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.hostCandidates) {
        const newCandidates = data.hostCandidates.slice(guestCandidatesAdded);
        newCandidates.forEach((candidate: any) => pc.addIceCandidate(new RTCIceCandidate(candidate)));
        guestCandidatesAdded = data.hostCandidates.length;
      }
    });

    set({ unsubscribes: [...get().unsubscribes, unsubGame] });
  },

  setMyUsername: (newUsername: string) => {
    const { playerSymbol, players, dataChannel } = get();
    if (!playerSymbol || !newUsername.trim()) return;
    if (playerSymbol === "X") {
      const updatedPlayers = players.map((p) => (p.id === "X" ? { ...p, username: newUsername } : p));
      set({ players: updatedPlayers });
      get().broadcastPlayers(updatedPlayers);
    } else {
      broadcastMessage(dataChannel, { type: "username_change", payload: { id: playerSymbol, newUsername } });
    }
  },

  broadcastPlayers: (players: Player[]) => {
    broadcastMessage(get().dataChannel, { type: "players_update", payload: players });
  },

  updateAndBroadcastState: (newState: any) => {
    const gameInfo = findGame("tic-tac-toe");
    broadcastMessage(get().dataChannel, { type: "game_state_update", payload: newState });
    set({ gameState: newState });
    if (gameInfo?.isGameOver(newState)) {
      set({ gamePhase: "post-game" });
    }
  },

  startGame: () => {
    broadcastMessage(get().dataChannel, { type: "start_game", payload: get().gameState });
    set({ gamePhase: "in-game" });
  },

  playAgain: (gameName: string) => {
    if (get().playerSymbol !== "X") return;
    const gameInfo = findGame(gameName);
    if (!gameInfo) return;
    const newGameState = gameInfo.getInitialState();
    set({ gamePhase: "lobby", gameState: newGameState });
    broadcastMessage(get().dataChannel, { type: "reset_to_lobby", payload: newGameState });
  },

  leaveGame: async () => {
    const { gameId, playerSymbol, dataChannel } = get();
    if (gameId && playerSymbol === "X") {
      await deleteDoc(doc(db, "games", gameId));
    }
    broadcastMessage(dataChannel, { type: "player_disconnect" });
    get().resetStore();
  },

  resetStore: () => {
    get().unsubscribes.forEach((unsub) => unsub());
    get().dataChannel?.close();
    get().pc?.close();
    set({
      gameId: null,
      playerSymbol: null,
      players: [],
      gamePhase: "lobby",
      gameState: null,
      connectionState: "idle",
      pc: null,
      dataChannel: null,
      unsubscribes: [],
    });
  },
}));
