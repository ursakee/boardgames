import React from "react";
import type { CardColor } from "../types";

interface ColorPickerProps {
  onSelectColor: (color: CardColor) => void;
}

const colors: Exclude<CardColor, "black">[] = ["red", "yellow", "green", "blue"];

const colorClasses: { [key in Exclude<CardColor, "black">]: string } = {
  red: "bg-red-500 hover:bg-red-400",
  yellow: "bg-yellow-400 hover:bg-yellow-300",
  green: "bg-green-500 hover:bg-green-400",
  blue: "bg-blue-500 hover:bg-blue-400",
};

const ColorPicker: React.FC<ColorPickerProps> = ({ onSelectColor }) => {
  return (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in">
      <div className="p-6 bg-slate-800 rounded-2xl shadow-xl border border-slate-700">
        <h2 className="text-2xl font-bold text-white text-center mb-4">Choose a Color</h2>
        <div className="grid grid-cols-2 gap-4">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onSelectColor(color)}
              className={`w-28 h-28 rounded-lg ${colorClasses[color]} transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-white/50`}
              aria-label={`Select ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
