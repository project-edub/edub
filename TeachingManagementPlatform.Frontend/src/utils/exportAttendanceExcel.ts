import * as XLSX from 'xlsx';
import type { AttendanceList, SlotStatus } from '../types/attendance';
import { buildAttendanceFilename, formatAttendanceSlotDate, getAttendancePercent, getPresentCount } from './attendanceHelpers';

function mapStatusToText(status: SlotStatus): string {
  if (status === 'present') return 'Có mặt';
  if (status === 'absent') return 'Vắng';
  if (status === 'excused') return 'Vắng CP';
  return '';
}

export function exportAttendanceExcel(list: AttendanceList, className: string): void {
  const workbook = buildAttendanceWorkbook(list);

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildAttendanceFilename(className);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function buildAttendanceWorkbook(list: AttendanceList): XLSX.WorkBook {
  const headers = [
    'Tên học sinh',
    ...list.slots.map((slot) => `${slot.label} (${formatAttendanceSlotDate(slot.date)})`),
    'Tổng có mặt',
    '% Đi học',
  ];

  const rows = list.rows.map((row) => ([
    row.name,
    ...list.slots.map((slot) => mapStatusToText(row.slots[slot.id] ?? 'empty')),
    getPresentCount(row),
    // export empty string when percent is not available
    getAttendancePercent(row) === null ? '' : `${getAttendancePercent(row)}%`,
  ]));

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Điểm danh');
  return workbook;
}