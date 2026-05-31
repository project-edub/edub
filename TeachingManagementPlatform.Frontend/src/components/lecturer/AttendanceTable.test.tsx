import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AttendanceTable from './AttendanceTable';
import type { AttendanceList } from '../../types/attendance';
import { cycleSlotStatus } from '../../utils/attendanceHelpers';

function Wrapper({ initialList }: { initialList: AttendanceList }) {
  const [list, setList] = useState(initialList);

  return (
    <AttendanceTable
      attendanceList={list}
      actionLoading={false}
      onAddSlot={vi.fn()}
      onUpdateSlotDate={vi.fn()}
      onRemoveSlot={vi.fn()}
      onImportExcel={vi.fn()}
      onExportExcel={vi.fn()}
      onToggleSlotStatus={(studentId, slotId) => {
        setList((current) => ({
          ...current,
          rows: current.rows.map((row) => {
            if (row.studentId !== studentId) return row;
            const currentStatus = row.slots[slotId] ?? 'empty';
            const nextStatus = cycleSlotStatus(currentStatus);
            return {
              ...row,
              slots: {
                ...row.slots,
                [slotId]: nextStatus,
              },
            };
          }),
        }));
      }}
    />
  );
}

describe('AttendanceTable', () => {
  it('cycles attendance state and updates summary cells', async () => {
    const user = userEvent.setup();
    const list: AttendanceList = {
      id: '1',
      classId: '10',
      slots: [{ id: 'slot-1', date: '2026-05-31', label: 'Buổi 1' }],
      rows: [{ studentId: 'student-1', name: 'Nguyễn Văn A', slots: { 'slot-1': 'empty' } }],
    };

    render(<Wrapper initialList={list} />);

    expect(screen.getByText('Chú thích:')).toBeInTheDocument();

    // no marked slots yet -> show 0 / 0 and dash for percent
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Điểm danh Nguyễn Văn A - Buổi 1' }));
    expect(screen.getByRole('button', { name: 'Điểm danh Nguyễn Văn A - Buổi 1' })).toHaveTextContent('✅');
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Điểm danh Nguyễn Văn A - Buổi 1' }));
    expect(screen.getByRole('button', { name: 'Điểm danh Nguyễn Văn A - Buổi 1' })).toHaveTextContent('❌');

    await user.click(screen.getByRole('button', { name: 'Điểm danh Nguyễn Văn A - Buổi 1' }));
    expect(screen.getByRole('button', { name: 'Điểm danh Nguyễn Văn A - Buổi 1' })).toHaveTextContent('🟡');

    await user.click(screen.getByRole('button', { name: 'Điểm danh Nguyễn Văn A - Buổi 1' }));
    expect(screen.getByRole('button', { name: 'Điểm danh Nguyễn Văn A - Buổi 1' })).toHaveTextContent('');
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});