export type TemplateType = 'system' | 'personal' | 'community';

export interface CurriculumTemplate {
  id: number;
  subject: string;
  grade: number;
  bookSet?: string | null;
  createdBy?: number | null;
  isPublic: boolean;
  sourceNote?: string | null;
  usageCount: number;
  lessonCount: number;
  createdAt: string;
}

export interface CurriculumTemplateLesson {
  id: number;
  orderIndex: number;
  chapterName?: string | null;
  lessonName: string;
  suggestedPeriods: number;
}

export interface GeneratedLesson {
  id: number;
  name: string;
  orderIndex: number;
}

export interface GenerateFromTemplateRequest {
  templateId: number;
}

export interface GenerateFromTemplateResponse {
  lessons: GeneratedLesson[];
}

export interface SaveAsTemplateRequest {
  isPublic: boolean;
  bookSet?: string;
  sourceNote?: string;
}

export interface LessonItemDto {
  orderIndex: number;
  chapterName?: string;
  lessonName: string;
  suggestedPeriods: number;
}

export interface CreateCurriculumTemplateRequest {
  subject: string;
  grade: number;
  bookSet?: string;
  sourceNote?: string;
  lessons?: LessonItemDto[];
}

export interface UpdateCurriculumTemplateRequest {
  subject?: string;
  grade?: number;
  bookSet?: string;
  sourceNote?: string;
  isPublic?: boolean;
}

export interface BulkUpdateLessonsRequest {
  lessons: LessonItemDto[];
}
