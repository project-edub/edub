import api from './api';
import type { ClassLessonPlanResponse, ClassLessonResponse } from '../types/classLessonPlan';

export async function assignLessonPlan(classId: number, lessonPlanId: number): Promise<ClassLessonPlanResponse> {
  const response = await api.put<ClassLessonPlanResponse>(`/classes/${classId}/lesson-plan`, { lessonPlanId });
  return response.data;
}

export async function unassignLessonPlan(classId: number): Promise<void> {
  await api.delete(`/classes/${classId}/lesson-plan`);
}

export async function getAssignedPlan(classId: number): Promise<ClassLessonPlanResponse | null> {
  const response = await api.get<ClassLessonPlanResponse>(`/classes/${classId}/lesson-plan`);
  // Backend returns empty object {} when no plan assigned
  if (!response.data || !response.data.lessonPlanId) return null;
  return response.data;
}

export async function updateLessonSchedule(
  classId: number,
  lessonId: number,
  scheduledDate: string | null,
  lessonStatus?: 'finish' | 'unfinish' | 'pending',
): Promise<ClassLessonResponse> {
  const response = await api.put<ClassLessonResponse>(
    `/classes/${classId}/lessons/${lessonId}/schedule`,
    { scheduledDate, lessonStatus },
  );
  return response.data;
}
