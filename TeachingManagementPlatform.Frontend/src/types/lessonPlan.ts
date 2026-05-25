import type { GameType } from './common';

export interface LessonDocument {
  id: number;
  lessonId: number;
  name: string;
  link: string;
  pageRange?: string | null;
}

export interface LessonAttachment {
  id: number;
  lessonId: number;
  fileName: string;
  fileReference: string;
  fileSize: number;
}

export interface MiniGameSummary {
  id: number;
  name: string;
  type: GameType;
}

export interface Lesson {
  id: number;
  lessonPlanId: number;
  name: string;
  orderIndex: number;
  scheduledDate?: string | null;
  documents: LessonDocument[];
  attachments: LessonAttachment[];
  miniGames: MiniGameSummary[];
}

export interface LessonPlan {
  id: number;
  lecturerId: number;
  subject: string;
  grade: string;
  schoolYearStart: string;
  schoolYearEnd: string;
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
}

export interface LessonPlanSummary {
  id: number;
  subject: string;
  grade: string;
  schoolYearStart: string;
  schoolYearEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonRequest {
  id?: number;
  name: string;
  orderIndex: number;
}

export interface CreateLessonPlanRequest {
  subject: string;
  grade: string;
  schoolYearStart: string;
  schoolYearEnd: string;
  lessons: CreateLessonRequest[];
}

export interface UpdateLessonPlanRequest {
  subject?: string;
  grade?: string;
  schoolYearStart?: string;
  schoolYearEnd?: string;
  lessons?: CreateLessonRequest[];
}

export interface AddDocumentRequest {
  name: string;
  link: string;
  pageRange?: string;
}

export interface UpdateLessonScheduleRequest {
  scheduledDate: string;
}

export interface UpdateDocumentRequest {
  name: string;
  link: string;
  pageRange?: string;
}

export interface DocumentResponse {
  id: number;
  name: string;
  link: string;
  pageRange?: string | null;
}

export interface AttachmentResponse {
  id: number;
  fileName: string;
  fileReference: string;
  fileSize: number;
}

export interface MiniGameSummaryResponse {
  id: number;
  name: string;
  description?: string | null;
  type: GameType;
  createdAt?: string;
}

export interface LessonDetail {
  id: number;
  name: string;
  orderIndex: number;
  scheduledDate?: string | null;
  documents: DocumentResponse[];
  attachments: AttachmentResponse[];
  miniGames: MiniGameSummaryResponse[];
}

export interface LessonPlanSearchParams {
  grade?: string;
  subject?: string;
  schoolYear?: string;
}
