// A generic type for any player symbol, not just 'X' or 'O'
export type PlayerSymbol = string;

// A generic interface for the props that every Game Board component will receive
// This ensures that GamePage can safely pass props to any dynamically loaded game.
export interface GameBoardComponentProps<TGameState> {
  gameId: string;
  playerSymbol: PlayerSymbol;
  gameState: TGameState;
  onMakeMove: (move: any) => void; // 'move' can be any data type depending on the game
  onLeaveGame: () => void;
}
