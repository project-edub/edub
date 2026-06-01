import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'edub.lesson-minigame-links';
const EMPTY_MINIGAME_IDS: string[] = [];

interface LessonMinigameState {
  lessonMinigameIds: Record<string, string[]>;
}

let state = loadState();
const listeners = new Set<() => void>();

function hasWindowStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadState(): LessonMinigameState {
  if (!hasWindowStorage()) {
    return { lessonMinigameIds: {} };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { lessonMinigameIds: {} };
  }

  try {
    const parsed = JSON.parse(raw) as LessonMinigameState;
    return { lessonMinigameIds: parsed.lessonMinigameIds ?? {} };
  } catch {
    return { lessonMinigameIds: {} };
  }
}

function saveState(nextState: LessonMinigameState): void {
  if (hasWindowStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }
}

function emit(): void {
  saveState(state);
  listeners.forEach((listener) => listener());
}

function normalizeIds(minigameIds: string[]): string[] {
  return Array.from(new Set(minigameIds.filter((id) => id.trim().length > 0)));
}

export function getLessonMinigameIds(lessonId: number): string[] {
  return state.lessonMinigameIds[String(lessonId)] ?? EMPTY_MINIGAME_IDS;
}

export function setLessonMinigameIds(lessonId: number, minigameIds: string[]): void {
  state = {
    lessonMinigameIds: {
      ...state.lessonMinigameIds,
      [lessonId]: normalizeIds(minigameIds),
    },
  };
  emit();
}

export function attachMinigameToLesson(lessonId: number, minigameId: string): void {
  const currentIds = getLessonMinigameIds(lessonId);
  if (currentIds.includes(minigameId)) {
    return;
  }

  setLessonMinigameIds(lessonId, [...currentIds, minigameId]);
}

export function detachMinigameFromLesson(lessonId: number, minigameId: string): void {
  const currentIds = getLessonMinigameIds(lessonId);
  setLessonMinigameIds(
    lessonId,
    currentIds.filter((id) => id !== minigameId),
  );
}

export function replaceLessonMinigameIds(lessonId: number, minigameIds: string[]): void {
  setLessonMinigameIds(lessonId, minigameIds);
}

export function removeMinigameFromAllLessons(minigameId: string): void {
  const nextLessonMinigameIds: Record<string, string[]> = {};

  for (const [lessonId, minigameIds] of Object.entries(state.lessonMinigameIds)) {
    nextLessonMinigameIds[lessonId] = minigameIds.filter((id) => id !== minigameId);
  }

  state = { lessonMinigameIds: nextLessonMinigameIds };
  emit();
}

export function useLessonMinigameIds(lessonId: number): string[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getLessonMinigameIds(lessonId),
    () => getLessonMinigameIds(lessonId),
  );
}
