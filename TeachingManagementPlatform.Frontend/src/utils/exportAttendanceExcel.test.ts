import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { buildAttendanceWorkbook } from './exportAttendanceExcel';
import { parseAttendanceFile } from './importAttendanceExcel';
import type { AttendanceList, AttendanceStudentSource } from '../types/attendance';

describe('exportAttendanceExcel round trip', () => {
  it('keeps slot dates readable after export and re-upload', async () => {
    const list: AttendanceList = {
      id: '1',
      classId: '10',
      slots: [
        { id: 'slot-1', label: 'Buổi 1', date: '31/05/2026' },
        { id: 'slot-2', label: 'Buổi 2', date: '01/06/2026' },
      ],
      rows: [
        {
          studentId: 'student-1',
          name: 'Nguyễn Văn A',
          slots: {
            'slot-1': 'present',
            'slot-2': 'excused',
          },
        },
      ],
    };

    const students: AttendanceStudentSource[] = [{ studentId: 'student-1', name: 'Nguyễn Văn A' }];
    const workbook = buildAttendanceWorkbook(list);
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new File([buffer], 'diem-danh.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const parsed = await parseAttendanceFile(file, 10, students);

    expect(parsed.slots[0]).toMatchObject({ label: 'Buổi 1', date: '31/05/2026' });
    expect(parsed.slots[1]).toMatchObject({ label: 'Buổi 2', date: '01/06/2026' });
    expect(parsed.rows[0].slots[parsed.slots[0].id]).toBe('present');
    expect(parsed.rows[0].slots[parsed.slots[1].id]).toBe('excused');
  });
});
