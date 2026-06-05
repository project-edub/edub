import api from './api';

export interface ScoreTemplateColumn {
  name: string;
  coefficient: number | null;
  isAverageColumn: boolean;
  sortOrder: number;
}

export interface ScoreTemplate {
  id: number;
  name: string;
  subject: string;
  columns: ScoreTemplateColumn[];
}

export interface CreateScoreTemplateRequest {
  name: string;
  subject: string;
  columns: ScoreTemplateColumn[];
}

export interface UpdateScoreTemplateRequest {
  name: string;
  subject: string;
  columns: ScoreTemplateColumn[];
}

export async function getScoreTemplates(): Promise<ScoreTemplate[]> {
  const response = await api.get<ScoreTemplate[]>('/score-templates');
  return response.data;
}

export async function getScoreTemplate(id: number): Promise<ScoreTemplate> {
  const response = await api.get<ScoreTemplate>(`/score-templates/${id}`);
  return response.data;
}

export async function createScoreTemplate(data: CreateScoreTemplateRequest): Promise<ScoreTemplate> {
  const response = await api.post<ScoreTemplate>('/score-templates', data);
  return response.data;
}

export async function updateScoreTemplate(id: number, data: UpdateScoreTemplateRequest): Promise<ScoreTemplate> {
  const response = await api.put<ScoreTemplate>(`/score-templates/${id}`, data);
  return response.data;
}

export async function deleteScoreTemplate(id: number): Promise<void> {
  await api.delete(`/score-templates/${id}`);
}
