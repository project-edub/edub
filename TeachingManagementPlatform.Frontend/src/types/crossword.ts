// ── Union types / const enums ─────────────────────────────────────────────────

export const GameStatus = {
  Draft: 'draft',
  Published: 'published',
  Archived: 'archived',
} as const;

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

/** Alias kept for UI state usage (same values as GameStatus). */
export type GameStatusType = GameStatus;

export const Direction = {
  Across: 'across',
  Down: 'down',
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

export const CellState = {
  Empty: 'empty',
  Filled: 'filled',
  Correct: 'correct',
  Incorrect: 'incorrect',
  Revealed: 'revealed',
} as const;

export type CellState = (typeof CellState)[keyof typeof CellState];

// ── Grid types ────────────────────────────────────────────────────────────────

export interface GridCell {
  row: number;
  col: number;
  /** The correct answer letter for this cell (uppercase, no diacritics). */
  letter: string;
  /** True for black/blocked cells that are not part of any word. */
  isBlack: boolean;
  /** Word-number label shown in the top-left corner of numbered cells. */
  cellNumber?: number;
  state: CellState;
}

/** 2-D array of GridCell representing the full crossword grid. */
export type CrosswordGrid = GridCell[][];

// ── Game configuration ────────────────────────────────────────────────────────

export interface GameConfig {
  wordCount: number;
  /** 'easy' | 'medium' | 'hard' */
  difficulty: string;
  /** 'vi' | 'en' */
  language: string;
  /** 'definition' | 'fill-in-blank' */
  clueStyle: string;
  topic?: string;
  excludeWords: string[];
  gridSize?: number;
}

// ── Core domain models ────────────────────────────────────────────────────────

export interface CrosswordWord {
  id: number;
  gameId: number;
  /** Normalized answer: uppercase, no diacritics. */
  word: string;
  /** Original word with diacritics for display. */
  displayWord: string;
  clue: string;
  direction: Direction;
  startRow: number;
  startCol: number;
  number: number;
  difficulty: string;
  sourceContext?: string | null;
}

export interface CrosswordGame {
  id: number;
  userId: number;
  title: string;
  status: GameStatus;
  slug: string;
  configJson: string;
  gridJson: string;
  ecoinsSpent: number;
  sourceDocumentContent?: string | null;
  sourceDocumentExpiresAt?: string | null;
  deadline?: string | null;
  showAnswerAfterExpiry: boolean;
  maxAttempts?: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  words: CrosswordWord[];
}

export interface CrosswordEcoinTransaction {
  id: number;
  userId: number;
  gameId: number;
  ecoinsSpent: number;
  /** 'generate' | 'regenerate' */
  action: string;
  createdAt: string;
}

// ── API response / request DTOs ───────────────────────────────────────────────

export interface CrosswordFileExtractResult {
  fileName: string;
  /** 'good' | 'fair' | 'poor' | 'empty' */
  quality: string;
  extractedText: string;
}

export interface CrosswordUploadResponse {
  gameId: number;
  files: CrosswordFileExtractResult[];
}

export interface CrosswordEstimateBreakdown {
  baseCost: number;
  clueStyleModifier: number;
  languageModifier: number;
}

export interface CrosswordEstimateResponse {
  ecoinsRequired: number;
  breakdown: CrosswordEstimateBreakdown;
}

export interface CrosswordWordDto {
  word: string;
  displayWord: string;
  clue: string;
  difficulty: string;
  sourceContext?: string | null;
}

export interface CrosswordGenerateResponse {
  gameId: number;
  slug: string;
  words: CrosswordWordDto[];
}

// ── Teacher game DTO (full detail, answers visible) ───────────────────────────

export interface CrosswordWordDetailDto {
  id: number;
  word: string;
  displayWord: string;
  clue: string;
  direction: Direction;
  startRow: number;
  startCol: number;
  number: number;
  difficulty: string;
  sourceContext?: string | null;
}

export interface CrosswordGameDto {
  id: number;
  title: string;
  status: GameStatus;
  slug: string;
  configJson: string;
  gridJson: string;
  ecoinsSpent: number;
  deadline?: string | null;
  showAnswerAfterExpiry: boolean;
  maxAttempts?: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  words: CrosswordWordDetailDto[];
}

// ── Player DTO (public, answers hidden) ───────────────────────────────────────

export interface CrosswordPlayerWordDto {
  id: number;
  /** Masked word — letters replaced with underscores for the player. */
  displayWord: string;
  clue: string;
  direction: Direction;
  startRow: number;
  startCol: number;
  number: number;
  /** Length of the answer so the grid can render the correct number of cells. */
  wordLength: number;
}

export interface CrosswordPlayerDto {
  slug: string;
  title: string;
  gridJson: string;
  deadline?: string | null;
  maxAttempts?: number | null;
  showAnswerAfterExpiry: boolean;
  isExpired: boolean;
  words: CrosswordPlayerWordDto[];
}

// ── List item ─────────────────────────────────────────────────────────────────

export interface CrosswordListItemDto {
  id: number;
  title: string;
  status: GameStatus;
  createdAt: string;
  wordCount: number;
  ecoinsSpent: number;
  slug: string;
}

// ── Submit answers ────────────────────────────────────────────────────────────

export interface CrosswordSubmitRequest {
  /** Map of wordId → student's answer string. */
  answers: Record<number, string>;
}

export interface CrosswordWordResult {
  wordId: number;
  isCorrect: boolean;
}

export interface CrosswordSubmitResponse {
  results: CrosswordWordResult[];
  correctCount: number;
  totalCount: number;
  allCorrect: boolean;
}
