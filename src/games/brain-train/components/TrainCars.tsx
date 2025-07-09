import React, { useState, useEffect } from "react";
import { RectangleHorizontal } from "lucide-react";
import type { Track, Train } from "../types";

interface TrainCarsProps {
  tracks: Track[];
  trains: Train[];
  fixedTrainId: number | null;
}

export const TrainCars: React.FC<TrainCarsProps> = ({ tracks, trains, fixedTrainId }) => {
  const [cutTrains, setCutTrains] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCutTrains(new Set());
  }, [trains]);

  const getTrackColor = (trackId: number) => tracks.find((t) => t.trackId === trackId)?.color || "gray";

  const handleTrainClick = (trainId: number) => {
    if (trainId === fixedTrainId) return;
    setCutTrains((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trainId)) {
        newSet.delete(trainId);
      } else {
        newSet.add(trainId);
      }
      return newSet;
    });
  };

  const isTrainCut = (trainId: number) => fixedTrainId === trainId || cutTrains.has(trainId);

  const sortedTrains = [...trains].sort((a, b) => {
    const colorA = getTrackColor(a.trackId);
    const colorB = getTrackColor(b.trackId);
    if (colorA < colorB) return -1;
    if (colorA > colorB) return 1;
    return b.carsCount - a.carsCount;
  });

  return (
    <div className={trains.length > 12 ? "grid grid-cols-2 gap-x-2 gap-y-1" : "space-y-1"}>
      {sortedTrains.map((train) => (
        <div
          key={train.trainId}
          onClick={() => handleTrainClick(train.trainId)}
          className={`relative p-1 rounded-md ${
            train.trainId !== fixedTrainId ? "cursor-pointer hover:bg-slate-700/50" : ""
          }`}
        >
          <div className="flex items-center">
            {Array.from({ length: train.carsCount }).map((_, index) => (
              <RectangleHorizontal
                key={index}
                className="w-8 h-8"
                stroke={getTrackColor(train.trackId)}
                strokeWidth={isTrainCut(train.trainId) ? 1 : 2}
                fill={isTrainCut(train.trainId) ? "transparent" : getTrackColor(train.trackId)}
              />
            ))}
          </div>
          {isTrainCut(train.trainId) && (
            <div
              className="absolute top-1/2 left-1 -translate-y-1/2 h-0.5 bg-red-400"
              style={{ width: `${train.carsCount * 2}rem` }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
