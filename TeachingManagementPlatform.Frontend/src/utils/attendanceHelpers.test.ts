import { describe, expect, it } from 'vitest';
import type { SlotStatus, StudentAttendance } from '../types/attendance';
import { buildAttendanceFilename, cycleSlotStatus, getAttendancePercent, getPresentCount, hasDuplicateSlotDate, hasDuplicateSlotLabel } from './attendanceHelpers';

describe('attendanceHelpers', () => {
  it('counts present slots and calculates attendance percent', () => {
    const row: StudentAttendance = {
      studentId: '1',
      name: 'Nguyễn Văn A',
      slots: {
        s1: 'present' as SlotStatus,
        s2: 'absent' as SlotStatus,
        s3: 'excused' as SlotStatus,
        s4: 'empty' as SlotStatus,
      },
    };

    expect(getPresentCount(row)).toBe(2);
    expect(getAttendancePercent(row)).toBe(67);
  });

  it('returns null percent when no slots are marked', () => {
    expect(getAttendancePercent({ studentId: '1', name: 'Nguyễn Văn A', slots: { s1: 'empty' } })).toBeNull();
  });

  it('cycles slot status in the expected order', () => {
    expect(cycleSlotStatus('empty')).toBe('present');
    expect(cycleSlotStatus('present')).toBe('absent');
    expect(cycleSlotStatus('absent')).toBe('excused');
    expect(cycleSlotStatus('excused')).toBe('empty');
  });

  it('builds a safe export filename', () => {
    expect(buildAttendanceFilename('Lớp 10A1')).toMatch(/^diem-danh-Lớp-10A1-\d{4}-\d{2}-\d{2}\.xlsx$/u);
  });

  it('detects duplicate slot label and date', () => {
    const slots = [
      { id: 's1', label: 'Buổi 1', date: '31/05/2026' },
      { id: 's2', label: 'Buổi 2', date: '01/06/2026' },
    ];

    expect(hasDuplicateSlotLabel(slots, 'Buổi 1')).toBe(true);
    expect(hasDuplicateSlotLabel(slots, 'Buổi 3')).toBe(false);
    expect(hasDuplicateSlotDate(slots, '31/05/2026')).toBe(true);
    expect(hasDuplicateSlotDate(slots, '02/06/2026')).toBe(false);
  });
});