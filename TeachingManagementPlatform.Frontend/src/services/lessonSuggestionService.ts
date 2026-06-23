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
