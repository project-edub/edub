import api from './api';
import type { QuizGenerationResponse } from '../types/quiz';

export async function generateQuiz(formData: FormData): Promise<QuizGenerationResponse> {
  try {
    const response = await api.post<QuizGenerationResponse>('/quiz/generate', formData);
    return response.data;
  } catch (err: any) {
    // Normalize server error shape { error: { code, message, ... } }
    const data = err?.response?.data;
    const server = data?.error;
    if (server) throw { code: server.code, message: server.message, details: server };

    // ASP.NET Core automatic model validation response shape
    if (data?.errors && typeof data.errors === 'object') {
      const allErrors = Object.values(data.errors)
        .flatMap((messages: any) => (Array.isArray(messages) ? messages : [String(messages)]))
        .filter(Boolean);
      throw {
        code: 'VALIDATION_ERROR',
        message: allErrors[0] ?? data?.title ?? 'Dữ liệu gửi lên không hợp lệ.',
        details: data,
      };
    }

    if (typeof data?.title === 'string') {
      throw {
        code: data?.status === 400 ? 'VALIDATION_ERROR' : 'ERROR',
        message: data.title,
        details: data,
      };
    }

    throw err;
  }
}

export async function createGoogleForm(payload: { title: string; questions: any[]; teacherGoogleEmail?: string; googleAccessToken?: string }) {
  try {
    const response = await api.post('/quiz/create-form', payload);
    return response.data;
  } catch (err: any) {
    const server = err?.response?.data?.error;
    if (server) throw { code: server.code, message: server.message, details: server };
    throw err;
  }
}
