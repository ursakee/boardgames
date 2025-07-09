import type { BrainTrainPuzzle, Difficulty, Track, Train, Position } from "../types";

// A direct, line-for-line style translation of the original puzzle_generator.js
// to ensure identical puzzle generation behavior.

// --- UTILITY FUNCTIONS ---
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- SETTINGS ---
const settings = {
  easy: { rows: 8, columns: 10, trackCount: 4, trainCount: 8, carsRange: [2, 4] as [number, number] },
  medium: {
    rows: 8,
    columns: 12,
    trackCount: getRandomInt(4, 5),
    trainCount: 10,
    carsRange: [2, 4] as [number, number],
  },
  hard: { rows: 8, columns: 14, trackCount: 5, trainCount: 12, carsRange: [2, 4] as [number, number] },
};

// --- MAIN PUZZLE GENERATION ---
export function generatePuzzle(difficulty: Difficulty): BrainTrainPuzzle {
  const { rows, columns, trackCount, trainCount, carsRange } = settings[difficulty];

  let tracks: Track[] | null = null;
  let trains: Train[] | null = null;
  let clues: { rowClues: number[]; columnClues: number[] } | null = null;
  let attempt = 0;
  const maxAttempts = 100;

  while (attempt < maxAttempts) {
    attempt++;

    tracks = generateTracks(trackCount, rows, columns);

    if (!tracks || tracks.length < trackCount) {
      console.warn(`Attempt ${attempt}: Failed to generate tracks, retrying...`);
      continue;
    }

    trains = generateTrains(trainCount, carsRange, tracks);

    if (trains && trains.length > 0) {
      clues = generateClues(trains, rows, columns);
      break;
    } else {
      console.warn(`Attempt ${attempt}: No trains found, regenerating...`);
    }
  }

  if (attempt === maxAttempts || !tracks || !trains || !clues) {
    throw new Error(`Failed to generate a valid puzzle after ${maxAttempts} attempts.`);
  }

  const puzzle: BrainTrainPuzzle = {
    difficulty,
    grid: {
      rows,
      columns,
      gridSize: rows * columns,
    },
    tracks: tracks!,
    trains: trains!,
    clues: clues!,
  };

  return puzzle;
}

// --- TRACK GENERATION ---

interface OccupiedCellInfo {
  isHorizontal: boolean;
  isCorner: boolean;
}

function isOccupied(
  occupiedCells: Map<string, OccupiedCellInfo>,
  row: number,
  col: number,
  isHorizontal: boolean,
  isCorner = false
): boolean {
  const cell = occupiedCells.get(`${row},${col}`);
  if (cell) {
    if (cell.isCorner || isCorner) return true;
    if (cell.isHorizontal !== isHorizontal) return false; // Valid crossing
    return true; // Invalid overlap
  }
  return false;
}

function getOppositeEdgePosition(start: Position, rows: number, columns: number): Position {
  let startEdge: string;
  if (start.row === 0) startEdge = "top";
  else if (start.row === rows - 1) startEdge = "bottom";
  else if (start.col === 0) startEdge = "left";
  else if (start.col === columns - 1) startEdge = "right";
  else throw new Error("Start position is not on the edge");

  const excludedRange = 2;
  let possibleEndEdges: string[];

  if (startEdge === "top") possibleEndEdges = ["bottom", "left", "right"];
  else if (startEdge === "bottom") possibleEndEdges = ["top", "left", "right"];
  else if (startEdge === "left") possibleEndEdges = ["right", "top", "bottom"];
  else possibleEndEdges = ["left", "top", "bottom"];

  const endEdge = possibleEndEdges[getRandomInt(0, possibleEndEdges.length - 1)];
  let end: Position;

  if (endEdge === "top" || endEdge === "bottom") {
    const row = endEdge === "top" ? 0 : rows - 1;
    let col: number;
    do {
      col = getRandomInt(0, columns - 1);
    } while (col >= start.col - excludedRange && col <= start.col + excludedRange);
    end = { row, col };
  } else {
    const col = endEdge === "left" ? 0 : columns - 1;
    let row: number;
    do {
      row = getRandomInt(0, rows - 1);
    } while (row >= start.row - excludedRange && row <= start.row + excludedRange);
    end = { row, col };
  }
  return end;
}

function getRandomEdge(rows: number, columns: number): Position {
  const isHorizontal = Math.random() < 0.5;
  const isStart = Math.random() < 0.5;

  if (isHorizontal) {
    const row = isStart ? 0 : rows - 1;
    const col = getRandomInt(0, columns - 1);
    return { row, col };
  } else {
    const row = getRandomInt(0, rows - 1);
    const col = isStart ? 0 : columns - 1;
    return { row, col };
  }
}

interface PathPoint extends Position {
  isHorizontal: boolean;
  isCorner: boolean;
}

function generateTrackPath(start: Position, end: Position, rows: number, columns: number): PathPoint[] {
  const path: PathPoint[] = [];
  let current = { ...start };

  const isOutOfBounds = (p: Position) => p.row < 0 || p.row >= rows || p.col < 0 || p.col >= columns;

  const initialDirection = start.row === 0 || start.row === rows - 1 ? "vertical" : "horizontal";
  const endingDirection = end.row === 0 || end.row === rows - 1 ? "vertical" : "horizontal";

  // Define the points just inside the grid from the start and end
  const startPoint = { ...start };
  const endPoint = { ...end };
  const firstTurnPoint = { ...start };
  const lastTurnPoint = { ...end };

  if (initialDirection === "vertical") {
    firstTurnPoint.row += start.row === 0 ? 1 : -1;
  } else {
    firstTurnPoint.col += start.col === 0 ? 1 : -1;
  }

  if (endingDirection === "vertical") {
    lastTurnPoint.row += end.row === 0 ? 1 : -1;
  } else {
    lastTurnPoint.col += end.col === 0 ? 1 : -1;
  }

  current = { ...firstTurnPoint };
  path.push({ ...current, isHorizontal: initialDirection === "horizontal", isCorner: false });

  let lastDirection = initialDirection;
  let loopGuard = 0;
  const maxLoop = rows * columns;

  // Main pathing loop from the first turn to the last turn
  while (current.row !== lastTurnPoint.row || current.col !== lastTurnPoint.col) {
    if (loopGuard++ > maxLoop) return []; // Safety break

    const dRow = Math.sign(lastTurnPoint.row - current.row);
    const dCol = Math.sign(lastTurnPoint.col - current.col);

    let moveDirection: "vertical" | "horizontal";

    // Decide whether to move vertically or horizontally
    const canMoveVertical = dRow !== 0;
    const canMoveHorizontal = dCol !== 0;

    if (canMoveVertical && !canMoveHorizontal) {
      moveDirection = "vertical";
    } else if (!canMoveVertical && canMoveHorizontal) {
      moveDirection = "horizontal";
    } else {
      // Prefer to continue in the same direction if possible
      moveDirection = Math.random() > 0.5 ? "vertical" : "horizontal";
      if (moveDirection === lastDirection && (moveDirection === "vertical" ? !canMoveVertical : !canMoveHorizontal)) {
        moveDirection = moveDirection === "vertical" ? "horizontal" : "vertical";
      }
    }

    const isCorner = moveDirection !== lastDirection;

    if (moveDirection === "vertical") {
      current.row += dRow;
    } else {
      current.col += dCol;
    }

    if (isOutOfBounds(current)) return []; // Path went out of bounds

    path.push({ ...current, isHorizontal: moveDirection === "horizontal", isCorner });
    lastDirection = moveDirection;
  }

  // Add the start and end points to complete the path
  const finalPath: PathPoint[] = [
    { ...startPoint, isHorizontal: initialDirection === "horizontal", isCorner: false },
    ...path,
    { ...endPoint, isHorizontal: endingDirection === "horizontal", isCorner: false },
  ];

  // De-duplicate points, which can happen if start/end are very close
  const uniquePath = finalPath.filter(
    (p, i) => i === 0 || p.row !== finalPath[i - 1].row || p.col !== finalPath[i - 1].col
  );

  return uniquePath;
}

function generateTracks(trackCount: number, rows: number, columns: number): Track[] | null {
  const maxTotalRetries = 50;
  let totalRetries = 0;

  const attemptGenerateTracks = (): Track[] | null => {
    const availableColors = ["#ef4444", "#3b82f6", "#22c55e", "#ec4899", "#a855f7", "#f97316"];
    if (trackCount > availableColors.length) throw new Error("Not enough unique colors for the number of tracks!");

    const tracks: Track[] = [];
    const occupiedCells = new Map<string, OccupiedCellInfo>();
    const usedStartEndPoints = new Set<string>();

    for (let i = 0; i < trackCount; i++) {
      let validTrack = false;
      let path: PathPoint[] | null = null;
      const maxAttempts = 50;
      let localAttempts = 0;

      while (!validTrack) {
        localAttempts++;
        if (localAttempts > maxAttempts) {
          totalRetries++;
          return null;
        }

        let attempts = 0;
        let start: Position, end: Position, startKey: string, endKey: string;

        while (attempts < maxAttempts) {
          attempts++;
          start = getRandomEdge(rows, columns);
          end = getOppositeEdgePosition(start, rows, columns);
          startKey = `${start.row},${start.col}`;
          endKey = `${end.row},${end.col}`;

          if (startKey === endKey || usedStartEndPoints.has(startKey) || usedStartEndPoints.has(endKey)) {
            continue;
          }

          path = generateTrackPath(start, end, rows, columns);

          let isPathValid = true;
          if (path && path.length > 10) {
            for (const pos of path) {
              if (isOccupied(occupiedCells, pos.row, pos.col, pos.isHorizontal, pos.isCorner)) {
                isPathValid = false;
                break;
              }
            }

            if (isPathValid) {
              validTrack = true;
              break;
            }
          }
        }

        if (!validTrack || !path) {
          continue;
        }

        usedStartEndPoints.add(startKey!);
        usedStartEndPoints.add(endKey!);

        path.forEach((pos) =>
          occupiedCells.set(`${pos.row},${pos.col}`, {
            isHorizontal: pos.isHorizontal,
            isCorner: pos.isCorner,
          })
        );

        const randomIndex = getRandomInt(0, availableColors.length - 1);
        const color = availableColors[randomIndex];
        availableColors.splice(randomIndex, 1);

        const cleanedPath = path.map((pos) => ({ row: pos.row, col: pos.col }));
        tracks.push({ trackId: i + 1, color, path: cleanedPath });
      }
    }
    return tracks;
  };

  let tracks: Track[] | null;
  while (totalRetries < maxTotalRetries) {
    tracks = attemptGenerateTracks();
    if (tracks !== null && tracks.length === trackCount) {
      return tracks;
    }
  }
  return null;
}

// --- TRAIN GENERATION ---

function generateTrains(trainCount: number, carsRange: [number, number], tracks: Track[]): Train[] | null {
  const maxAttempts = 100;
  let attempt = 0;
  let success = false;
  let trains: Train[] = [];

  while (attempt < maxAttempts && !success) {
    try {
      trains = tryGenerateTrains(trainCount, carsRange, tracks);
      success = true;
    } catch (error) {
      attempt++;
      if (attempt === maxAttempts) return null;
    }
  }
  return trains;
}

function tryGenerateTrains(trainCount: number, carsRange: [number, number], tracks: Track[]): Train[] {
  const occupiedTiles = new Set<string>();
  const blockedTiles = new Set<string>();
  const trains: Train[] = [];
  let remainingTrainCount = trainCount;
  let trainIdCounter = 1;

  let tracksCopy: Track[] = JSON.parse(JSON.stringify(removeCornerPointsFromTracks(tracks)));

  const placeTrainOnTrack = (track: Track): boolean => {
    const straightSegments = getStraightSegments(track.path);
    let validSegments: Position[][] = [];

    for (let segment of straightSegments) {
      const adjustedSegments = adjustSegmentForSpacing(segment, occupiedTiles, blockedTiles);
      for (let adjSegment of adjustedSegments) {
        if (adjSegment.length >= carsRange[0]) {
          validSegments.push(adjSegment);
        }
      }
    }

    if (validSegments.length === 0) return false;

    validSegments.sort((a, b) => b.length - a.length);

    for (let segment of validSegments) {
      const maxPossibleLength = Math.min(segment.length, carsRange[1]);
      if (maxPossibleLength < carsRange[0]) continue;

      const trainLength = getRandomInt(carsRange[0], maxPossibleLength);
      const trainTiles = segment.slice(0, trainLength);

      const isInvalid = trainTiles.some((tile) => {
        const tileKey = `${tile.row},${tile.col}`;
        if (occupiedTiles.has(tileKey) || blockedTiles.has(tileKey)) return true;
        const adjacent = getAdjacentTiles(tile); // Uses cardinal direction adjacency
        for (const adj of adjacent) {
          if (occupiedTiles.has(`${adj.row},${adj.col}`)) return true;
        }
        return false;
      });

      if (isInvalid) continue;

      const newTrain: Train = {
        trainId: trainIdCounter,
        trackId: track.trackId,
        carPositions: trainTiles,
        carsCount: trainLength,
      };
      trains.push(newTrain);

      for (const tile of trainTiles) {
        const tileKey = `${tile.row},${tile.col}`;
        occupiedTiles.add(tileKey);
        const adjacent = getAdjacentTiles(tile);
        for (const adj of adjacent) {
          blockedTiles.add(`${adj.row},${adj.col}`);
        }
      }

      removeIntersectingTiles(tracksCopy, newTrain, occupiedTiles);
      track.path = track.path.filter((p) => !occupiedTiles.has(`${p.row},${p.col}`));

      trainIdCounter++;
      remainingTrainCount--;
      return true;
    }
    return false;
  };

  // Ensure each track gets at least one train
  for (const track of tracksCopy) {
    if (remainingTrainCount <= 0) break;
    placeTrainOnTrack(track);
  }

  // Distribute remaining trains
  while (remainingTrainCount > 0 && tracksCopy.length > 0) {
    tracksCopy = tracksCopy.filter((t) => t.path.length >= carsRange[0]);
    tracksCopy.sort((a, b) => b.path.length - a.path.length);
    if (tracksCopy.length === 0) break;

    if (!placeTrainOnTrack(tracksCopy[0])) {
      tracksCopy.shift(); // Remove track if no train can be placed
    }
  }

  if (remainingTrainCount > 0) {
    throw new Error("Failed to place all trains");
  }

  return trains;
}

function adjustSegmentForSpacing(
  segment: Position[],
  occupiedTiles: Set<string>,
  blockedTiles: Set<string>
): Position[][] {
  const adjustedSegments: Position[][] = [];
  let currentSegment: Position[] = [];
  for (let i = 0; i < segment.length; i++) {
    const tile = segment[i];
    const tileKey = `${tile.row},${tile.col}`;
    if (occupiedTiles.has(tileKey) || blockedTiles.has(tileKey)) {
      if (currentSegment.length > 0) {
        adjustedSegments.push(currentSegment);
        currentSegment = [];
      }
      continue;
    }
    currentSegment.push(tile);
  }
  if (currentSegment.length > 0) {
    adjustedSegments.push(currentSegment);
  }
  return adjustedSegments;
}

function getAdjacentTiles(tile: Position): Position[] {
  return [
    { row: tile.row - 1, col: tile.col },
    { row: tile.row + 1, col: tile.col },
    { row: tile.row, col: tile.col - 1 },
    { row: tile.row, col: tile.col + 1 },
  ];
}

function getTilesToRemove(tile: Position, movementDirection: "horizontal" | "vertical"): Position[] {
  if (movementDirection === "horizontal") {
    return [
      { row: tile.row - 1, col: tile.col },
      { row: tile.row + 1, col: tile.col },
    ];
  } else {
    return [
      { row: tile.row, col: tile.col - 1 },
      { row: tile.row, col: tile.col + 1 },
    ];
  }
}

function getTrainMovementDirection(carPositions: Position[]): "horizontal" | "vertical" | null {
  if (carPositions.length < 2) return null;
  const [first, second] = carPositions;
  if (first.row === second.row) return "horizontal";
  if (first.col === second.col) return "vertical";
  return null;
}

function removeIntersectingTiles(tracksCopy: Track[], placedTrain: Train, occupiedTiles: Set<string>) {
  const { carPositions, trackId } = placedTrain;
  const movementDirection = getTrainMovementDirection(carPositions);
  if (!movementDirection) return;

  for (let otherTrack of tracksCopy) {
    if (otherTrack.trackId === trackId) continue;

    let tilesToRemove = new Set<string>();
    for (let tile of otherTrack.path) {
      for (let trainTile of carPositions) {
        if (tile.row === trainTile.row && tile.col === trainTile.col) {
          const adjacentTiles = getTilesToRemove(tile, movementDirection);
          adjacentTiles.forEach((adj) => tilesToRemove.add(`${adj.row},${adj.col}`));
        }
      }
    }
    otherTrack.path = otherTrack.path.filter((tile) => {
      const key = `${tile.row},${tile.col}`;
      return !tilesToRemove.has(key) && !occupiedTiles.has(key);
    });
  }
}

function removeCornerPointsFromTracks(tracks: Track[]): Track[] {
  return tracks.map((track) => {
    const nonCornerPath = track.path.filter((_, index) => {
      if (index === 0 || index === track.path.length - 1) return true;
      const prev = track.path[index - 1];
      const next = track.path[index + 1];
      const isCorner = prev.row !== next.row && prev.col !== next.col;
      return !isCorner;
    });
    return { ...track, path: nonCornerPath };
  });
}

function getStraightSegments(path: Position[]): Position[][] {
  const segments: Position[][] = [];
  if (path.length === 0) return segments;

  let currentSegment: Position[] = [];
  for (let i = 0; i < path.length; i++) {
    const currentPoint = path[i];
    if (i > 0) {
      const prevPoint = path[i - 1];
      if (Math.abs(currentPoint.row - prevPoint.row) + Math.abs(currentPoint.col - prevPoint.col) !== 1) {
        if (currentSegment.length > 0) segments.push(currentSegment);
        currentSegment = [];
      }
    }
    currentSegment.push(currentPoint);
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }
  return segments;
}

// --- CLUE GENERATION ---
function generateClues(trains: Train[], rows: number, columns: number) {
  const rowClues = new Array(rows).fill(0);
  const columnClues = new Array(columns).fill(0);
  for (const train of trains) {
    for (const car of train.carPositions) {
      rowClues[car.row]++;
      columnClues[car.col]++;
    }
  }
  return { rowClues, columnClues };
}
