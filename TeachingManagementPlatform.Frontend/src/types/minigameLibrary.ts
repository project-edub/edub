export interface Minigame {
  id: string;
  title: string;
  description?: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyMiniGameSummary {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  createdAt?: string | null;
}
