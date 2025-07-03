import { create } from "zustand";
import { doc, onSnapshot, updateDoc, type Unsubscribe, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useGameStore } from "./gameStore";
import type { PlayerId } from "../types";

// --- Types ---
export type ConnectionState = "idle" | "connecting" | "connected" | "disconnected" | "failed" | "closed";
export type DataChannelState = "closed" | "connecting" | "open";
type GameMessage = any;

interface ConnectionSlot {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  hostCandidates?: RTCIceCandidateInit[];
  guestCandidates?: RTCIceCandidateInit[];
}

interface ConnectionStateStore {
  gameId: string | null;
  isHost: boolean;
  peerConnections: Map<PlayerId, RTCPeerConnection>;
  dataChannels: Map<PlayerId, RTCDataChannel>;
  peerConnectionStates: Map<PlayerId, ConnectionState>;
  onMessageCallback: (message: GameMessage, fromPlayerId: PlayerId) => void;
  unsubscribes: Unsubscribe[];

  initAsHost: (gameId: string) => void;
  initAsGuest: (gameId: string, selfId: PlayerId, hostId: PlayerId) => void;
  initiateConnectionForGuest: (guestId: PlayerId) => Promise<void>;
  broadcastMessage: (message: GameMessage) => void;
  sendMessageToHost: (message: GameMessage) => void;
  sendMessageToGuest: (guestId: PlayerId, message: GameMessage) => void;
  leaveSession: () => Promise<void>;
  _reset: () => void;
}

const servers = {
  iceServers: [{ urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }],
  iceCandidatePoolSize: 10,
};

const _createPeerConnection = (
  gameId: string,
  peerId: PlayerId,
  isHost: boolean,
  get: () => ConnectionStateStore,
  set: (
    partial: Partial<Partial<ConnectionStateStore>> | ((state: ConnectionStateStore) => Partial<ConnectionStateStore>)
  ) => void
): RTCPeerConnection => {
  const pc = new RTCPeerConnection(servers);

  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      const field = isHost ? `connections.${peerId}.hostCandidates` : `connections.${peerId}.guestCandidates`;
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, { [field]: arrayUnion(event.candidate.toJSON()) });
    }
  };

  pc.onconnectionstatechange = () => {
    const newState = pc.connectionState as ConnectionState;
    set((state) => ({
      peerConnectionStates: new Map(state.peerConnectionStates).set(peerId, newState),
    }));

    if (newState === "disconnected" || newState === "failed" || newState === "closed") {
      useGameStore.getState().handlePlayerDisconnect(peerId);
      get().peerConnections.get(peerId)?.close();
      set((state) => {
        const newPcs = new Map(state.peerConnections);
        newPcs.delete(peerId);
        const newDcs = new Map(state.dataChannels);
        newDcs.delete(peerId);
        return { peerConnections: newPcs, dataChannels: newDcs };
      });
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      useGameStore.getState().handlePlayerConnect(peerId);
    };
    channel.onmessage = (event) => {
      get().onMessageCallback(JSON.parse(event.data), peerId);
    };
    channel.onclose = () => {};
    set((state) => ({ dataChannels: new Map(state.dataChannels).set(peerId, channel) }));
  };

  if (isHost) {
    const channel = pc.createDataChannel("gameData");
    setupDataChannel(channel);
  } else {
    pc.ondatachannel = (event) => setupDataChannel(event.channel);
  }

  set((state) => ({ peerConnections: new Map(state.peerConnections).set(peerId, pc) }));
  return pc;
};

export const useConnectionStore = create<ConnectionStateStore>((set, get) => ({
  gameId: null,
  isHost: false,
  peerConnections: new Map(),
  dataChannels: new Map(),
  peerConnectionStates: new Map(),
  onMessageCallback: () => {},
  unsubscribes: [],

  initAsHost: (gameId: string) => {
    get()._reset();
    set({ isHost: true, gameId });
    const gameRef = doc(db, "games", gameId);
    const unsub = onSnapshot(gameRef, async (snapshot) => {
      const data = snapshot.data();
      if (!data?.connections) return;

      for (const guestId in data.connections) {
        const pc = get().peerConnections.get(guestId);
        if (!pc) continue;

        const slot = data.connections[guestId] as ConnectionSlot;
        if (slot.answer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(slot.answer));
        }
        if (slot.guestCandidates) {
          slot.guestCandidates.forEach((candidate) => {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          });
        }
      }
    });
    set({ unsubscribes: [unsub] });
  },

  initAsGuest: (gameId: string, selfId: PlayerId, hostId: PlayerId) => {
    get()._reset();
    set({ isHost: false, gameId });
    const pc = _createPeerConnection(gameId, hostId, false, get, set);

    const gameRef = doc(db, "games", gameId);
    const unsub = onSnapshot(gameRef, async (snapshot) => {
      const data = snapshot.data();
      const slot = data?.connections?.[selfId] as ConnectionSlot | undefined;
      if (!slot) return;

      if (slot.offer && !pc.remoteDescription) {
        if (pc.signalingState !== "stable") {
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(slot.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(gameRef, { [`connections.${selfId}.answer`]: { type: answer.type, sdp: answer.sdp } });
      }

      if (slot.hostCandidates) {
        slot.hostCandidates.forEach((candidate) => {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        });
      }
    });
    set({ unsubscribes: [unsub] });
  },

  initiateConnectionForGuest: async (guestId: PlayerId) => {
    const { gameId, isHost } = get();
    if (!isHost || !gameId) return;

    const pc = _createPeerConnection(gameId, guestId, true, get, set);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const gameRef = doc(db, "games", gameId);
    await updateDoc(gameRef, {
      [`connections.${guestId}.offer`]: { type: offer.type, sdp: offer.sdp },
    });
  },

  broadcastMessage: (message: GameMessage) => {
    const { dataChannels } = get();
    const msgString = JSON.stringify(message);
    dataChannels.forEach((channel) => {
      if (channel.readyState === "open") {
        channel.send(msgString);
      }
    });
  },

  sendMessageToHost: (message: GameMessage) => {
    const { dataChannels } = get();
    const hostChannel = Array.from(dataChannels.values())[0];
    if (hostChannel?.readyState === "open") {
      hostChannel.send(JSON.stringify(message));
    }
  },

  sendMessageToGuest: (guestId: PlayerId, message: GameMessage) => {
    const { dataChannels } = get();
    const guestChannel = dataChannels.get(guestId);
    if (guestChannel?.readyState === "open") {
      guestChannel.send(JSON.stringify(message));
    }
  },

  leaveSession: async () => {
    get()._reset();
  },

  _reset: () => {
    get().unsubscribes.forEach((unsub) => unsub());
    get().peerConnections.forEach((pc) => pc.close());
    set({
      gameId: null,
      isHost: false,
      peerConnections: new Map(),
      dataChannels: new Map(),
      peerConnectionStates: new Map(),
      unsubscribes: [],
    });
  },
}));
