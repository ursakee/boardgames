import { create } from "zustand";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getInitialState as getTicTacToeState } from "../games/tic-tac-toe/logic";

// --- Types ---
export type PlayerSymbol = "X" | "O";
export type GamePhase = "lobby" | "in-game" | "post-game";

export interface Player {
  id: string;
  username: string;
}

// A more robust, typed message system for our data channel
type GameMessage =
  | { type: "player_join"; payload: Player }
  | { type: "players_update"; payload: Player[] }
  | { type: "username_change"; payload: { id: string; newUsername: string } }
  | { type: "start_game"; payload: any }
  | { type: "game_state_update"; payload: any }
  | { type: "reset_to_lobby"; payload: any };

interface GameState {
  // Core State
  gameId: string | null;
  playerSymbol: PlayerSymbol | null;
  players: Player[];
  gamePhase: GamePhase;
  gameState: any;

  // WebRTC
  pc: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  unsubscribes: (() => void)[];

  // Actions
  setGameState: (newState: any) => void;
  initializeConnection: (isHost: boolean) => void;
  setupDataChannel: () => void;
  createGame: (gameName: string) => Promise<void>;
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

const gameInitialStates: { [key: string]: () => any } = {
  "tic-tac-toe": getTicTacToeState,
};

export const useGameStore = create<GameState>((set, get) => ({
  // --- Initial State ---
  gameId: null,
  playerSymbol: null,
  players: [],
  gamePhase: "lobby",
  gameState: null,
  pc: null,
  dataChannel: null,
  unsubscribes: [],

  // --- State Modifiers ---
  setGameState: (newState: any) => set({ gameState: newState }),

  // --- Core Actions ---
  initializeConnection: (isHost) => {
    const newPc = new RTCPeerConnection(servers);
    set({ pc: newPc });

    if (isHost) {
      const channel = newPc.createDataChannel("gameData");
      set({ dataChannel: channel });
      get().setupDataChannel();
    } else {
      newPc.ondatachannel = (event) => {
        set({ dataChannel: event.channel });
        get().setupDataChannel();
      };
    }
  },

  setupDataChannel: () => {
    const { dataChannel, playerSymbol } = get();
    if (!dataChannel) return;

    dataChannel.onopen = () => {
      console.log("Data channel is open.");
      if (playerSymbol === "O") {
        const localPlayer: Player = { id: "O", username: "Player O" };
        const message: GameMessage = { type: "player_join", payload: localPlayer };
        dataChannel.send(JSON.stringify(message));
      }
    };

    dataChannel.onmessage = (event) => {
      const msg = JSON.parse(event.data) as GameMessage;
      const { players, playerSymbol, broadcastPlayers } = get();

      switch (msg.type) {
        case "player_join": {
          if (playerSymbol === "X") {
            // Host receives a new player
            const newPlayers = [...players, msg.payload];
            set({ players: newPlayers });
            broadcastPlayers(newPlayers); // Broadcast the updated list
          }
          break;
        }
        case "players_update": {
          // All clients receive the authoritative list from the host
          set({ players: msg.payload });
          break;
        }
        case "username_change": {
          if (playerSymbol === "X") {
            // Host processes the change request
            const { id, newUsername } = msg.payload;
            const updatedPlayers = players.map((p) => (p.id === id ? { ...p, username: newUsername } : p));
            set({ players: updatedPlayers });
            broadcastPlayers(updatedPlayers);
          }
          break;
        }
        case "start_game": {
          set({ gamePhase: "in-game", gameState: msg.payload });
          break;
        }
        case "game_state_update": {
          set({ gameState: msg.payload });
          if (msg.payload.winner) {
            set({ gamePhase: "post-game" });
          }
          break;
        }
        case "reset_to_lobby": {
          set({ gamePhase: "lobby", gameState: msg.payload });
          break;
        }
      }
    };
  },

  createGame: async (_gameName: string) => {
    get().resetStore();
    set({ playerSymbol: "X" });
    get().initializeConnection(true);

    const newPc = get().pc!;
    const newGameId = Math.random().toString(36).substring(2, 9);
    set({ gameId: newGameId });

    const hostPlayer: Player = { id: "X", username: "Player X" };
    set({ players: [hostPlayer] });

    const gameRef = doc(db, "games", newGameId);
    const candidatesCollection = collection(db, "games", newGameId, "hostCandidates");
    newPc.onicecandidate = async (event) => {
      if (event.candidate) await addDoc(candidatesCollection, event.candidate.toJSON());
    };

    const offerDescription = await newPc.createOffer();
    await newPc.setLocalDescription(offerDescription);
    await setDoc(gameRef, { offer: { sdp: offerDescription.sdp, type: offerDescription.type } });

    const unsubGame = onSnapshot(gameRef, (snapshot) => {
      const data = snapshot.data();
      if (!newPc.currentRemoteDescription && data?.answer) {
        newPc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    const guestCandidatesCollection = collection(db, "games", newGameId, "guestCandidates");
    const unsubGuestCandidates = onSnapshot(guestCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") newPc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      });
    });

    set((state) => ({ unsubscribes: [...state.unsubscribes, unsubGame, unsubGuestCandidates] }));
  },

  joinGame: async (id: string) => {
    get().resetStore();
    set({ playerSymbol: "O", gameId: id });
    get().initializeConnection(false);

    const newPc = get().pc!;
    const gameRef = doc(db, "games", id);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      alert("Game not found!");
      get().resetStore();
      return;
    }

    const candidatesCollection = collection(db, "games", id, "guestCandidates");
    newPc.onicecandidate = async (event) => {
      if (event.candidate) await addDoc(candidatesCollection, event.candidate.toJSON());
    };

    await newPc.setRemoteDescription(new RTCSessionDescription(gameDoc.data().offer));
    const answerDescription = await newPc.createAnswer();
    await newPc.setLocalDescription(answerDescription);
    await updateDoc(gameRef, { answer: { type: answerDescription.type, sdp: answerDescription.sdp } });

    const hostCandidatesCollection = collection(db, "games", id, "hostCandidates");
    const unsubHostCandidates = onSnapshot(hostCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") newPc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      });
    });

    set((state) => ({ unsubscribes: [...state.unsubscribes, unsubHostCandidates] }));
  },

  setMyUsername: (newUsername: string) => {
    const { playerSymbol, players, dataChannel } = get();
    if (!playerSymbol || !newUsername.trim()) return;

    if (playerSymbol === "X") {
      // Host updates locally and broadcasts
      const updatedPlayers = players.map((p) => (p.id === "X" ? { ...p, username: newUsername } : p));
      set({ players: updatedPlayers });
      get().broadcastPlayers(updatedPlayers);
    } else {
      // Guest sends a request to the host
      const message: GameMessage = { type: "username_change", payload: { id: playerSymbol, newUsername } };
      dataChannel?.send(JSON.stringify(message));
    }
  },

  broadcastPlayers: (players: Player[]) => {
    const { dataChannel } = get();
    const message: GameMessage = { type: "players_update", payload: players };
    dataChannel?.send(JSON.stringify(message));
  },

  updateAndBroadcastState: (newGameState: any) => {
    const { dataChannel } = get();
    const message: GameMessage = { type: "game_state_update", payload: newGameState };
    dataChannel?.send(JSON.stringify(message));
    get().setGameState(newGameState);
    if (newGameState.winner) {
      set({ gamePhase: "post-game" });
    }
  },

  startGame: () => {
    const { dataChannel, gameState } = get();
    const message: GameMessage = { type: "start_game", payload: gameState };
    dataChannel?.send(JSON.stringify(message));
    set({ gamePhase: "in-game" });
  },

  playAgain: (gameName: string) => {
    if (get().playerSymbol !== "X") return;

    const getInitial = gameInitialStates[gameName];
    if (!getInitial) return;

    const newGameState = getInitial();
    set({ gamePhase: "lobby", gameState: newGameState });

    const { dataChannel } = get();
    const message: GameMessage = { type: "reset_to_lobby", payload: newGameState };
    dataChannel?.send(JSON.stringify(message));
  },

  leaveGame: async () => {
    const { gameId, playerSymbol, unsubscribes, pc, dataChannel } = get();
    if (gameId && playerSymbol === "X") {
      // A proper implementation would use a Cloud Function to recursively delete subcollections.
      // For now, we just delete the main game document.
      await deleteDoc(doc(db, "games", gameId));
    }
    unsubscribes.forEach((unsub) => unsub());
    dataChannel?.close();
    pc?.close();
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
      pc: null,
      dataChannel: null,
      unsubscribes: [],
    });
  },
}));
