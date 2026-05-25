export interface ClassLessonDocument {
  id: number;
  name: string;
  link: string;
  pageRange?: string | null;
}

export interface ClassLessonAttachment {
  id: number;
  fileName: string;
  fileReference: string;
  fileSize: number;
}

export interface ClassLessonMiniGame {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  createdAt: string;
}

export interface ClassLessonResponse {
  id: number;
  name: string;
  orderIndex: number;
  scheduledDate?: string | null;
  lessonStatus: 'finish' | 'unfinish' | 'pending';
  documents: ClassLessonDocument[];
  attachments: ClassLessonAttachment[];
  miniGames: ClassLessonMiniGame[];
}

export interface ClassLessonPlanResponse {
  lessonPlanId: number;
  subject: string;
  grade: string;
  schoolYearStart: string;
  schoolYearEnd: string;
  lessons: ClassLessonResponse[];
}
