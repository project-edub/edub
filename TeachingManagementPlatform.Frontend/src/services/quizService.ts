import api from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuizListItem {
  id: number;
  title: string;
  status: string;
  slug: string;
  questionCount: number;
  submissionCount: number;
  ecoinsSpent: number;
  createdAt: string;
}

export interface QuizGameDetail {
  id: number;
  title: string;
  status: string;
  slug: string;
  configJson: string;
  showAnswersAfterSubmit: boolean;
  requireStudentName: boolean;
  ecoinsSpent: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  questions: QuizQuestionDetail[];
}

export interface QuizQuestionDetail {
  id: number;
  number: number;
  questionType: string;
  questionText: string;
  optionsJson: string;
  correctAnswerIndex: number;
  correctAnswerText: string | null;
  explanation: string | null;
  difficulty: string;
}

export interface QuizPlayerData {
  slug: string;
  title: string;
  showAnswersAfterSubmit: boolean;
  requireStudentName: boolean;
  questions: QuizPlayerQuestion[];
}

export interface QuizPlayerQuestion {
  id: number;
  number: number;
  questionType: string;
  questionText: string;
  optionsJson: string;
}

export interface QuizSubmitResponse {
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  showAnswers: boolean;
  results: QuizQuestionResult[] | null;
}

export interface QuizQuestionResult {
  questionId: number;
  isCorrect: boolean;
  correctAnswerIndex: number;
  correctAnswerText: string | null;
  explanation: string | null;
}

export interface QuizSubmission {
  id: number;
  studentName: string;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  submittedAt: string;
}

// ── Error normalization ───────────────────────────────────────────────────────

function normalizeError(err: any): never {
  const data = err?.response?.data;
  const server = data?.error;
  if (server) throw { code: server.code, message: server.message, details: server };
  throw err;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function generateQuiz(formData: FormData): Promise<{ gameId: number; slug: string; questionCount: number; warnings: string[] }> {
  try {
    const response = await api.post('/quiz/generate', formData);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

export async function getQuizList(): Promise<QuizListItem[]> {
  try {
    const response = await api.get<QuizListItem[]>('/quiz-game');
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

export async function getQuiz(id: number): Promise<QuizGameDetail> {
  try {
    const response = await api.get<QuizGameDetail>(`/quiz-game/${id}`);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

export async function updateQuiz(id: number, data: Partial<QuizGameDetail>): Promise<QuizGameDetail> {
  try {
    const response = await api.put<QuizGameDetail>(`/quiz-game/${id}`, data);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

export async function publishQuiz(id: number, data: { showAnswersAfterSubmit: boolean }): Promise<QuizGameDetail> {
  try {
    const response = await api.post<QuizGameDetail>(`/quiz-game/${id}/publish`, data);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

export async function deleteQuiz(id: number): Promise<void> {
  try {
    await api.delete(`/quiz-game/${id}`);
  } catch (err: any) {
    normalizeError(err);
  }
}

export async function getQuizSubmissions(id: number): Promise<QuizSubmission[]> {
  try {
    const response = await api.get<QuizSubmission[]>(`/quiz-game/${id}/submissions`);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

// Player API (public)
export async function getPlayerQuiz(slug: string): Promise<QuizPlayerData> {
  try {
    const response = await api.get<QuizPlayerData>(`/quiz-play/${slug}`);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

export async function submitQuiz(slug: string, data: { studentName: string; answers: Array<{ questionId: number; answerIndex: number; answerText?: string }> }): Promise<QuizSubmitResponse> {
  try {
    const response = await api.post<QuizSubmitResponse>(`/quiz-play/${slug}/submit`, data);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}
