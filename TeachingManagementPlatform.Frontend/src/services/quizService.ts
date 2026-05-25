import api from './api';
import type { QuizGenerationResponse } from '../types/quiz';

export async function generateQuiz(formData: FormData): Promise<QuizGenerationResponse> {
  try {
    const response = await api.post<QuizGenerationResponse>('/quiz/generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (err: any) {
    // Normalize server error shape { error: { code, message, ... } }
    const server = err?.response?.data?.error;
    if (server) throw { code: server.code, message: server.message, details: server };
    throw err;
  }
}

export async function createGoogleForm(payload: { title: string; questions: any[]; teacherGoogleEmail: string }) {
  try {
    const response = await api.post('/quiz/create-form', payload);
    return response.data;
  } catch (err: any) {
    const server = err?.response?.data?.error;
    if (server) throw { code: server.code, message: server.message, details: server };
    throw err;
  }
}
