import type { AttendanceList, AttendanceSlot, SlotStatus, StudentAttendance } from '../types/attendance';
import { formatDate } from './formatters';

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