import React from "react";
import { Link } from "react-router-dom";

interface GameTileProps {
  gameId: string;
  name: string;
  imageUrl: string; // You'll need to add some images to your `public` folder
}

const GameTile: React.FC<GameTileProps> = ({ gameId, name, imageUrl }) => {
  return (
    <Link
      to={`/game/${gameId}`}
      className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-700 transition-colors duration-200 aspect-square"
    >
      {/* Remember to add images to the `public` folder for this to work */}
      <img src={imageUrl} alt={name} className="w-24 h-24 mb-4 object-cover" />
      <h3 className="text-xl font-semibold text-white">{name}</h3>
    </Link>
  );
};

export default GameTile;
