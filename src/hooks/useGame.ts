import { useState, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, addDoc, deleteDoc } from "firebase/firestore";
import type { GameState, PlayerSymbol } from "../types";

const servers = {
  iceServers: [{ urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }],
  iceCandidatePoolSize: 10,
};

export const useGame = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<PlayerSymbol | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(null),
    isNext: "X",
    winner: null,
    status: "Waiting for player...",
  });

  const pc = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);

  // Firestore unsubscribe listeners
  const unsubscribes = useRef<(() => void)[]>([]);

  const resetState = useCallback(() => {
    // Clean up listeners
    unsubscribes.current.forEach((unsub) => unsub());
    unsubscribes.current = [];

    // Close connections
    if (dataChannel.current) dataChannel.current.close();
    if (pc.current) pc.current.close();

    pc.current = null;
    dataChannel.current = null;
    setGameId(null);
    setPlayerSymbol(null);
    setGameState({
      board: Array(9).fill(null),
      isNext: "X",
      winner: null,
      status: "Waiting for player...",
    });
  }, []);

  // Setup the data channel event listeners
  const setupDataChannel = useCallback(() => {
    if (!dataChannel.current) return;
    dataChannel.current.onopen = () => {
      console.log("Data channel is open");
      // Host sends the initial state
      if (playerSymbol === "X") {
        const initialState: GameState = {
          board: Array(9).fill(null),
          isNext: "X",
          winner: null,
          status: "Player O has joined! X's turn.",
        };
        dataChannel.current?.send(JSON.stringify(initialState));
        setGameState(initialState);
      }
    };
    dataChannel.current.onclose = () => console.log("Data channel is closed");
    dataChannel.current.onmessage = (event) => {
      const receivedState = JSON.parse(event.data);
      setGameState(receivedState);
    };
  }, [playerSymbol]);

  const createGame = async () => {
    resetState();
    const newPc = new RTCPeerConnection(servers);
    pc.current = newPc;
    setPlayerSymbol("X");

    // Create data channel
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
    setGameState((prev) => ({ ...prev, status: "Waiting for player O to join..." }));

    // Listen for answer
    const unsubGame = onSnapshot(gameRef, (snapshot) => {
      const data = snapshot.data();
      if (!newPc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        newPc.setRemoteDescription(answerDescription);
      }
    });

    // Listen for guest ICE candidates
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

    // Listen for host ICE candidates
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

  const makeMove = (index: number) => {
    if (gameState.board[index] || gameState.winner || gameState.isNext !== playerSymbol) {
      return; // Invalid move
    }

    const newBoard = [...gameState.board];
    newBoard[index] = playerSymbol;
    const newIsNext = playerSymbol === "X" ? "O" : "X";

    // Calculate winner
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    let winner: PlayerSymbol | "draw" | null = null;
    for (const line of lines) {
      const [a, b, c] = line;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        winner = newBoard[a] as PlayerSymbol;
        break;
      }
    }
    if (!winner && newBoard.every(Boolean)) {
      winner = "draw";
    }

    let status = "";
    if (winner) {
      status = winner === "draw" ? "It's a Draw!" : `Winner is ${winner}!`;
    } else {
      status = `Next player: ${newIsNext}`;
    }

    const newGameState: GameState = {
      board: newBoard,
      isNext: newIsNext,
      winner,
      status,
    };

    setGameState(newGameState);
    dataChannel.current?.send(JSON.stringify(newGameState));
  };

  const leaveGame = async () => {
    if (gameId) {
      // Optional: Host can delete the game document to clean up Firestore
      if (playerSymbol === "X") {
        await deleteDoc(doc(db, "games", gameId));
      }
    }
    resetState();
  };

  return { gameId, playerSymbol, gameState, createGame, joinGame, makeMove, leaveGame };
};
