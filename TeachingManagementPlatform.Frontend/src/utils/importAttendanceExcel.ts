import * as XLSX from 'xlsx';
import type { AttendanceList, AttendanceSlot, AttendanceStudentSource, SlotStatus } from '../types/attendance';

function parseStatusCell(value: unknown): SlotStatus {
  const v = String(value ?? '').trim();
  if (!v) return 'empty';
  if (v.includes('Vắng CP') || v.includes('CP') || v === 'Excused' || v === '🟡') return 'excused';
  if (v.includes('Có') || v.includes('Có mặt') || v === 'Có mặt' || v === 'Present' || v === '✅') return 'present';
  if (v.includes('Vắng') || v === 'Vắng' || v === 'Absent' || v === '❌') return 'absent';
  // fallback: check emoji
  if (v.includes('✅')) return 'present';
  if (v.includes('❌')) return 'absent';
  if (v.includes('🟡')) return 'excused';
  return 'empty';
}

function parseSlotDate(raw: string): string {
  if (!raw) return '';
  const parts = raw.split('/');
  if (parts.length === 3) {
    const [dayPart, monthPart, yearPart] = parts.map((part) => part.trim());
    const day = Number(dayPart);
    const month = Number(monthPart);
    const year = Number(yearPart);
    if (Number.isInteger(day) && Number.isInteger(month) && Number.isInteger(year)) {
      const normalized = new Date(year, month - 1, day);
      if (
        normalized.getFullYear() === year &&
        normalized.getMonth() === month - 1 &&
        normalized.getDate() === day
      ) {
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      }
    }
  }
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    const day = String(fallback.getDate()).padStart(2, '0');
    const month = String(fallback.getMonth() + 1).padStart(2, '0');
    const year = fallback.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return raw;
}

export async function parseAttendanceFile(file: File, classId: number, students: AttendanceStudentSource[]): Promise<AttendanceList> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

  if (!rows || rows.length < 2) {
    throw new Error('File không có dữ liệu điểm danh');
  }

  const headers = rows[0].map((h: any) => String(h ?? '').trim());
  // first column is student name, last two are total and percent (if present)
  let totalIndex = headers.findIndex((h) => /Tổng/i.test(h));
  if (totalIndex === -1) totalIndex = headers.length - 2;
  if (totalIndex < 1) totalIndex = 1;

  const slotHeaders = headers.slice(1, totalIndex);

  const slots: AttendanceSlot[] = slotHeaders.map((h, idx) => {
    const text = String(h ?? '');
    const m = text.match(/^\s*(.*?)\s*\((.*?)\)\s*$/);
    const label = m ? m[1].trim() : text || `Buổi ${idx + 1}`;
    const date = m ? parseSlotDate(m[2].trim()) : '';
    return { id: `import-${idx}-${Date.now()}`, label, date };
  });

  // Build a map from student name -> slot statuses from file
  const dataRows = rows.slice(1);
  const fileByName = new Map<string, SlotStatus[]>();
  for (const r of dataRows) {
    const name = String(r[0] ?? '').trim();
    if (!name) continue;
    const statuses: SlotStatus[] = slotHeaders.map((_, i) => parseStatusCell(r[1 + i]));
    fileByName.set(name, statuses);
  }

  // Build attendance rows mapped to provided `students` roster by name
  const attendanceRows = students.map((s) => {
    const found = fileByName.get(s.name);
    const slotsRecord: Record<string, SlotStatus> = {};
    slots.forEach((slot, idx) => {
      slotsRecord[slot.id] = found ? found[idx] ?? 'empty' : 'empty';
    });
    return {
      studentId: s.studentId,
      name: s.name,
      slots: slotsRecord,
    };
  });

  return {
    id: `${classId}-${Date.now()}`,
    classId: `${classId}`,
    slots,
    rows: attendanceRows,
  };
}
