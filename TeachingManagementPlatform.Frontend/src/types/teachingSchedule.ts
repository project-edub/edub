export interface WeekdaySlot {
  weekday: number; // 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday
  periods: number;
}

export interface ClassSubjectSchedule {
  id: number;
  classId: number;
  subject: string;
  calendarId: number;
  periodsPerWeek: number;
  weekdaySlots: WeekdaySlot[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertScheduleRequest {
  subject: string;
  periodsPerWeek: number;
  weekdaySlots: WeekdaySlot[];
  calendarId: number;
}

export interface SchoolYearCalendar {
  id: number;
  yearStart: string;
  yearEnd: string;
  createdBy: number | null;
  isDefault: boolean;
  holidayCount: number;
  createdAt: string;
}

export interface SchoolYearHoliday {
  id: number;
  calendarId: number;
  startDate: string;
  endDate: string;
  name: string;
}

export interface LessonDate {
  lessonId: number;
  lessonName: string;
  teachingDate: string;
}

export interface CalculateDatesResponse {
  lessonDates: LessonDate[];
}

export interface ApplyDatesRequest {
  dates: LessonDate[];
}
