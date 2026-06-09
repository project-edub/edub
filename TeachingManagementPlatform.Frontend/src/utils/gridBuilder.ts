/**
 * Client-side crossword grid builder.
 *
 * Implements a backtracking placement algorithm that:
 *  1. Sorts words descending by length.
 *  2. Places the longest word horizontally at the center of the grid.
 *  3. For each subsequent word, finds all positions where it shares a letter
 *     with an already-placed word (intersection-based placement).
 *  4. Scores each candidate by number of intersections (more = better).
 *  5. Places the word at the best valid position; words that cannot be placed
 *     go into `unplacedWords`.
 *  6. Compacts the grid so that min row = 0 and min col = 0.
 *  7. Assigns sequential cell numbers in reading order (left→right, top→bottom).
 *
 * Requirements: 6.4 FR-12 to FR-15
 */

import { CellState, Direction } from '../types/crossword';
import type { CrosswordGrid, GridCell } from '../types/crossword';

// ── Public types ──────────────────────────────────────────────────────────────

/** Input word entry — word must already be normalized (uppercase, no diacritics). */
export interface PlacedWordInput {
  word: string;
  id?: number;
}

/** A word that has been successfully placed in the grid. */
export interface PlacedWord {
  word: string;
  id?: number;
  direction: Direction;
  startRow: number;
  startCol: number;
  /** Sequential cell number assigned in reading order. */
  number: number;
}

/** Return value of {@link buildGrid}. */
export interface GridResult {
  grid: CrosswordGrid;
  placedWords: PlacedWord[];
  unplacedWords: string[];
}

/** Grid size — a single number N means an N×N grid. */
export type GridSize = number;

// ── Internal types ────────────────────────────────────────────────────────────

interface InternalPlacement {
  word: string;
  id?: number;
  direction: Direction;
  startRow: number;
  startCol: number;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Builds a crossword grid from the given word list.
 * Tries multiple word orderings to minimize unplaced words.
 *
 * @param words - List of words to place (already normalized: uppercase, A-Z and '_').
 * @param size  - Grid dimension (e.g. 15 for a 15×15 grid).
 * @returns `{ grid, placedWords, unplacedWords }`
 */
export function buildGrid(words: PlacedWordInput[], size: GridSize): GridResult {
  if (words.length === 0) {
    return {
      grid: buildEmptyGrid(size, size),
      placedWords: [],
      unplacedWords: [],
    };
  }

  // Try multiple times with different word orderings to minimize unplaced words
  let bestResult: { placements: InternalPlacement[]; unplaced: string[] } | null = null;
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sorted = attempt === 0
      ? [...words].sort((a, b) => b.word.length - a.word.length)
      : shuffleWithLongestFirst([...words]);

    const placements: InternalPlacement[] = [];
    const unplaced: string[] = [];

    // Place the first word horizontally at the center
    const first = sorted[0];
    const centerRow = Math.floor(size / 2);
    const centerCol = Math.floor((size - first.word.length) / 2);
    placements.push({
      word: first.word,
      id: first.id,
      direction: Direction.Across,
      startRow: centerRow,
      startCol: centerCol,
    });

    // Place remaining words
    for (let i = 1; i < sorted.length; i++) {
      const entry = sorted[i];
      const best = findBestPlacement(entry, placements, size);
      if (best) {
        placements.push(best);
      } else {
        unplaced.push(entry.word);
      }
    }

    // If all words placed, use this result immediately
    if (unplaced.length === 0) {
      bestResult = { placements, unplaced };
      break;
    }

    if (!bestResult || unplaced.length < bestResult.unplaced.length) {
      bestResult = { placements, unplaced };
    }
  }

  const { placements, unplaced } = bestResult!;

  // Compact to (0,0)
  const compacted = compactPlacements(placements);

  // Determine actual grid dimensions after compaction
  const { rows: gridRows, cols: gridCols } = getGridDimensions(compacted);

  // Build the grid cells
  const grid = buildEmptyGrid(gridRows, gridCols);
  for (const p of compacted) {
    writePlacementToGrid(grid, p);
  }

  // Assign sequential numbers in reading order
  const numberedPlacements = assignNumbers(compacted, gridRows, gridCols);

  return {
    grid,
    placedWords: numberedPlacements,
    unplacedWords: unplaced,
  };
}

/** Shuffle words but keep the longest one first (it's the anchor). */
function shuffleWithLongestFirst(words: PlacedWordInput[]): PlacedWordInput[] {
  let longestIdx = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i].word.length > words[longestIdx].word.length) {
      longestIdx = i;
    }
  }
  const longest = words[longestIdx];
  const rest = words.filter((_, i) => i !== longestIdx);

  // Fisher-Yates shuffle
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return [longest, ...rest];
}

// ── Placement algorithm ───────────────────────────────────────────────────────

/**
 * Finds the best valid position for `entry` given the already-placed words.
 * "Best" means the candidate with the most intersections with existing words.
 */
function findBestPlacement(
  entry: PlacedWordInput,
  placements: InternalPlacement[],
  size: GridSize,
): InternalPlacement | null {
  const candidates: Array<{ placement: InternalPlacement; score: number }> = [];

  for (const existing of placements) {
    const perpDirection = existing.direction === Direction.Across ? Direction.Down : Direction.Across;

    // Find all shared letters between entry.word and existing.word
    for (let ei = 0; ei < entry.word.length; ei++) {
      for (let xi = 0; xi < existing.word.length; xi++) {
        if (entry.word[ei] !== existing.word[xi]) continue;

        // Compute start position for the new word
        let startRow: number;
        let startCol: number;

        if (perpDirection === Direction.Down) {
          // New word goes DOWN; intersection is at (existingRow, existingCol + xi)
          const intersectRow = existing.startRow;
          const intersectCol = existing.startCol + xi;
          startRow = intersectRow - ei;
          startCol = intersectCol;
        } else {
          // New word goes ACROSS; intersection is at (existingRow + xi, existingCol)
          const intersectRow = existing.startRow + xi;
          const intersectCol = existing.startCol;
          startRow = intersectRow;
          startCol = intersectCol - ei;
        }

        const candidate: InternalPlacement = {
          word: entry.word,
          id: entry.id,
          direction: perpDirection,
          startRow,
          startCol,
        };

        if (isValidPlacement(candidate, placements, size)) {
          const score = countIntersections(candidate, placements);
          candidates.push({ placement: candidate, score });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Pick the candidate with the highest intersection score
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].placement;
}

/**
 * Counts how many cells of `candidate` overlap with cells of existing placements
 * (valid intersections only — perpendicular, same letter).
 */
function countIntersections(candidate: InternalPlacement, placements: InternalPlacement[]): number {
  let count = 0;
  const cells = getWordCells(candidate);
  for (const [row, col] of cells) {
    for (const p of placements) {
      if (p.direction === candidate.direction) continue;
      const pCells = getWordCells(p);
      if (pCells.some(([r, c]) => r === row && c === col)) {
        count++;
      }
    }
  }
  return count;
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Returns true if `candidate` can be placed without violating any crossword rules:
 *  - Stays within the grid bounds (using a large virtual grid).
 *  - No illegal overlaps (parallel words sharing a cell, or perpendicular words
 *    sharing a cell with different letters).
 *  - No adjacency violations (parallel words touching end-to-end or side-by-side).
 */
function isValidPlacement(
  candidate: InternalPlacement,
  placements: InternalPlacement[],
  size: GridSize,
): boolean {
  // Check grid bounds (use a generous virtual bound; we compact later)
  const virtualBound = size * 3;
  if (!isWithinBounds(candidate, virtualBound)) return false;

  // Build a map of occupied cells from existing placements
  const cellMap = buildCellMap(placements);

  const candidateCells = getWordCells(candidate);

  for (let i = 0; i < candidateCells.length; i++) {
    const [row, col] = candidateCells[i];
    const key = cellKey(row, col);
    const existing = cellMap.get(key);

    if (existing) {
      // Cell is already occupied
      if (existing.direction === candidate.direction) {
        // Parallel words cannot share a cell
        return false;
      }
      // Perpendicular: letters must match
      if (existing.letter !== candidate.word[i]) {
        return false;
      }
    }
  }

  // Adjacency checks
  if (!checkAdjacency(candidate, placements, cellMap)) return false;

  return true;
}

/**
 * Checks that placing `candidate` does not create illegal adjacencies:
 *
 * For an ACROSS word:
 *  - The cell immediately to the left of the start must be empty (no word
 *    continuation from the left).
 *  - The cell immediately to the right of the end must be empty.
 *  - Each cell above/below must not belong to another ACROSS word (would
 *    create an unintended word running parallel).
 *
 * For a DOWN word:
 *  - The cell immediately above the start must be empty.
 *  - The cell immediately below the end must be empty.
 *  - Each cell to the left/right must not belong to another DOWN word.
 */
function checkAdjacency(
  candidate: InternalPlacement,
  _placements: InternalPlacement[],
  cellMap: Map<string, { letter: string; direction: Direction }>,
): boolean {
  const cells = getWordCells(candidate);
  const candidateCellSet = new Set(cells.map(([r, c]) => cellKey(r, c)));

  if (candidate.direction === Direction.Across) {
    const row = candidate.startRow;
    const startCol = candidate.startCol;
    const endCol = startCol + candidate.word.length - 1;

    // No cell immediately left or right (would extend the word)
    if (cellMap.has(cellKey(row, startCol - 1))) return false;
    if (cellMap.has(cellKey(row, endCol + 1))) return false;

    // No parallel (ACROSS) neighbor above or below each cell
    for (const [r, c] of cells) {
      for (const dr of [-1, 1]) {
        const neighborKey = cellKey(r + dr, c);
        const neighbor = cellMap.get(neighborKey);
        if (neighbor && neighbor.direction === Direction.Across) {
          // Only illegal if the neighbor cell is NOT an intersection with candidate
          if (!candidateCellSet.has(neighborKey)) {
            return false;
          }
        }
      }
    }
  } else {
    // DOWN
    const col = candidate.startCol;
    const startRow = candidate.startRow;
    const endRow = startRow + candidate.word.length - 1;

    // No cell immediately above or below (would extend the word)
    if (cellMap.has(cellKey(startRow - 1, col))) return false;
    if (cellMap.has(cellKey(endRow + 1, col))) return false;

    // No parallel (DOWN) neighbor left or right of each cell
    for (const [r, c] of cells) {
      for (const dc of [-1, 1]) {
        const neighborKey = cellKey(r, c + dc);
        const neighbor = cellMap.get(neighborKey);
        if (neighbor && neighbor.direction === Direction.Down) {
          if (!candidateCellSet.has(neighborKey)) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

function isWithinBounds(placement: InternalPlacement, bound: number): boolean {
  if (placement.startRow < -bound || placement.startCol < -bound) return false;
  if (placement.direction === Direction.Across) {
    return placement.startCol + placement.word.length - 1 < bound;
  } else {
    return placement.startRow + placement.word.length - 1 < bound;
  }
}

// ── Cell map helpers ──────────────────────────────────────────────────────────

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function getWordCells(placement: InternalPlacement): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let i = 0; i < placement.word.length; i++) {
    if (placement.direction === Direction.Across) {
      cells.push([placement.startRow, placement.startCol + i]);
    } else {
      cells.push([placement.startRow + i, placement.startCol]);
    }
  }
  return cells;
}

function buildCellMap(
  placements: InternalPlacement[],
): Map<string, { letter: string; direction: Direction }> {
  const map = new Map<string, { letter: string; direction: Direction }>();
  for (const p of placements) {
    const cells = getWordCells(p);
    for (let i = 0; i < cells.length; i++) {
      const [row, col] = cells[i];
      const key = cellKey(row, col);
      // If a cell is already in the map (intersection), keep the existing entry
      // (both letters must match — validated elsewhere)
      if (!map.has(key)) {
        map.set(key, { letter: p.word[i], direction: p.direction });
      }
    }
  }
  return map;
}

// ── Compaction ────────────────────────────────────────────────────────────────

/**
 * Shifts all placements so that the minimum row = 0 and minimum col = 0.
 */
function compactPlacements(placements: InternalPlacement[]): InternalPlacement[] {
  if (placements.length === 0) return [];

  let minRow = Infinity;
  let minCol = Infinity;

  for (const p of placements) {
    minRow = Math.min(minRow, p.startRow);
    minCol = Math.min(minCol, p.startCol);
  }

  return placements.map((p) => ({
    ...p,
    startRow: p.startRow - minRow,
    startCol: p.startCol - minCol,
  }));
}

function getGridDimensions(placements: InternalPlacement[]): { rows: number; cols: number } {
  let maxRow = 0;
  let maxCol = 0;

  for (const p of placements) {
    if (p.direction === Direction.Across) {
      maxRow = Math.max(maxRow, p.startRow);
      maxCol = Math.max(maxCol, p.startCol + p.word.length - 1);
    } else {
      maxRow = Math.max(maxRow, p.startRow + p.word.length - 1);
      maxCol = Math.max(maxCol, p.startCol);
    }
  }

  return { rows: maxRow + 1, cols: maxCol + 1 };
}

// ── Grid construction ─────────────────────────────────────────────────────────

function buildEmptyGrid(rows: number, cols: number): CrosswordGrid {
  const grid: CrosswordGrid = [];
  for (let r = 0; r < rows; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        row: r,
        col: c,
        letter: '',
        isBlack: true,
        state: CellState.Empty,
      });
    }
    grid.push(row);
  }
  return grid;
}

function writePlacementToGrid(grid: CrosswordGrid, placement: InternalPlacement): void {
  const cells = getWordCells(placement);
  for (let i = 0; i < cells.length; i++) {
    const [row, col] = cells[i];
    const cell = grid[row]?.[col];
    if (!cell) continue;
    cell.letter = placement.word[i];
    cell.isBlack = false;
    cell.state = CellState.Empty;
  }
}

// ── Number assignment ─────────────────────────────────────────────────────────

/**
 * Assigns sequential cell numbers in reading order (left→right, top→bottom).
 * A cell gets a number if it is the start of an across word OR the start of a
 * down word.
 *
 * Returns a new array of `PlacedWord` with the `number` field populated.
 */
function assignNumbers(
  placements: InternalPlacement[],
  rows: number,
  cols: number,
): PlacedWord[] {
  // Build a set of start cells for across and down words
  const acrossStarts = new Set<string>();
  const downStarts = new Set<string>();

  for (const p of placements) {
    const key = cellKey(p.startRow, p.startCol);
    if (p.direction === Direction.Across) {
      acrossStarts.add(key);
    } else {
      downStarts.add(key);
    }
  }

  // Assign numbers in reading order
  const numberMap = new Map<string, number>();
  let nextNumber = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = cellKey(r, c);
      if (acrossStarts.has(key) || downStarts.has(key)) {
        numberMap.set(key, nextNumber++);
      }
    }
  }

  // Map placements to PlacedWord with numbers
  return placements.map((p) => {
    const key = cellKey(p.startRow, p.startCol);
    return {
      word: p.word,
      id: p.id,
      direction: p.direction,
      startRow: p.startRow,
      startCol: p.startCol,
      number: numberMap.get(key) ?? 0,
    };
  });
}


// ── Rebuild grid from saved positions ─────────────────────────────────────────

/** Input for rebuilding from saved word positions. */
export interface SavedWordPosition {
  word: string;
  id?: number;
  direction: Direction;
  startRow: number;
  startCol: number;
  number: number;
}

/**
 * Rebuilds a crossword grid from previously saved word positions.
 * Use this instead of {@link buildGrid} when words already have valid positions
 * stored in the database, to avoid re-randomizing the layout on every page load.
 *
 * @param savedWords - Words with their saved positions (from the backend).
 * @returns `{ grid, placedWords, unplacedWords: [] }`
 */
export function rebuildGridFromPositions(savedWords: SavedWordPosition[]): GridResult {
  if (savedWords.length === 0) {
    return { grid: [], placedWords: [], unplacedWords: [] };
  }

  // Convert to internal placements
  const placements: InternalPlacement[] = savedWords.map((w) => ({
    word: w.word,
    id: w.id,
    direction: w.direction,
    startRow: w.startRow,
    startCol: w.startCol,
  }));

  // Determine grid dimensions
  const { rows, cols } = getGridDimensions(placements);

  // Build the grid cells
  const grid = buildEmptyGrid(rows, cols);
  for (const p of placements) {
    writePlacementToGrid(grid, p);
  }

  // Map to PlacedWord using saved numbers
  const placedWords: PlacedWord[] = savedWords.map((w) => ({
    word: w.word,
    id: w.id,
    direction: w.direction,
    startRow: w.startRow,
    startCol: w.startCol,
    number: w.number,
  }));

  return { grid, placedWords, unplacedWords: [] };
}

/**
 * Checks whether the words have valid saved positions (not all at 0,0 with number 0).
 * If any word has a non-zero startRow, startCol, or number, we consider positions as saved.
 */
export function hasSavedPositions(words: SavedWordPosition[]): boolean {
  if (words.length === 0) return false;
  // If ALL words are at (0,0) with number 0, they haven't been positioned yet
  return words.some(
    (w) => w.startRow !== 0 || w.startCol !== 0 || w.number !== 0,
  );
}
