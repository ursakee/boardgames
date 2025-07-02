import { create } from "zustand";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  arrayUnion,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useGameStore } from "./gameStore";

// --- Types ---
export type ConnectionState = "idle" | "connecting" | "connected" | "disconnected";
export type DataChannelState = "closed" | "connecting" | "open";
type GameMessage = any;

// --- Interface ---
interface ConnectionStateStore {
  // State
  sessionId: string | null;
  connectionState: ConnectionState;
  dataChannelState: DataChannelState;
  pc: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  unsubscribes: Unsubscribe[];
  isHost: boolean; // Actions

  createSession: () => Promise<string | undefined>;
  joinSession: (id: string) => Promise<void>;
  resetHostConnection: () => Promise<void>;
  sendMessage: (message: GameMessage) => void;
  setOnMessage: (callback: (message: GameMessage) => void) => void;
  leaveSession: () => Promise<void>;
  _reset: () => void;
}

const servers = {
  iceServers: [{ urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }],
  iceCandidatePoolSize: 10,
};

let onMessageCallback: (message: GameMessage) => void = () => {};

const initializePeerConnection = (
  isHost: boolean,
  get: () => ConnectionStateStore,
  set: (partial: Partial<ConnectionStateStore>) => void
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
        get().leaveSession();
        break;
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    set({ dataChannelState: "connecting" });
    channel.onopen = () => set({ dataChannelState: "open" });
    channel.onclose = () => set({ dataChannelState: "closed" });
    channel.onmessage = (event) => {
      if (onMessageCallback) {
        onMessageCallback(JSON.parse(event.data));
      }
    };
    set({ dataChannel: channel });
  };

  if (isHost) {
    const channel = pc.createDataChannel("gameData");
    setupDataChannel(channel);
  } else {
    pc.ondatachannel = (event) => setupDataChannel(event.channel);
  }

  set({ pc });
  return pc;
};

export const useConnectionStore = create<ConnectionStateStore>((set, get) => ({
  sessionId: null,
  connectionState: "idle",
  dataChannelState: "closed",
  pc: null,
  dataChannel: null,
  unsubscribes: [],
  isHost: false,

  setOnMessage: (callback) => {
    onMessageCallback = callback;
  },

  sendMessage: (message) => {
    const { dataChannel } = get();
    if (dataChannel?.readyState === "open") {
      dataChannel.send(JSON.stringify(message));
    }
  },

  createSession: async () => {
    get()._reset();
    set({ isHost: true, connectionState: "connecting" });
    const pc = initializePeerConnection(true, get, set);

    const sessionId = Math.random().toString(36).substring(2, 15);
    const sessionRef = doc(db, "games", sessionId);
    set({ sessionId });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        if (get().sessionId) {
          try {
            await updateDoc(sessionRef, { hostCandidates: arrayUnion(event.candidate.toJSON()) });
          } catch (e) {
            console.warn("Failed to update host candidates, session likely ended.", e);
          }
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await setDoc(sessionRef, {
      offer: { sdp: offer.sdp, type: offer.type },
      hostCandidates: [],
      guestCandidates: [],
    });

    const processedGuestCandidates = new Set<string>();
    const unsub = onSnapshot(sessionRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;

      if (!pc.currentRemoteDescription && data.answer) {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      if (data.guestCandidates) {
        data.guestCandidates.forEach((candidate: RTCIceCandidateInit) => {
          const candidateKey = candidate.candidate;
          if (candidateKey && !processedGuestCandidates.has(candidateKey)) {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
            processedGuestCandidates.add(candidateKey);
          }
        });
      }
    });

    set({ unsubscribes: [unsub] });
    return sessionId;
  },

  joinSession: async (id) => {
    get()._reset();
    set({ isHost: false, sessionId: id, connectionState: "connecting" });
    const pc = initializePeerConnection(false, get, set);

    const sessionRef = doc(db, "games", id);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
      get()._reset();
      return;
    }
    await pc.setRemoteDescription(new RTCSessionDescription(sessionDoc.data().offer));

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await updateDoc(sessionRef, { guestCandidates: arrayUnion(event.candidate.toJSON()) });
        } catch (error) {
          console.warn("Could not update doc with candidate, session may have ended.", error);
        }
      }
    };

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    try {
      await updateDoc(sessionRef, { answer: { type: answer.type, sdp: answer.sdp } });
    } catch (error) {
      console.warn("Could not update doc with answer, session may have ended.", error);
      return;
    }

    const processedHostCandidates = new Set<string>();
    const unsub = onSnapshot(sessionRef, (snapshot) => {
      if (!snapshot.exists()) {
        useGameStore.getState().setDisconnectionMessage("The host has left the game.");
        return;
      }

      const data = snapshot.data();
      if (data?.hostCandidates) {
        data.hostCandidates.forEach((candidate: RTCIceCandidateInit) => {
          const candidateKey = candidate.candidate;
          if (candidateKey && !processedHostCandidates.has(candidateKey)) {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
            processedHostCandidates.add(candidateKey);
          }
        });
      }
    });

    set({ unsubscribes: [unsub] });
  },

  resetHostConnection: async () => {
    const { sessionId, isHost } = get();
    if (!isHost || !sessionId) return;

    get().unsubscribes.forEach((unsub) => unsub());
    get().pc?.close();

    set({ connectionState: "connecting", dataChannelState: "closed", pc: null, dataChannel: null });
    const pc = initializePeerConnection(true, get, set);
    const sessionRef = doc(db, "games", sessionId);

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        if (get().sessionId) {
          await updateDoc(sessionRef, { hostCandidates: arrayUnion(event.candidate.toJSON()) });
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await updateDoc(sessionRef, {
      offer: { sdp: offer.sdp, type: offer.type },
      answer: null,
      guestCandidates: [],
    });

    const processedGuestCandidates = new Set<string>();
    const unsub = onSnapshot(sessionRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      if (!pc.currentRemoteDescription && data.answer) {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
      if (data.guestCandidates) {
        data.guestCandidates.forEach((candidate: RTCIceCandidateInit) => {
          const candidateKey = candidate.candidate;
          if (candidateKey && !processedGuestCandidates.has(candidateKey)) {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
            processedGuestCandidates.add(candidateKey);
          }
        });
      }
    });
    set({ unsubscribes: [unsub] });
  },

  leaveSession: async () => {
    const { sessionId, isHost, pc } = get();

    if (pc && pc.connectionState !== "closed") {
      get().sendMessage({ type: "player_disconnect" });
    }
    const docToDelete = isHost && sessionId ? doc(db, "games", sessionId) : null;
    get()._reset();

    if (docToDelete) {
      await deleteDoc(docToDelete);
    }
  },

  _reset: () => {
    get().unsubscribes.forEach((unsub) => unsub());
    get().dataChannel?.close();
    get().pc?.close();
    set({
      sessionId: null,
      connectionState: "idle",
      dataChannelState: "closed",
      pc: null,
      dataChannel: null,
      unsubscribes: [],
      isHost: false,
    });
  },
}));
