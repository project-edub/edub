import { useState } from 'react';
import type { AttendanceList, AttendanceSlot, SlotStatus } from '../../types/attendance';
import { ABSENCE_WARNING_THRESHOLD } from '../../constants/attendanceConfig';
import { formatAttendanceSlotDate, getAttendancePercent, getPresentCount } from '../../utils/attendanceHelpers';
import SlotHeaderPopover from './SlotHeaderPopover';

interface Props {
  attendanceList: AttendanceList;
  actionLoading: boolean;
  onToggleSlotStatus: (studentId: string, slotId: string) => void;
  onAddSlot: () => void;
  onUpdateSlotDate: (slotId: string, date: string) => void;
  onRemoveSlot: (slotId: string) => void;
}

export default function AttendanceTable({
  attendanceList,
  actionLoading,
  onToggleSlotStatus,
  onAddSlot,
  onUpdateSlotDate,
  onRemoveSlot,
}: Props) {
  const totalSlots = attendanceList.slots.length;
  const [activeSlot, setActiveSlot] = useState<AttendanceSlot | null>(null);
  const warningCount = attendanceList.rows.reduce((count, row) => {
    const attendancePercent = getAttendancePercent(row);
    if (attendancePercent === null) return count;
    return attendancePercent < (100 - ABSENCE_WARNING_THRESHOLD) ? count + 1 : count;
  }, 0);

  return (
    <div>
      <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--edub-text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span>Chú thích:</span>
        <span>✅ Có mặt</span>
        <span>❌ Vắng</span>
        <span>🟡 Vắng có phép</span>
        <span>Trống</span>
      </div>

      {warningCount > 0 && (
        <div
          style={{
            marginBottom: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            borderRadius: 999,
            background: '#fff8e1',
            color: '#8a5a00',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid #ffe0a3',
          }}
        >
          <span>⚠️</span>
          <span>{warningCount} học sinh có nguy cơ vắng quá phép</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onAddSlot}
          disabled={actionLoading}
          className="btn btn-add"
        >
          + Thêm Slot
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--edub-border)', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 360 }}>
          <thead>
            <tr>
              <th style={{ ...stickyCornerStyle, left: 0, minWidth: 240 }}>Tên học sinh</th>
              {attendanceList.slots.map((slot) => (
                <th
                  key={slot.id}
                  style={{
                    ...stickyHeaderStyle,
                    minWidth: 40,
                    maxWidth: 48,
                    padding: '4px 2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSlot(slot)}
                    title="Bấm để sửa hoặc xoá slot"
                    style={slotHeaderButtonStyle}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, lineHeight: 1.05 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 11,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        textAlign: 'center',
                        maxWidth: 42,
                      }}
                      title={slot.label}
                    >
                      {slot.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--edub-text-secondary)',
                        textAlign: 'center',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        maxWidth: 42,
                      }}
                      title={formatAttendanceSlotDate(slot.date)}
                    >
                      {formatAttendanceSlotDate(slot.date)}
                    </div>
                    </div>
                  </button>
                </th>
              ))}
              <th style={{ ...stickyHeaderStyle, minWidth: 140 }}>Tổng có mặt / Đã điểm</th>
              <th style={{ ...stickyHeaderStyle, minWidth: 120 }}>% Đi học</th>
            </tr>
          </thead>
          <tbody>
            {attendanceList.rows.length === 0 ? (
              <tr>
                <td colSpan={totalSlots + 3} style={emptyCellStyle}>
                  Chưa có học sinh nào trong danh sách để điểm danh.
                </td>
              </tr>
            ) : totalSlots === 0 ? (
              <tr>
                <td colSpan={3} style={emptyCellStyle}>
                  Chưa có slot nào. Nhấn + Thêm Slot để bắt đầu điểm danh.
                </td>
              </tr>
            ) : (
              attendanceList.rows.map((row) => {
                const presentCount = getPresentCount(row);
                const markedSlots = Object.values(row.slots).filter((status) => status !== 'empty').length;
                const attendancePercent = getAttendancePercent(row);
                const isWarning = attendancePercent !== null && attendancePercent < (100 - ABSENCE_WARNING_THRESHOLD);

                return (
                  <tr key={row.studentId}>
                    <td style={{ ...stickyBodyStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {row.name}
                        {isWarning && <span title="Cảnh báo vắng cao">⚠️</span>}
                      </span>
                    </td>
                    {attendanceList.slots.map((slot) => {
                      const status = row.slots[slot.id] ?? 'empty';
                      return (
                        <td key={slot.id} style={cellStyle}>
                          <button
                            type="button"
                            onClick={() => onToggleSlotStatus(row.studentId, slot.id)}
                            disabled={actionLoading}
                            style={slotButtonStyle(status)}
                            aria-label={`Điểm danh ${row.name} - ${slot.label}`}
                          >
                            {status === 'present' ? '✅' : status === 'absent' ? '❌' : status === 'excused' ? '🟡' : ''}
                          </button>
                        </td>
                      );
                    })}
                    <td style={summaryCellStyle}>{presentCount} / {markedSlots}</td>
                    <td style={summaryCellStyle}>{attendancePercent === null ? '—' : `${attendancePercent}%`}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <SlotHeaderPopover
        open={Boolean(activeSlot)}
        slot={activeSlot}
        existingSlots={attendanceList.slots}
        actionLoading={actionLoading}
        onClose={() => setActiveSlot(null)}
        onSaveDate={(slotId, date) => {
          onUpdateSlotDate(slotId, date);
          setActiveSlot(null);
        }}
        onDelete={(slotId) => {
          onRemoveSlot(slotId);
          setActiveSlot(null);
        }}
      />
    </div>
  );
}

const baseBorder = '1px solid var(--edub-border)';

const stickyHeaderStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 3,
  minWidth: 140,
  background: 'var(--edub-surface, #fff)',
  borderBottom: '2px solid var(--edub-border)',
  padding: '12px 10px',
  textAlign: 'left',
  verticalAlign: 'bottom',
  whiteSpace: 'nowrap',
};

const slotHeaderButtonStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  color: 'inherit',
};

const stickyCornerStyle: React.CSSProperties = {
  ...stickyHeaderStyle,
  position: 'sticky',
  left: 0,
  zIndex: 5,
};

const stickyBodyStyle: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  background: 'var(--edub-surface, #fff)',
  padding: '10px',
  borderBottom: baseBorder,
  borderRight: baseBorder,
  whiteSpace: 'nowrap',
  fontWeight: 600,
};

const cellStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: baseBorder,
  borderRight: baseBorder,
  textAlign: 'center',
  background: 'var(--edub-surface, #fff)',
};

const summaryCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 700,
  background: '#f8fbff',
  whiteSpace: 'nowrap',
};

const emptyCellStyle: React.CSSProperties = {
  padding: 24,
  textAlign: 'center',
  color: 'var(--edub-text-secondary)',
};

function slotButtonStyle(status: SlotStatus): React.CSSProperties {
  return {
    width: '100%',
    minHeight: 36,
    border: '1px solid transparent',
    borderRadius: 8,
    padding: '6px 8px',
    cursor: 'pointer',
    backgroundColor: status === 'present' ? '#e8f5e9' : status === 'absent' ? '#ffebee' : status === 'excused' ? '#fff8e1' : '#f5f7fa',
    color: status === 'present' ? '#2e7d32' : status === 'absent' ? '#c62828' : status === 'excused' ? '#b26a00' : 'var(--edub-text-secondary)',
    fontWeight: 600,
  };
}
