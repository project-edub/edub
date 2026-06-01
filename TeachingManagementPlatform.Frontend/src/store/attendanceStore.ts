import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AttendanceList, AttendanceSlot, AttendanceStudentSource } from '../types/attendance';
import { cycleSlotStatus, ensureAttendanceMatrix, sortSlotsByDate } from '../utils/attendanceHelpers';

const STORAGE_PREFIX = 'edub.attendance';

function storageKey(classId: number): string {
  return `${STORAGE_PREFIX}:${classId}`;
}

function defaultAttendanceName(classId: number): string {
  return `Điểm danh lớp ${classId}`;
}

function createEmptyAttendanceList(classId: number, students: AttendanceStudentSource[]): AttendanceList {
  return {
    id: `${classId}`,
    classId: `${classId}`,
    name: defaultAttendanceName(classId),
    slots: [],
    rows: students.map((student) => ({
      studentId: student.studentId,
      name: student.name,
      slots: {},
    })),
  };
}

function buildRows(students: AttendanceStudentSource[], existingRows: AttendanceList['rows']): AttendanceList['rows'] {
  const existingByStudentId = new Map(existingRows.map((row) => [row.studentId, row]));
  return students.map((student) => {
    const existing = existingByStudentId.get(student.studentId);
    return {
      studentId: student.studentId,
      name: student.name,
      slots: existing?.slots ?? {},
    };
  });
}

function normalizeAttendanceList(list: AttendanceList, students: AttendanceStudentSource[]): AttendanceList {
  return ensureAttendanceMatrix({
    ...list,
    name: list.name ?? defaultAttendanceName(Number(list.classId)),
    rows: buildRows(students, list.rows),
  });
}

function loadAttendanceList(classId: number): AttendanceList | null {
  const raw = window.localStorage.getItem(storageKey(classId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AttendanceList;
  } catch {
    return null;
  }
}

function saveAttendanceList(list: AttendanceList | null): void {
  if (!list) return;
  window.localStorage.setItem(storageKey(Number(list.classId)), JSON.stringify(list));
}

export function createSlotAttendanceList(classId: number, students: AttendanceStudentSource[], slot: AttendanceSlot): AttendanceList {
  const list = createEmptyAttendanceList(classId, students);
  list.slots = [slot];
  list.rows = list.rows.map((row) => ({
    ...row,
    slots: { [slot.id]: 'empty' },
  }));
  return list;
}

export function useAttendanceStore(classId: number, students: AttendanceStudentSource[]) {
  const rosterKey = useMemo(
    () => students.map((student) => `${student.studentId}:${student.name}`).join('|'),
    [students],
  );

  const [attendanceList, setAttendanceList] = useState<AttendanceList | null>(() => {
    const stored = loadAttendanceList(classId);
    return stored ? normalizeAttendanceList(stored, students) : createEmptyAttendanceList(classId, students);
  });

  useEffect(() => {
    const stored = loadAttendanceList(classId);
    setAttendanceList(stored ? normalizeAttendanceList(stored, students) : createEmptyAttendanceList(classId, students));
  }, [classId, rosterKey]);

  useEffect(() => {
    saveAttendanceList(attendanceList);
  }, [attendanceList]);

  const addSlot = useCallback((slot: AttendanceSlot) => {
    setAttendanceList((current) => {
      if (!current) return null;
      const nextSlots = sortSlotsByDate([...current.slots, slot]);
      return {
        ...current,
        slots: nextSlots,
        rows: current.rows.map((row) => ({
          ...row,
          slots: {
            ...row.slots,
            [slot.id]: 'empty',
          },
        })),
      };
    });
  }, []);

  const updateSlotDate = useCallback((slotId: string, date: string) => {
    setAttendanceList((current) => {
      if (!current) return null;
      const updated = current.slots.map((slot) => (slot.id === slotId ? { ...slot, date } : slot));
      return {
        ...current,
        slots: sortSlotsByDate(updated),
      };
    });
  }, []);

  const removeSlot = useCallback((slotId: string) => {
    setAttendanceList((current) => {
      if (!current) return null;
      return {
        ...current,
        slots: current.slots.filter((slot) => slot.id !== slotId),
        rows: current.rows.map((row) => {
          const nextSlots = { ...row.slots };
          delete nextSlots[slotId];
          return {
            ...row,
            slots: nextSlots,
          };
        }),
      };
    });
  }, []);

  const renameAttendanceList = useCallback((name: string) => {
    setAttendanceList((current) => {
      if (!current) return null;
      return {
        ...current,
        name: name.trim() || defaultAttendanceName(Number(current.classId)),
      };
    });
  }, []);

  const resetAttendanceList = useCallback(() => {
    setAttendanceList(createEmptyAttendanceList(classId, students));
    window.localStorage.removeItem(storageKey(classId));
  }, [classId, students]);

  const toggleSlotStatus = useCallback((studentId: string, slotId: string) => {
    setAttendanceList((current) => {
      if (!current) return null;
      return {
        ...current,
        rows: current.rows.map((row) => {
          if (row.studentId !== studentId) return row;
          const currentStatus = row.slots[slotId] ?? 'empty';
          return {
            ...row,
            slots: {
              ...row.slots,
              [slotId]: cycleSlotStatus(currentStatus),
            },
          };
        }),
      };
    });
  }, []);

  const replaceAttendanceList = useCallback((nextList: AttendanceList | null) => {
    if (!nextList) {
      setAttendanceList(null);
      return;
    }
    const sorted = { ...nextList, slots: sortSlotsByDate(nextList.slots) };
    setAttendanceList(sorted);
  }, []);

  return {
    attendanceList,
    addSlot,
    updateSlotDate,
    removeSlot,
    renameAttendanceList,
    resetAttendanceList,
    toggleSlotStatus,
    replaceAttendanceList,
  };
}