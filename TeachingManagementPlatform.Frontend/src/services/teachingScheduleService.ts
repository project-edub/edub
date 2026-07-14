import api from './api';
import type {
  ClassSubjectSchedule,
  UpsertScheduleRequest,
  CalculateDatesResponse,
  ApplyDatesRequest,
  SchoolYearCalendar,
  SchoolYearHoliday,
} from '../types/teachingSchedule';

export async function getSchedule(classId: number, subject: string): Promise<ClassSubjectSchedule> {
  const response = await api.get<ClassSubjectSchedule>(`/classes/${classId}/schedule`, {
    params: { subject },
  });
  return response.data;
}

export async function upsertSchedule(
  classId: number,
  request: UpsertScheduleRequest,
): Promise<ClassSubjectSchedule> {
  const response = await api.put<ClassSubjectSchedule>(`/classes/${classId}/schedule`, request);
  return response.data;
}

export async function calculateDates(
  classId: number,
  lessonPlanId: number,
): Promise<CalculateDatesResponse> {
  const response = await api.post<CalculateDatesResponse>(
    `/classes/${classId}/lesson-plans/${lessonPlanId}/calculate-dates`,
  );
  return response.data;
}

export async function applyDates(
  classId: number,
  lessonPlanId: number,
  request: ApplyDatesRequest,
): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>(
    `/classes/${classId}/lesson-plans/${lessonPlanId}/apply-dates`,
    request,
  );
  return response.data;
}

export async function getCalendars(): Promise<SchoolYearCalendar[]> {
  const response = await api.get<SchoolYearCalendar[]>('/school-year-calendars');
  return response.data;
}

export async function getCalendarHolidays(calendarId: number): Promise<SchoolYearHoliday[]> {
  const response = await api.get<SchoolYearHoliday[]>(
    `/school-year-calendars/${calendarId}/holidays`,
  );
  return response.data;
}
