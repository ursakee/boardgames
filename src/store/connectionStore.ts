import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";
import * as gameService from "../services/gameService";
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

// --- Interface ---
interface ConnectionStateStore {
  gameId: string | null;
  isHost: boolean;
  peerConnections: Map<PlayerId, RTCPeerConnection>;
  dataChannels: Map<PlayerId, RTCDataChannel>;
  peerConnectionStates: Map<PlayerId, ConnectionState>;
  processedCandidates: Map<PlayerId, Set<string>>;
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
  selfId: PlayerId,
  peerId: PlayerId,
  isHost: boolean,
  get: () => ConnectionStateStore,
  set: (partial: (state: ConnectionStateStore) => void) => void
): RTCPeerConnection => {
  const pc = new RTCPeerConnection(servers);

  pc.onconnectionstatechange = () => {
    const newState = pc.connectionState as ConnectionState;
    set((state) => {
      state.peerConnectionStates.set(peerId, newState);
    });

    if (newState === "disconnected" || newState === "failed" || newState === "closed") {
      useGameStore.getState().handlePlayerDisconnect(peerId);
      get().peerConnections.get(peerId)?.close();
      set((state) => {
        state.peerConnections.delete(peerId);
        state.dataChannels.delete(peerId);
      });
    }
  };

  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      const connectionSlotId = isHost ? peerId : selfId;
      const candidateFieldName = isHost ? "hostCandidates" : "guestCandidates";
      const fieldPath = `connections.${connectionSlotId}.${candidateFieldName}`;

      await gameService.sendCandidateToFirestore(gameId, fieldPath, event.candidate.toJSON());
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      useGameStore.getState().handlePlayerConnect(peerId);
    };
    channel.onmessage = (event) => {
      get().onMessageCallback(JSON.parse(event.data), peerId);
    };
    set((state) => {
      state.dataChannels.set(peerId, channel);
    });
  };

  if (isHost) {
    const channel = pc.createDataChannel("gameData");
    setupDataChannel(channel);
  } else {
    pc.ondatachannel = (event) => setupDataChannel(event.channel);
  }

  set((state) => {
    state.peerConnections.set(peerId, pc);
  });
  return pc;
};

export const useConnectionStore = create(
  immer<ConnectionStateStore>((set, get) => ({
    gameId: null,
    isHost: false,
    peerConnections: new Map(),
    dataChannels: new Map(),
    peerConnectionStates: new Map(),
    processedCandidates: new Map(),
    onMessageCallback: () => {},
    unsubscribes: [],

    initAsHost: (gameId: string) => {
      get()._reset();
      set((state) => {
        state.isHost = true;
        state.gameId = gameId;
      });
      const unsub = onSnapshot(doc(db, "games", gameId), async (snapshot) => {
        const data = snapshot.data();
        if (!data?.connections) return;
        for (const guestId in data.connections) {
          const pc = get().peerConnections.get(guestId);
          if (!pc) continue;
          // Use the restored ConnectionSlot type
          const slot = data.connections[guestId] as ConnectionSlot;
          if (slot.answer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(slot.answer));
          }
          if (slot.guestCandidates) {
            let processed = get().processedCandidates.get(guestId) || new Set();
            slot.guestCandidates.forEach((candidate: RTCIceCandidateInit) => {
              const candidateStr = JSON.stringify(candidate);
              if (!processed.has(candidateStr)) {
                pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                processed.add(candidateStr);
              }
            });
            set((state) => {
              state.processedCandidates.set(guestId, processed);
            });
          }
        }
      });
      set((state) => {
        state.unsubscribes = [unsub];
      });
    },

    initAsGuest: (gameId: string, selfId: PlayerId, hostId: PlayerId) => {
      get()._reset();
      set((state) => {
        state.isHost = false;
        state.gameId = gameId;
      });
      const pc = _createPeerConnection(gameId, selfId, hostId, false, get, set);
      const unsub = onSnapshot(doc(db, "games", gameId), async (snapshot) => {
        const data = snapshot.data();
        if (!snapshot.exists()) {
          useGameStore.getState().handlePlayerDisconnect(hostId);
          return;
        }

        const slot = data?.connections?.[selfId] as ConnectionSlot | undefined;
        if (!slot) return;

        if (slot.offer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(slot.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await gameService.updateSignalInFirestore(gameId, `connections.${selfId}.answer`, {
            type: answer.type,
            sdp: answer.sdp,
          });
        }
        if (slot.hostCandidates) {
          let processed = get().processedCandidates.get(hostId) || new Set();
          slot.hostCandidates.forEach((candidate: RTCIceCandidateInit) => {
            const candidateStr = JSON.stringify(candidate);
            if (!processed.has(candidateStr)) {
              pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
              processed.add(candidateStr);
            }
          });
          set((state) => {
            state.processedCandidates.set(hostId, processed);
          });
        }
      });
      set((state) => {
        state.unsubscribes = [unsub];
      });
    },

    initiateConnectionForGuest: async (guestId: PlayerId) => {
      const gameId = get().gameId;
      if (!get().isHost || !gameId) return;

      const hostId = useGameStore.getState().playerId!;
      const pc = _createPeerConnection(gameId, hostId, guestId, true, get, set);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await gameService.updateSignalInFirestore(gameId, `connections.${guestId}.offer`, {
        type: offer.type,
        sdp: offer.sdp,
      });
    },

    broadcastMessage: (message: GameMessage) => {
      const { dataChannels } = get();
      const msgString = JSON.stringify(message);
      dataChannels.forEach((channel) => {
        if (channel.readyState === "open") channel.send(msgString);
      });
    },
    sendMessageToHost: (message: GameMessage) => {
      const { dataChannels } = get();
      const hostChannel = Array.from(dataChannels.values())[0];
      if (hostChannel?.readyState === "open") hostChannel.send(JSON.stringify(message));
    },
    sendMessageToGuest: (guestId: PlayerId, message: GameMessage) => {
      const { dataChannels } = get();
      const guestChannel = dataChannels.get(guestId);
      if (guestChannel?.readyState === "open") guestChannel.send(JSON.stringify(message));
    },

    leaveSession: async () => {
      get()._reset();
    },
    _reset: () => {
      get().unsubscribes.forEach((unsub) => unsub());
      get().peerConnections.forEach((pc) => pc.close());
      set((state) => {
        state.gameId = null;
        state.isHost = false;
        state.peerConnections.clear();
        state.dataChannels.clear();
        state.peerConnectionStates.clear();
        state.processedCandidates.clear();
        state.unsubscribes = [];
      });
    },
  }))
);
