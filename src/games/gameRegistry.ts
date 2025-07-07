import type { GameRegistryEntry } from "../types";

// This is the new, dynamic game registry.
// It uses Vite's `import.meta.glob` to automatically find and load games.
// The `eager: true` option loads the modules immediately.
const gameModules = import.meta.glob("./*/registry.ts", { eager: true });

// We process the loaded modules into the clean array structure the app expects.
export const gameRegistry: GameRegistryEntry[] = Object.values(gameModules).map((module: any) => module.default);

/**
 * Finds a game in the registry by its unique ID.
 * This function remains the same, but now operates on the dynamically loaded registry.
 * @param id The unique identifier for the game (e.g., "tic-tac-toe").
 * @returns The game registry entry if found, otherwise undefined.
 */
export const findGame = (id: string | undefined): GameRegistryEntry | undefined => {
  if (!id) return undefined;
  return gameRegistry.find((g) => g.id === id);
};
