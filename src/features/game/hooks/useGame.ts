import { useState, useRef, useCallback } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, addDoc, deleteDoc } from "firebase/firestore";
import type { PlayerSymbol } from "../../../types"; // Use the global PlayerSymbol

const servers = {
  iceServers: [{ urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }],
  iceCandidatePoolSize: 10,
};

// The hook is now generic and accepts a type for the game state.
// It also requires the initial state for that game.
export const useGame = <TGameState>(initialGameState: TGameState) => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<PlayerSymbol | null>(null);
  const [gameState, setGameState] = useState<TGameState>(initialGameState);

  const pc = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const unsubscribes = useRef<(() => void)[]>([]);

  const resetState = useCallback(() => {
    unsubscribes.current.forEach((unsub) => unsub());
    unsubscribes.current = [];
    if (dataChannel.current) dataChannel.current.close();
    if (pc.current) pc.current.close();
    pc.current = null;
    dataChannel.current = null;
    setGameId(null);
    setPlayerSymbol(null);
    setGameState(initialGameState); // Reset to the provided initial state
  }, [initialGameState]);

  const setupDataChannel = useCallback(() => {
    if (!dataChannel.current) return;
    dataChannel.current.onopen = () => {
      console.log("Data channel is open");
      if (playerSymbol === "X") {
        // When the channel opens, the host sends the initial state with an updated status.
        const stateWithStatus: TGameState = {
          ...initialGameState,
          status: "Player O has joined! X's turn.",
        };
        dataChannel.current?.send(JSON.stringify(stateWithStatus));
        setGameState(stateWithStatus);
      }
    };
    dataChannel.current.onclose = () => console.log("Data channel is closed");
    dataChannel.current.onmessage = (event) => {
      const receivedState = JSON.parse(event.data);
      setGameState(receivedState);
    };
  }, [playerSymbol, initialGameState]);

  const createGame = async () => {
    resetState();
    const newPc = new RTCPeerConnection(servers);
    pc.current = newPc;
    setPlayerSymbol("X");

    const channel = newPc.createDataChannel("gameData");
    dataChannel.current = channel;
    setupDataChannel();

    const newGameId = Math.random().toString(36).substring(2, 9);
    const gameRef = doc(db, "games", newGameId);
    const candidatesCollection = collection(db, "games", newGameId, "hostCandidates");

    newPc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(candidatesCollection, event.candidate.toJSON());
      }
    };

    const offerDescription = await newPc.createOffer();
    await newPc.setLocalDescription(offerDescription);

    const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
    await setDoc(gameRef, { offer });

    setGameId(newGameId);
    setGameState((prev: TGameState) => ({ ...prev, status: "Waiting for player O to join..." }));

    const unsubGame = onSnapshot(gameRef, (snapshot) => {
      const data = snapshot.data();
      if (!newPc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        newPc.setRemoteDescription(answerDescription);
      }
    });

    const guestCandidatesCollection = collection(db, "games", newGameId, "guestCandidates");
    const unsubGuestCandidates = onSnapshot(guestCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          newPc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        }
      });
    });

    unsubscribes.current.push(unsubGame, unsubGuestCandidates);
  };

  const joinGame = async (id: string) => {
    resetState();
    const newPc = new RTCPeerConnection(servers);
    pc.current = newPc;
    setPlayerSymbol("O");

    const gameRef = doc(db, "games", id);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      alert("Game not found!");
      resetState();
      return;
    }

    setGameId(id);

    newPc.ondatachannel = (event) => {
      dataChannel.current = event.channel;
      setupDataChannel();
    };

    const candidatesCollection = collection(db, "games", id, "guestCandidates");
    newPc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(candidatesCollection, event.candidate.toJSON());
      }
    };

    const offer = gameDoc.data().offer;
    await newPc.setRemoteDescription(new RTCSessionDescription(offer));

    const answerDescription = await newPc.createAnswer();
    await newPc.setLocalDescription(answerDescription);

    const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
    await updateDoc(gameRef, { answer });

    const hostCandidatesCollection = collection(db, "games", id, "hostCandidates");
    const unsubHostCandidates = onSnapshot(hostCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          newPc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        }
      });
    });
    unsubscribes.current.push(unsubHostCandidates);
  };

  // This function is now generic. It simply updates the state and sends it.
  const updateAndBroadcastState = (newGameState: TGameState) => {
    setGameState(newGameState);
    dataChannel.current?.send(JSON.stringify(newGameState));
  };

  const leaveGame = async () => {
    if (gameId && playerSymbol === "X") {
      await deleteDoc(doc(db, "games", gameId));
    }
    resetState();
  };

  return { gameId, playerSymbol, gameState, createGame, joinGame, updateAndBroadcastState, leaveGame };
};
