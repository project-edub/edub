export type SlotStatus = 'empty' | 'present' | 'absent' | 'excused';

export interface AttendanceSlot {
  id: string;
  date: string;
  label: string;
}

export interface StudentAttendance {
  studentId: string;
  name: string;
  slots: Record<string, SlotStatus>;
}

export interface AttendanceList {
  id: string;
  classId: string;
  name?: string;
  slots: AttendanceSlot[];
  rows: StudentAttendance[];
}

export interface AttendanceStudentSource {
  studentId: string;
  name: string;
}