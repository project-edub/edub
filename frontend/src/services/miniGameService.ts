import api from './api';
import type { MiniGame, CreateMiniGameRequest, MiniGamePlayData } from '../types/miniGame';

export async function createMiniGame(lessonId: number, data: CreateMiniGameRequest): Promise<MiniGame> {
  const response = await api.post<MiniGame>(`/lessons/${lessonId}/mini-games`, data);
  return response.data;
}

export async function getMiniGame(id: number): Promise<MiniGame> {
  const response = await api.get<MiniGame>(`/mini-games/${id}`);
  return response.data;
}

export async function getMiniGamePlayData(id: number): Promise<MiniGamePlayData> {
  const response = await api.get<MiniGamePlayData>(`/mini-games/${id}/play`);
  return response.data;
}

export async function deleteMiniGame(id: number): Promise<void> {
  await api.delete(`/mini-games/${id}`);
}
