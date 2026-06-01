import type { AttendanceList, AttendanceSlot, SlotStatus, StudentAttendance } from '../types/attendance';
import { formatDate } from './formatters';

/**
 * Parse a slot date string (dd/MM/yyyy or ISO) into a Date object or null.
 */
export function parseSlotDateToDate(raw: string): Date | null {
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length === 3) {
    const [dayPart, monthPart, yearPart] = parts.map((p) => p.trim());
    const day = Number(dayPart);
    const month = Number(monthPart);
    const year = Number(yearPart);
    if (Number.isInteger(day) && Number.isInteger(month) && Number.isInteger(year)) {
      const d = new Date(year, month - 1, day);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) return d;
    }
  }
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function getPresentCount(row: StudentAttendance): number {
  return Object.values(row.slots).filter((status) => status === 'present' || status === 'excused').length;
}

export function getAttendancePercent(row: StudentAttendance): number | null {
  const markedSlots = Object.values(row.slots).filter((s) => s !== 'empty').length;
  const presentSlots = Object.values(row.slots).filter((s) => s === 'present' || s === 'excused').length;
  if (markedSlots === 0) return null;
  return Math.round((presentSlots / markedSlots) * 100);
}

export function cycleSlotStatus(status: SlotStatus): SlotStatus {
  if (status === 'empty') return 'present';
  if (status === 'present') return 'absent';
  if (status === 'absent') return 'excused';
  return 'empty';
}

export function createAttendanceSlot(label: string, date: string): AttendanceSlot {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: label.trim(),
    date,
  };
}

export function formatAttendanceSlotDate(date: string): string {
  return formatDate(date);
}

export function buildAttendanceFilename(className: string, date = new Date()): string {
  const safeClassName = className.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'lop-hoc';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `diem-danh-${safeClassName}-${year}-${month}-${day}.xlsx`;
}

export function hasDuplicateSlotLabel(slots: AttendanceSlot[], label: string, ignoreSlotId?: string): boolean {
  const normalizedLabel = label.trim().toLowerCase();
  if (!normalizedLabel) return false;
  return slots.some((slot) => slot.id !== ignoreSlotId && slot.label.trim().toLowerCase() === normalizedLabel);
}

export function hasDuplicateSlotDate(slots: AttendanceSlot[], date: string, ignoreSlotId?: string): boolean {
  const normalizedDate = formatAttendanceSlotDate(date).trim();
  if (!normalizedDate) return false;
  return slots.some((slot) => slot.id !== ignoreSlotId && formatAttendanceSlotDate(slot.date).trim() === normalizedDate);
}

export function ensureAttendanceMatrix(list: AttendanceList): AttendanceList {
  return {
    ...list,
    rows: list.rows.map((row) => ({
      ...row,
      slots: list.slots.reduce<Record<string, SlotStatus>>((acc, slot) => {
        acc[slot.id] = row.slots[slot.id] ?? 'empty';
        return acc;
      }, {}),
    })),
  };
}

export function sortSlotsByDate(slots: AttendanceSlot[]): AttendanceSlot[] {
  return [...slots].sort((a, b) => {
    const da = parseSlotDateToDate(a.date);
    const db = parseSlotDateToDate(b.date);
    if (!da || !db) return 0;
    return da.getTime() - db.getTime();
  });
}