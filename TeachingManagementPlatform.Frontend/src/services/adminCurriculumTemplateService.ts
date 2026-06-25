import api from './api';
import type {
  CurriculumTemplate,
  CurriculumTemplateLesson,
  GenerateFromTemplateRequest,
  GenerateFromTemplateResponse,
  SaveAsTemplateRequest,
} from '../types/curriculumTemplate';

export interface CreateTemplateRequest {
  subject: string;
  grade: number;
  bookSet?: string;
  sourceNote?: string;
  lessons?: { orderIndex: number; chapterName?: string; lessonName: string; suggestedPeriods: number }[];
}

export interface UpdateTemplateRequest {
  subject?: string;
  grade?: number;
  bookSet?: string;
  sourceNote?: string;
}

export interface UpdateTemplateLessonsRequest {
  lessons: { orderIndex: number; chapterName?: string; lessonName: string; suggestedPeriods: number }[];
}

export async function getTemplates(subject?: string, grade?: number, type?: string): Promise<CurriculumTemplate[]> {
  const response = await api.get<CurriculumTemplate[]>('/curriculum-templates', {
    params: { subject, grade, type },
  });
  return response.data;
}

export async function deleteTemplate(id: number): Promise<void> {
  await api.delete(`/curriculum-templates/${id}`);
}

export async function getTemplateLessons(templateId: number): Promise<CurriculumTemplateLesson[]> {
  const response = await api.get<CurriculumTemplateLesson[]>(
    `/curriculum-templates/${templateId}/lessons`,
  );
  return response.data;
}

export async function createTemplate(request: CreateTemplateRequest): Promise<CurriculumTemplate> {
  const response = await api.post<CurriculumTemplate>('/curriculum-templates', request);
  return response.data;
}

export async function updateTemplate(id: number, request: UpdateTemplateRequest): Promise<CurriculumTemplate> {
  const response = await api.put<CurriculumTemplate>(`/curriculum-templates/${id}`, request);
  return response.data;
}

export async function updateTemplateLessons(id: number, request: UpdateTemplateLessonsRequest): Promise<CurriculumTemplateLesson[]> {
  const response = await api.put<CurriculumTemplateLesson[]>(`/curriculum-templates/${id}/lessons`, request);
  return response.data;
}

export async function generateFromTemplate(
  lessonPlanId: number,
  templateId: number,
): Promise<GenerateFromTemplateResponse> {
  const request: GenerateFromTemplateRequest = { templateId };
  const response = await api.post<GenerateFromTemplateResponse>(
    `/lesson-plans/${lessonPlanId}/generate-from-template`,
    request,
  );
  return response.data;
}

export async function saveAsTemplate(
  lessonPlanId: number,
  request: SaveAsTemplateRequest,
): Promise<CurriculumTemplate> {
  const response = await api.post<CurriculumTemplate>(
    `/lesson-plans/${lessonPlanId}/save-as-template`,
    request,
  );
  return response.data;
}
