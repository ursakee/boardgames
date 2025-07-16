import React from "react";
import type { UnoCard } from "../types";
import { Ban, RefreshCw, Plus, HelpCircle } from "lucide-react";

interface CardComponentProps {
  card?: UnoCard | null;
  isFaceDown?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  black: "bg-slate-800",
};

const CardSymbol: React.FC<{ value: string; className: string }> = ({ value, className }) => {
  switch (value) {
    case "skip":
      return <Ban className={className} strokeWidth={2} />;
    case "reverse":
      return <RefreshCw className={className} strokeWidth={2} />;
    case "draw-two":
      return <Plus className={className} strokeWidth={2.5} />;
    case "wild-draw-four":
      return (
        <div className="relative">
          <Plus className={className} strokeWidth={2.5} />
          <span className="absolute -top-2 -right-1 text-lg font-bold">4</span>
        </div>
      );
    case "wild":
      return <HelpCircle className={className} strokeWidth={2} />;
    default:
      return <span className={`font-black text-5xl tracking-tighter`}>{value}</span>;
  }
};

const WildColorGradient: React.FC = () => (
  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
    <div className="bg-red-500 rounded-tl-lg"></div>
    <div className="bg-blue-500 rounded-tr-lg"></div>
    <div className="bg-yellow-400 rounded-bl-lg"></div>
    <div className="bg-green-500 rounded-br-lg"></div>
  </div>
);

export const CardComponent: React.FC<CardComponentProps> = ({ card, isFaceDown, onClick, className = "" }) => {
  if (isFaceDown) {
    return (
      <div
        onClick={onClick}
        className={`w-20 h-28 md:w-24 md:h-36 bg-slate-900 rounded-lg border-2 border-slate-600 flex items-center justify-center shadow-lg ${
          onClick ? "cursor-pointer" : ""
        } ${className}`}
      >
        <h1 className="text-4xl font-black text-cyan-400 -rotate-12">UNO</h1>
      </div>
    );
  }

  if (!card) return null;

  const cardColorClass = colorClasses[card.color];

  return (
    <div
      onClick={onClick}
      className={`w-20 h-28 md:w-24 md:h-36 rounded-lg border-2 border-slate-300 flex items-center justify-center p-2 relative shadow-xl ${cardColorClass} ${
        onClick ? "cursor-pointer transition-transform hover:-translate-y-4 hover:shadow-2xl" : ""
      } ${className}`}
    >
      <div className="absolute w-full h-full bg-black/10"></div>
      <div className="absolute top-1 left-2 text-white font-bold text-xl">{card.value.toUpperCase()}</div>
      <div className="absolute bottom-1 right-2 text-white font-bold text-xl transform rotate-180">
        {card.value.toUpperCase()}
      </div>

      <div className="absolute inset-0 flex items-center justify-center text-white">
        {card.color === "black" && <WildColorGradient />}
        <div className="relative z-10 w-16 h-24 bg-white/20 backdrop-blur-sm rounded-md flex items-center justify-center">
          <CardSymbol value={card.value} className="w-10 h-10" />
        </div>
      </div>
    </div>
  );
};
