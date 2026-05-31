import { useEffect, useState, type FormEvent } from 'react';
import type { AttendanceSlot } from '../../types/attendance';
import { hasDuplicateSlotDate } from '../../utils/attendanceHelpers';

interface Props {
  open: boolean;
  slot: AttendanceSlot | null;
  existingSlots: AttendanceSlot[];
  actionLoading: boolean;
  onClose: () => void;
  onSaveDate: (slotId: string, date: string) => void;
  onDelete: (slotId: string) => void;
}

export default function SlotHeaderPopover({
  open,
  slot,
  existingSlots,
  actionLoading,
  onClose,
  onSaveDate,
  onDelete,
}: Props) {
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const currentSlot = slot;

  useEffect(() => {
    if (!open || !currentSlot) return;
    setDate(currentSlot.date ? toIsoDate(currentSlot.date) : '');
    setError('');
  }, [open, currentSlot]);

  if (!open || !currentSlot) return null;

  const safeSlot = currentSlot;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date) {
      setError('Vui lòng chọn ngày');
      return;
    }

    if (hasDuplicateSlotDate(existingSlots, date, safeSlot.id)) {
      setError('Ngày slot đã tồn tại');
      return;
    }

    onSaveDate(safeSlot.id, date);
  }

  function handleDelete() {
    const confirmed = window.confirm(`Xoá slot ${safeSlot.label} ngày ${safeSlot.date}? Dữ liệu điểm danh của slot này sẽ bị mất.`);
    if (confirmed) {
      onDelete(safeSlot.id);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div role="dialog" aria-label={`Sửa slot ${safeSlot.label}`} style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Slot: {safeSlot.label}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="slot-header-date" style={labelStyle}>Sửa ngày</label>
            <input
              id="slot-header-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={handleDelete} disabled={actionLoading} className="btn btn-delete">
              Xoá slot
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} disabled={actionLoading} className="btn btn-neutral">
                Hủy
              </button>
              <button type="submit" disabled={actionLoading} className="btn btn-update">
                {actionLoading ? 'Đang xử lý...' : 'Lưu ngày'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function toIsoDate(dateStr: string): string {
  const parts = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (parts) {
    return `${parts[3]}-${parts[2]}-${parts[1]}`;
  }
  return dateStr;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--edub-surface, #fff)',
  padding: 20,
  borderRadius: 12,
  minWidth: 320,
  boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 8,
};
