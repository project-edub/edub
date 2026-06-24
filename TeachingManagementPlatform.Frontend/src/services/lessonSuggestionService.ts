import api from './api';
import type { LessonSuggestionResponse, AcceptSuggestionRequest } from '../types/lessonSuggestion';

export async function suggestContent(lessonId: number, description?: string): Promise<LessonSuggestionResponse> {
  const response = await api.post<LessonSuggestionResponse>(
    `/lessons/${lessonId}/suggest-content`,
    { description: description || null },
  );
  return response.data;
}

export async function acceptSuggestion(
  lessonId: number,
  request: AcceptSuggestionRequest,
): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>(
    `/lessons/${lessonId}/accept-suggestion`,
    request,
  );
  return response.data;
}

export async function getCachedSuggestion(lessonId: number): Promise<LessonSuggestionResponse | null> {
  const response = await api.get<LessonSuggestionResponse>(`/lessons/${lessonId}/suggestion-cache`, {
    validateStatus: (status) => status === 200 || status === 204,
  });
  if (response.status === 204 || !response.data) return null;
  return response.data;
}

export async function getSuggestAllCost(planId: number): Promise<{ totalLessons: number; uncachedCount: number; costPerLesson: number; totalCost: number }> {
  const response = await api.get<{ totalLessons: number; uncachedCount: number; costPerLesson: number; totalCost: number }>(`/lesson-plans/${planId}/suggest-all-cost`);
  return response.data;
}

export async function suggestAll(planId: number, description?: string): Promise<{ totalProcessed: number; totalCost: number }> {
  const response = await api.post<{ totalProcessed: number; totalCost: number }>(`/lesson-plans/${planId}/suggest-all`, { description: description || null });
  return response.data;
}
