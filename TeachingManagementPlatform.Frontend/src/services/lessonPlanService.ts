import api from './api';
import type {
  LessonPlan,
  LessonPlanSummary,
  CreateLessonPlanRequest,
  UpdateLessonPlanRequest,
  LessonPlanSearchParams,
  Lesson,
  SharedLessonPlan,
} from '../types/lessonPlan';

type ApiLesson = {
  id: number;
  name: string;
  sortOrder: number;
};

type ApiLessonPlan = Omit<LessonPlan, 'lessons'> & {
  lessons: ApiLesson[];
};

type ApiLessonRequest = {
  id?: number;
  name: string;
  sortOrder: number;
};

type ApiCreateLessonPlanRequest = Omit<CreateLessonPlanRequest, 'lessons'> & {
  lessons?: ApiLessonRequest[];
};

type ApiUpdateLessonPlanRequest = Omit<UpdateLessonPlanRequest, 'lessons'> & {
  lessons?: ApiLessonRequest[];
};

function mapLessonsFromApi(planId: number, lessons: ApiLesson[]): Lesson[] {
  return lessons.map((lesson) => ({
    id: lesson.id,
    lessonPlanId: planId,
    name: lesson.name,
    orderIndex: lesson.sortOrder,
    documents: [],
    attachments: [],
    miniGames: [],
    scheduledDate: null,
  }));
}

function mapPlanFromApi(plan: ApiLessonPlan): LessonPlan {
  return {
    ...plan,
    lessons: mapLessonsFromApi(plan.id, plan.lessons),
  };
}

function mapLessonsToApi(lessons: CreateLessonPlanRequest['lessons']): ApiLessonRequest[] {
  return lessons.map((lesson) => ({
    id: lesson.id,
    name: lesson.name,
    sortOrder: lesson.orderIndex,
  }));
}

function mapPlanRequestToApi(
  data: CreateLessonPlanRequest | UpdateLessonPlanRequest,
): ApiCreateLessonPlanRequest | ApiUpdateLessonPlanRequest {
  return {
    ...data,
    lessons: data.lessons ? mapLessonsToApi(data.lessons) : undefined,
  };
}

export async function getAll(params?: LessonPlanSearchParams): Promise<LessonPlanSummary[]> {
  const response = await api.get<LessonPlanSummary[]>('/lesson-plans', { params });
  return response.data;
}

export async function getById(id: number): Promise<LessonPlan> {
  const response = await api.get<ApiLessonPlan>(`/lesson-plans/${id}`);
  return mapPlanFromApi(response.data);
}

export async function create(data: CreateLessonPlanRequest): Promise<LessonPlan> {
  const response = await api.post<ApiLessonPlan>('/lesson-plans', mapPlanRequestToApi(data));
  return mapPlanFromApi(response.data);
}

export async function update(id: number, data: UpdateLessonPlanRequest): Promise<LessonPlan> {
  const response = await api.put<ApiLessonPlan>(`/lesson-plans/${id}`, mapPlanRequestToApi(data));
  return mapPlanFromApi(response.data);
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/lesson-plans/${id}`);
}

export async function toggleShare(id: number, isShared: boolean): Promise<{ isShared: boolean }> {
  const response = await api.put<{ isShared: boolean }>(`/lesson-plans/${id}/share`, { isShared });
  return response.data;
}

export async function getSharedPlans(subject?: string, grade?: string): Promise<SharedLessonPlan[]> {
  const response = await api.get<SharedLessonPlan[]>('/shared-lesson-plans', { params: { subject, grade } });
  return response.data;
}

export async function copySharedPlan(sharedPlanId: number): Promise<{ id: number }> {
  const response = await api.post<{ id: number }>(`/lesson-plans/copy/${sharedPlanId}`);
  return response.data;
}

export async function generateShareCode(id: number): Promise<{ shareCode: string }> {
  const response = await api.post<{ shareCode: string }>(`/lesson-plans/${id}/generate-code`);
  return response.data;
}

export async function joinByCode(code: string): Promise<{ id: number; subject: string }> {
  const response = await api.post<{ id: number; subject: string }>(`/lesson-plans/join/${code}`);
  return response.data;
}
