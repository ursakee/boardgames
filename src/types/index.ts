export type PlayerSymbol = string;

// The game board no longer needs gameId or playerSymbol passed as props,
// as they are now available from the global Zustand store.
export interface GameBoardComponentProps<TGameState> {
  gameState: TGameState;
  onMakeMove: (move: any) => void;
  onLeaveGame: () => void;
}
