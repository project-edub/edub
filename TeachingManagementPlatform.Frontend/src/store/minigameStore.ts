import { useSyncExternalStore } from 'react';
import type { LegacyMiniGameSummary, Minigame } from '../types/minigameLibrary';
import { removeMinigameFromAllLessons } from './lessonStore';

const STORAGE_KEY = 'edub.minigames';

interface MinigameState {
  minigames: Minigame[];
}

let state = loadState();
const listeners = new Set<() => void>();

function hasWindowStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadState(): MinigameState {
  if (!hasWindowStorage()) {
    return { minigames: [] };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { minigames: [] };
  }

  try {
    const parsed = JSON.parse(raw) as MinigameState;
    return { minigames: parsed.minigames ?? [] };
  } catch {
    return { minigames: [] };
  }
}

function saveState(nextState: MinigameState): void {
  if (hasWindowStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }
}

function emit(): void {
  saveState(state);
  listeners.forEach((listener) => listener());
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `mg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function toTimestamp(value?: string | null): string {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeMinigame(minigame: Minigame): Minigame {
  return {
    ...minigame,
    title: minigame.title.trim(),
    description: minigame.description?.trim() || undefined,
    type: minigame.type.trim() || 'quiz',
  };
}

function upsertOne(nextMinigame: Minigame): void {
  const index = state.minigames.findIndex((minigame) => minigame.id === nextMinigame.id);
  const minigames = [...state.minigames];

  if (index >= 0) {
    minigames[index] = nextMinigame;
  } else {
    minigames.unshift(nextMinigame);
  }

  state = { minigames };
}

export function getMinigameById(id: string): Minigame | undefined {
  return state.minigames.find((minigame) => minigame.id === id);
}

export function addMinigame(data: { title: string; description?: string; type?: string }): Minigame {
  const now = new Date().toISOString();
  const nextMinigame: Minigame = normalizeMinigame({
    id: generateId(),
    title: data.title,
    description: data.description,
    type: data.type ?? 'quiz',
    createdAt: now,
    updatedAt: now,
  });

  state = { minigames: [nextMinigame, ...state.minigames] };
  emit();
  return nextMinigame;
}

export function updateMinigame(id: string, data: Partial<Pick<Minigame, 'title' | 'description' | 'type'>>): Minigame | null {
  const current = getMinigameById(id);
  if (!current) {
    return null;
  }

  const updatedMinigame = normalizeMinigame({
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  });

  upsertOne(updatedMinigame);
  emit();
  return updatedMinigame;
}

export function deleteMinigame(id: string): void {
  state = { minigames: state.minigames.filter((minigame) => minigame.id !== id) };
  removeMinigameFromAllLessons(id);
  emit();
}

export function upsertMinigames(minigames: Array<Minigame | LegacyMiniGameSummary>): void {
  const nextMinigames = [...state.minigames];

  for (const minigame of minigames) {
    const normalized: Minigame = 'title' in minigame
      ? normalizeMinigame(minigame)
      : normalizeMinigame({
          id: `legacy-${minigame.id}`,
          title: minigame.name,
          description: minigame.description ?? undefined,
          type: minigame.type,
          createdAt: toTimestamp(minigame.createdAt),
          updatedAt: toTimestamp(minigame.createdAt),
        });

    const index = nextMinigames.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      nextMinigames[index] = normalized;
    } else {
      nextMinigames.unshift(normalized);
    }
  }

  state = { minigames: nextMinigames };
  emit();
}

export function useMinigameStore() {
  const minigames = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state.minigames,
    () => state.minigames,
  );

  return {
    minigames,
    addMinigame,
    updateMinigame,
    deleteMinigame,
    getMinigameById,
    upsertMinigames,
  };
}
