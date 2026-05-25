export interface Class {
  id: number;
  lecturerId: number;
  name: string;
  year: string;
  assignedLessonPlanId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassDetail extends Class {
  studentCount: number;
}

export interface CreateClassRequest {
  name: string;
  year: string;
}

export interface UpdateClassRequest {
  name?: string;
  year?: string;
}

export interface AssignLessonPlanRequest {
  lessonPlanId: number;
}
