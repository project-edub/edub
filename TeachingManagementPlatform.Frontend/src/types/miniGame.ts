import type { GameType } from './common';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
}

export interface MiniGame {
  id: number;
  lessonId: number;
  name: string;
  description?: string | null;
  type: GameType;
  content: QuizContent | null;
  createdAt: string;
}

export interface CreateMiniGameRequest {
  name: string;
  description?: string;
  type: GameType;
}

export interface MiniGamePlayData {
  id: number;
  name: string;
  type: GameType;
  content: QuizContent;
}
