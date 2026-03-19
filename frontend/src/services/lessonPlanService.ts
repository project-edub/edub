import api from './api';
import type {
  LessonPlan,
  LessonPlanSummary,
  CreateLessonPlanRequest,
  UpdateLessonPlanRequest,
  LessonPlanSearchParams,
} from '../types/lessonPlan';

export async function getAll(params?: LessonPlanSearchParams): Promise<LessonPlanSummary[]> {
  const response = await api.get<LessonPlanSummary[]>('/lesson-plans', { params });
  return response.data;
}

export async function getById(id: number): Promise<LessonPlan> {
  const response = await api.get<LessonPlan>(`/lesson-plans/${id}`);
  return response.data;
}

export async function create(data: CreateLessonPlanRequest): Promise<LessonPlan> {
  const response = await api.post<LessonPlan>('/lesson-plans', data);
  return response.data;
}

export async function update(id: number, data: UpdateLessonPlanRequest): Promise<LessonPlan> {
  const response = await api.put<LessonPlan>(`/lesson-plans/${id}`, data);
  return response.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/lesson-plans/${id}`);
}
