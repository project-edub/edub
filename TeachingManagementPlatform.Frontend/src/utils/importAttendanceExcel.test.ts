import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { parseAttendanceFile } from './importAttendanceExcel';
import type { AttendanceStudentSource } from '../types/attendance';

function createAttendanceFile(): File {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Tên học sinh', 'Buổi 1 (31/05/2026)', 'Buổi 2 (01/06/2026)', 'Tổng có mặt', '% Đi học'],
    ['Nguyễn Văn A', 'Có mặt', 'Vắng CP', 2, '100%'],
    ['Trần Thị B', '❌', '', 0, '0%'],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Điểm danh');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new File([buffer], 'diem-danh.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('importAttendanceExcel', () => {
  it('parses exported attendance workbook into attendance list', async () => {
    const students: AttendanceStudentSource[] = [
      { studentId: '1', name: 'Nguyễn Văn A' },
      { studentId: '2', name: 'Trần Thị B' },
    ];

    const list = await parseAttendanceFile(createAttendanceFile(), 10, students);

    expect(list.classId).toBe('10');
    expect(list.slots).toHaveLength(2);
    expect(list.slots[0]).toMatchObject({ label: 'Buổi 1', date: '31/05/2026' });
    expect(list.slots[1]).toMatchObject({ label: 'Buổi 2', date: '01/06/2026' });
    expect(list.rows[0].slots[list.slots[0].id]).toBe('present');
    expect(list.rows[0].slots[list.slots[1].id]).toBe('excused');
    expect(list.rows[1].slots[list.slots[0].id]).toBe('absent');
    expect(list.rows[1].slots[list.slots[1].id]).toBe('empty');
  });
});
