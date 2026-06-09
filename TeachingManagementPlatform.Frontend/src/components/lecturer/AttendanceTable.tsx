
import { useCallback, useMemo, useRef, useState } from 'react';
import type { AttendanceList, AttendanceSlot, SlotStatus } from '../../types/attendance';
import { ABSENCE_WARNING_THRESHOLD as DEFAULT_ABSENCE_WARNING_THRESHOLD } from '../../constants/attendanceConfig';
import { formatAttendanceSlotDate, getAttendancePercent } from '../../utils/attendanceHelpers';
import SlotHeaderPopover from './SlotHeaderPopover';

interface Props {
  attendanceList: AttendanceList;
  actionLoading: boolean;
  onToggleSlotStatus: (studentId: string, slotId: string) => void;
  onAddSlot: () => void;
  onUpdateSlotDate: (slotId: string, date: string) => void;
  onRemoveSlot: (slotId: string) => void;
  /** Absence threshold percentage (default: ABSENCE_WARNING_THRESHOLD constant) */
  absenceThreshold?: number;
}

export default function AttendanceTable({
  attendanceList,
  actionLoading,
  onToggleSlotStatus,
  onAddSlot,
  onUpdateSlotDate,
  onRemoveSlot,
  absenceThreshold,
}: Props) {
  const ABSENCE_WARNING_THRESHOLD = absenceThreshold ?? DEFAULT_ABSENCE_WARNING_THRESHOLD;
  const totalSlots = attendanceList.slots.length;
  const [activeSlot, setActiveSlot] = useState<AttendanceSlot | null>(null);
  const [navigateDate, setNavigateDate] = useState('');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Paging state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const warningCount = attendanceList.rows.reduce((count, row) => {
    const attendancePercent = getAttendancePercent(row);
    if (attendancePercent === null) return count;
    return attendancePercent < (100 - ABSENCE_WARNING_THRESHOLD) ? count + 1 : count;
  }, 0);

  // Today's date for column highlighting
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Paging logic
  const totalPages = Math.max(1, Math.ceil(attendanceList.rows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return attendanceList.rows.slice(start, start + pageSize);
  }, [attendanceList.rows, currentPage, pageSize]);

  // Navigate to date
  const handleNavigateToDate = useCallback(() => {
    if (!navigateDate || !tableContainerRef.current) return;
    const slotIndex = attendanceList.slots.findIndex((s) => s.date === navigateDate);
    if (slotIndex === -1) return;
    // Scroll horizontally: each slot header is ~48px, name column is ~240px
    const offset = 240 + slotIndex * 48;
    tableContainerRef.current.scrollLeft = Math.max(0, offset - 100);
  }, [navigateDate, attendanceList.slots]);

  return (
    <div>
      {/* Stats & legend boxes */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={statBoxStyle}>
          <span style={statBoxIcon}>📅</span>
          <span style={statBoxValue}>{totalSlots}</span>
          <span style={statBoxLabel}>buổi</span>
        </div>
        <div style={statBoxStyle}>
          <span style={statBoxIcon}>👥</span>
          <span style={statBoxValue}>{attendanceList.rows.length}</span>
          <span style={statBoxLabel}>học sinh</span>
        </div>
        {warningCount > 0 && (
          <div style={{ ...statBoxStyle, background: '#fff8e1', borderColor: '#ffe0a3' }}>
            <span style={statBoxIcon}>⚠️</span>
            <span style={{ ...statBoxValue, color: '#8a5a00' }}>{warningCount}</span>
            <span style={{ ...statBoxLabel, color: '#8a5a00' }}>vắng quá phép</span>
          </div>
        )}
        <div style={legendBoxStyle}>
          <span style={legendItem}>✅ Có mặt</span>
          <span style={legendItem}>❌ Vắng</span>
          <span style={legendItem}>🟡 Có phép</span>
          <span style={legendItem}>⬜ Trống</span>
        </div>
      </div>

      {/* Toolbar: Add slot + Navigate to date */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onAddSlot}
          disabled={actionLoading}
          className="btn btn-add"
        >
          + Thêm Slot
        </button>

        <div style={dateNavStyle}>
          <label htmlFor="nav-date-input" style={{ fontSize: 12, color: 'var(--edub-text-secondary)', whiteSpace: 'nowrap' }}>Tìm ngày:</label>
          <input
            id="nav-date-input"
            type="date"
            value={navigateDate}
            onChange={(e) => setNavigateDate(e.target.value)}
            style={dateInputStyle}
          />
          <button
            type="button"
            onClick={handleNavigateToDate}
            disabled={!navigateDate}
            className="btn btn-view"
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            Đi tới
          </button>
        </div>
      </div>

      {/* Scrollable table with fixed height */}
      <div
        ref={tableContainerRef}
        style={{
          overflow: 'auto',
          maxHeight: '60vh',
          border: '1px solid var(--edub-border)',
          borderRadius: 8,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 360 }}>
          <thead>
            <tr>
              <th style={{ ...stickyCornerStyle, left: 0, minWidth: 200 }}>Tên học sinh</th>
              {attendanceList.slots.map((slot) => {
                const isToday = slot.date === todayStr;
                return (
                  <th
                    key={slot.id}
                    style={{
                      ...stickyHeaderStyle,
                      minWidth: 44,
                      maxWidth: 52,
                      padding: '4px 2px',
                      background: isToday ? '#e3f2fd' : 'var(--edub-surface, #fff)',
                      borderBottom: isToday ? '3px solid #1976d2' : '2px solid var(--edub-border)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveSlot(slot)}
                      title="Bấm để sửa hoặc xoá slot"
                      style={slotHeaderButtonStyle}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, lineHeight: 1.05 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, textAlign: 'center', maxWidth: 46 }} title={slot.label}>
                          {slot.label}
                        </div>
                        <div style={{ fontSize: 10, color: isToday ? '#1565c0' : 'var(--edub-text-secondary)', textAlign: 'center', maxWidth: 46 }} title={formatAttendanceSlotDate(slot.date)}>
                          {formatAttendanceSlotDate(slot.date)}
                        </div>
                        {isToday && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1976d2' }} />}
                      </div>
                    </button>
                  </th>
                );
              })}
              <th style={{ ...stickyHeaderStyle, minWidth: 70 }}>✅</th>
              <th style={{ ...stickyHeaderStyle, minWidth: 70 }}>❌</th>
              <th style={{ ...stickyHeaderStyle, minWidth: 70 }}>🟡</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 && attendanceList.rows.length === 0 ? (
              <tr>
                <td colSpan={totalSlots + 4} style={emptyCellStyle}>
                  Chưa có học sinh nào trong danh sách để điểm danh.
                </td>
              </tr>
            ) : totalSlots === 0 ? (
              <tr>
                <td colSpan={4} style={emptyCellStyle}>
                  Chưa có slot nào. Nhấn + Thêm Slot để bắt đầu điểm danh.
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => {
                const statuses = Object.values(row.slots);
                const presentCount = statuses.filter((s) => s === 'present').length;
                const absentCount = statuses.filter((s) => s === 'absent').length;
                const excusedCount = statuses.filter((s) => s === 'excused').length;
                const markedSlots = statuses.filter((s) => s !== 'empty').length;
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
                      const isToday = slot.date === todayStr;
                      return (
                        <td key={slot.id} style={{ ...cellStyle, background: isToday ? '#f0f7ff' : 'var(--edub-surface, #fff)' }}>
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
                    <td style={summaryCellStyle}>{presentCount}/{markedSlots}</td>
                    <td style={summaryCellStyle}>{absentCount}/{markedSlots}</td>
                    <td style={summaryCellStyle}>{excusedCount}/{markedSlots}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paging controls */}
      {attendanceList.rows.length > pageSize && (
        <div style={pagingContainerStyle}>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            style={pagingBtnStyle}
          >
            ‹ Trước
          </button>
          <span style={{ fontSize: 13 }}>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            style={pagingBtnStyle}
          >
            Sau ›
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
            <label htmlFor="page-size-input" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Hiện:</label>
            <input
              id="page-size-input"
              type="number"
              min={10}
              max={50}
              value={pageSize}
              onChange={(e) => {
                const v = Math.max(10, Math.min(50, Number(e.target.value) || 10));
                setPageSize(v);
                setCurrentPage(1);
              }}
              style={{ width: 48, padding: '2px 4px', fontSize: 12, textAlign: 'center', borderRadius: 4, border: '1px solid var(--edub-border)' }}
            />
            <span style={{ fontSize: 12 }}>/trang</span>
          </div>
        </div>
      )}

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

// ── Styles ──────────────────────────────────────────────────────────────────

const baseBorder = '1px solid var(--edub-border)';

const statBoxStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  fontSize: 13,
};

const statBoxIcon: React.CSSProperties = { fontSize: 16 };
const statBoxValue: React.CSSProperties = { fontWeight: 700, fontSize: 15 };
const statBoxLabel: React.CSSProperties = { color: 'var(--edub-text-secondary)', fontSize: 12 };

const legendBoxStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px',
  borderRadius: 10,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  fontSize: 12,
  color: 'var(--edub-text-secondary)',
};

const legendItem: React.CSSProperties = { whiteSpace: 'nowrap' };

const dateNavStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 8,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const dateInputStyle: React.CSSProperties = {
  padding: '3px 6px',
  borderRadius: 4,
  border: '1px solid var(--edub-border)',
  fontSize: 12,
};

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
  padding: '6px 4px',
  borderBottom: baseBorder,
  borderRight: baseBorder,
  textAlign: 'center',
  background: 'var(--edub-surface, #fff)',
};

const summaryCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 700,
  background: '#fff6dc',
  whiteSpace: 'nowrap',
};

const emptyCellStyle: React.CSSProperties = {
  padding: 24,
  textAlign: 'center',
  color: 'var(--edub-text-secondary)',
};

const pagingContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  marginTop: 12,
  padding: '8px 12px',
  borderRadius: 8,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const pagingBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid var(--edub-border)',
  background: '#fff',
  cursor: 'pointer',
};

function slotButtonStyle(status: SlotStatus): React.CSSProperties {
  return {
    width: '100%',
    minHeight: 32,
    border: '1px solid transparent',
    borderRadius: 6,
    padding: '4px 6px',
    cursor: 'pointer',
    backgroundColor: status === 'present' ? '#fff3bf' : status === 'absent' ? '#ffe4d6' : status === 'excused' ? '#fff1cc' : '#f5f7fa',
    color: status === 'present' ? '#8f6600' : status === 'absent' ? '#b3261e' : status === 'excused' ? '#a66b00' : 'var(--edub-text-secondary)',
    fontWeight: 600,
    fontSize: 14,
  };
}
