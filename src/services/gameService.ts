import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc, arrayUnion, deleteField } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { GameRegistryEntry } from "../types";
import type { Player } from "../store/gameStore";

/**
 * Creates a new game document in Firestore.
 * @returns The unique ID for the new game.
 */
export async function createGameInFirestore(gameInfo: GameRegistryEntry, hostPlayer: Player): Promise<string> {
  const newGameId = doc(collection(db, "games")).id;
  const defaultOptions =
    gameInfo.gameOptions?.reduce((acc, opt) => {
      acc[opt.id] = opt.defaultValue;
      return acc;
    }, {} as Record<string, any>) || {};

  await setDoc(doc(db, "games", newGameId), {
    players: [hostPlayer],
    connections: {},
    gamePhase: "lobby",
    options: defaultOptions,
  });

  return newGameId;
}

/**
 * Validates a game ID and fetches the initial game data for a joining player.
 * @throws An error if the game is not found or is full.
 * @returns The initial game data from Firestore.
 */
export async function joinGameInFirestore(gameId: string, gameInfo: GameRegistryEntry) {
  const gameRef = doc(db, "games", gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error("Game not found or has been ended by the host.");
  }

  const gameData = gameSnap.data();
  const existingPlayers = gameData.players as Player[];

  if (existingPlayers.length >= gameInfo.maxPlayers) {
    throw new Error("This game lobby is already full.");
  }

  return gameData;
}

/**
 * Adds a new guest player to the players array in Firestore.
 */
export function addPlayerToFirestore(gameId: string, guestPlayer: Player) {
  const gameRef = doc(db, "games", gameId);
  return updateDoc(gameRef, { players: arrayUnion(guestPlayer) });
}

/**
 * Updates the entire players array in Firestore.
 */
export function updatePlayersInFirestore(gameId: string, players: Player[]) {
  const gameRef = doc(db, "games", gameId);
  return updateDoc(gameRef, { players });
}

/**
 * Updates the game state and phase in Firestore.
 */
export function updateGameStateInFirestore(gameId: string, gameState: any, gamePhase: string) {
  const gameRef = doc(db, "games", gameId);
  return updateDoc(gameRef, { gameState, gamePhase });
}

/**
 * Updates the game options in Firestore.
 */
export function updateOptionsInFirestore(gameId: string, options: Record<string, any>) {
  const gameRef = doc(db, "games", gameId);
  return updateDoc(gameRef, { options });
}

/**
 * Deletes the game document (used by the host).
 */
export function deleteGameInFirestore(gameId: string) {
  return deleteDoc(doc(db, "games", gameId));
}

/**
 * Removes a player's connection slot from Firestore (used for graceful disconnects).
 */
export function removePlayerConnectionInFirestore(gameId: string, playerId: string) {
  const gameRef = doc(db, "games", gameId);
  return updateDoc(gameRef, {
    [`connections.${playerId}`]: deleteField(),
  });
}

/**
 * Updates the signaling data (offer/answer) in Firestore.
 */
export function updateSignalInFirestore(gameId: string, path: string, data: any) {
  const gameRef = doc(db, "games", gameId);
  return updateDoc(gameRef, { [path]: data });
}

/**
 * Adds an ICE candidate to the array in Firestore.
 */
export function sendCandidateToFirestore(gameId: string, path: string, candidate: any) {
  const gameRef = doc(db, "games", gameId);
  return updateDoc(gameRef, { [path]: arrayUnion(candidate) });
}
