import { useState } from 'react';
import type { StudentListColumn } from '../../types/studentList';
import type { AttendanceSlot } from '../../types/attendance';
import { createAttendanceSlot } from '../../utils/attendanceHelpers';

interface Props {
  columns: StudentListColumn[];
  onGenerate: (slots: AttendanceSlot[], selectedColumnNames: string[]) => void;
  actionLoading: boolean;
}

const WEEKDAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];

function getWeekdayIndex(date: Date): number {
  // JS: 0=Sunday, 1=Monday, ...6=Saturday
  return date.getDay();
}

function formatDateLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AttendanceConfigForm({ columns, onGenerate, actionLoading }: Props) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri default
  const [selectedColumnNames, setSelectedColumnNames] = useState<string[]>(() =>
    columns.length > 0 ? [columns[0].name] : []
  );

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function toggleColumn(name: string) {
    setSelectedColumnNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  function handleGenerate() {
    if (!startDate || !endDate || selectedDays.length === 0) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return;

    const slots: AttendanceSlot[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = getWeekdayIndex(current);
      if (selectedDays.includes(dayOfWeek)) {
        const label = formatDateLabel(current);
        const dateStr = formatDateISO(current);
        slots.push(createAttendanceSlot(label, dateStr));
      }
      current.setDate(current.getDate() + 1);
    }

    if (slots.length === 0) return;
    onGenerate(slots, selectedColumnNames);
  }

  const isValid = startDate && endDate && selectedDays.length > 0 && new Date(startDate) <= new Date(endDate);

  return (
    <div style={{ border: '1px solid var(--edub-border)', borderRadius: 8, padding: 20, maxWidth: 600 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem' }}>Cấu hình điểm danh</h3>

      {/* Date range */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--edub-text-secondary)' }}>Từ ngày</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: 6, borderRadius: 4, border: '1px solid var(--edub-input-border)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--edub-text-secondary)' }}>Đến ngày</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: 6, borderRadius: 4, border: '1px solid var(--edub-input-border)' }}
          />
        </div>
      </div>

      {/* Weekday selection */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 8, color: 'var(--edub-text-secondary)' }}>Các ngày có buổi dạy</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {WEEKDAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid var(--edub-border)',
                background: selectedDays.includes(day.value) ? '#1565c0' : 'var(--edub-surface)',
                color: selectedDays.includes(day.value) ? '#fff' : 'var(--edub-text-primary)',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: selectedDays.includes(day.value) ? 600 : 400,
              }}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column selection */}
      {columns.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8, color: 'var(--edub-text-secondary)' }}>Cột hiển thị cùng (từ danh sách học sinh)</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {columns.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleColumn(col.name)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid var(--edub-border)',
                  background: selectedColumnNames.includes(col.name) ? '#e3f2fd' : 'var(--edub-surface)',
                  color: selectedColumnNames.includes(col.name) ? '#1565c0' : 'var(--edub-text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: selectedColumnNames.includes(col.name) ? 600 : 400,
                }}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!isValid || actionLoading}
        className="btn btn-view"
        style={{ padding: '10px 20px' }}
      >
        {actionLoading ? 'Đang tạo...' : 'Tạo điểm danh'}
      </button>

      {startDate && endDate && new Date(startDate) > new Date(endDate) && (
        <p style={{ color: '#d32f2f', fontSize: 13, marginTop: 8 }}>Ngày bắt đầu phải trước ngày kết thúc.</p>
      )}
    </div>
  );
}
