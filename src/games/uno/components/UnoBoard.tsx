import React, { useState, useEffect } from "react";
import type { GameBoardComponentProps } from "../../../types";
import type { UnoGameState, UnoAction, UnoCard, CardColor } from "../types";
import { useGameStore } from "../../../store/gameStore";
import { CardComponent } from "./CardComponent";
import ColorPicker from "./ColorPicker";
import { Hand, Layers, User, AlertTriangle, LogOut, Check } from "lucide-react";

type UnoBoardProps = GameBoardComponentProps<UnoGameState, UnoAction>;

const UnoBoard: React.FC<UnoBoardProps> = ({ gameState, isMyTurn, onPerformAction, onLeaveGame, statusMessage }) => {
  const localPlayerId = useGameStore((state) => state.playerId);
  const players = useGameStore((state) => state.players);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (gameState?.awaitingColorChoice && isMyTurn) {
      setShowColorPicker(true);
    } else {
      setShowColorPicker(false);
    }
  }, [gameState?.awaitingColorChoice, isMyTurn]);

  if (!gameState || !localPlayerId) return <div>Loading...</div>;

  const { playerHands, discardPile, deckSize, currentPlayerId, activeColor, unoSaid, drawCount } = gameState;

  const myHand = playerHands[localPlayerId] || [];
  const topDiscardCard = discardPile[discardPile.length - 1];
  const otherPlayers = players.filter((p) => p.id !== localPlayerId);

  const handleCardClick = (card: UnoCard) => {
    if (!isMyTurn || gameState.awaitingColorChoice) return;
    onPerformAction({ type: "PLAY_CARD", payload: { card, chosenColor: null } });
  };

  const handleColorSelect = (color: CardColor) => {
    if (isMyTurn) {
      onPerformAction({ type: "CHOOSE_COLOR", payload: { color } });
    }
    setShowColorPicker(false);
  };

  const handleDrawCard = () => {
    if (isMyTurn && !gameState.awaitingColorChoice) {
      onPerformAction({ type: "DRAW_CARD", payload: null });
    }
  };

  const handleSayUno = () => {
    onPerformAction({ type: "SAY_UNO", payload: null });
  };

  const getPlayerUsername = (id: string) => players.find((p) => p.id === id)?.username || `Player`;

  return (
    <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center overflow-hidden">
      {showColorPicker && <ColorPicker onSelectColor={handleColorSelect} />}

      {/* Opponent players */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-8">
        {otherPlayers.map((player) => (
          <div
            key={player.id}
            className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
              player.id === currentPlayerId ? "bg-cyan-500/20 ring-2 ring-cyan-400 scale-105" : "bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <User size={16} />
              <span className="font-bold">{player.username}</span>
            </div>
            <span className="text-sm text-slate-400">{playerHands[player.id]?.length || 0} cards</span>
            {unoSaid.includes(player.id) && <Check size={16} className="text-green-400" />}
          </div>
        ))}
      </div>

      {/* Game status message */}
      <div className="absolute top-24 text-center">
        <p className="text-lg font-semibold text-slate-300">{statusMessage}</p>
      </div>

      {/* Center area: Deck and Discard Pile */}
      <div className="flex items-center justify-center gap-4 md:gap-8 my-auto">
        {/* Discard Pile */}
        <div className="flex flex-col items-center gap-2">
          <CardComponent card={topDiscardCard} />
          {activeColor && activeColor !== "black" && (
            <div className={`w-10 h-10 rounded-full border-2 border-white ${"bg-" + activeColor}-500`}></div>
          )}
        </div>

        {/* Deck */}
        <div className="flex flex-col items-center gap-2">
          <CardComponent isFaceDown onClick={handleDrawCard} />
          <div className="flex items-center gap-2 text-slate-400">
            <Layers size={16} />
            <span>{deckSize}</span>
          </div>
          {drawCount > 0 && (
            <div className="absolute -bottom-8 bg-red-600 text-white font-bold rounded-full px-4 py-2">
              +{drawCount}
            </div>
          )}
        </div>
      </div>

      {/* Local Player's Hand and Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900/50 backdrop-blur-sm flex flex-col items-center gap-4">
        {/* Hand */}
        <div className="flex justify-center items-end gap-[-3rem] md:gap-[-4rem] h-40">
          {myHand.map((card, i) => (
            <div
              key={`${card.color}-${card.value}-${i}`}
              className="transition-transform duration-300 hover:-translate-y-4"
              style={{ zIndex: i }}
            >
              <CardComponent card={card} onClick={() => handleCardClick(card)} />
            </div>
          ))}
        </div>

        {/* Player Info and Actions */}
        <div
          className={`w-full max-w-lg flex justify-between items-center p-2 rounded-lg transition-all duration-300 ${
            isMyTurn && !gameState.awaitingColorChoice ? "bg-cyan-500/20 ring-2 ring-cyan-400" : "bg-slate-800/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-lg">
              <User size={20} />
              <span>{getPlayerUsername(localPlayerId)} (You)</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Hand size={16} />
              <span>{myHand.length} cards</span>
              {unoSaid.includes(localPlayerId) && <Check size={16} className="text-green-400" />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {myHand.length === 1 && !unoSaid.includes(localPlayerId) && (
              <button
                onClick={handleSayUno}
                className="px-4 py-2 font-bold text-slate-900 bg-yellow-400 rounded-lg hover:bg-yellow-300 flex items-center gap-2"
              >
                <AlertTriangle size={18} /> UNO!
              </button>
            )}
            <button
              onClick={onLeaveGame}
              className="px-3 py-2 text-slate-300 bg-red-800/50 rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnoBoard;
