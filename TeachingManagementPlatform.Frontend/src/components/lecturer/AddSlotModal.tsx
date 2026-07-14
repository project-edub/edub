import { useEffect, useState, type FormEvent } from 'react';
import type { AttendanceSlot } from '../../types/attendance';
import { hasDuplicateSlotDate, hasDuplicateSlotLabel } from '../../utils/attendanceHelpers';

interface Props {
  open: boolean;
  actionLoading: boolean;
  existingSlots: AttendanceSlot[];
  onClose: () => void;
  onConfirm: (data: { label: string; date: string }) => void;
}

export default function AddSlotModal({ open, actionLoading, existingSlots, onClose, onConfirm }: Props) {
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setLabel('');
      setDate('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !date) {
      setError('Vui lòng nhập tên slot và ngày');
      return;
    }

    if (hasDuplicateSlotLabel(existingSlots, label)) {
      setError('Tên slot đã tồn tại');
      return;
    }

    if (hasDuplicateSlotDate(existingSlots, date)) {
      setError('Ngày slot đã tồn tại');
      return;
    }

    onConfirm({ label: label.trim(), date });
  }

  return (
    <div style={overlayStyle}>
      <div role="dialog" aria-label="Thêm slot" style={modalStyle}>
        <h2 style={{ marginBottom: 16 }}>Thêm slot điểm danh</h2>

        {error && (
          <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="slot-label" style={labelStyle}>Tên slot</label>
            <input
              id="slot-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="VD: Buổi 1"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="slot-date" style={labelStyle}>Ngày</label>
            <input
              id="slot-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={actionLoading} className="btn btn-neutral">
              Hủy
            </button>
            <button type="submit" disabled={actionLoading} className="btn btn-update">
              {actionLoading ? 'Đang xử lý...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--edub-surface, #fff)',
  padding: 24,
  borderRadius: 12,
  width: 'min(360px, calc(100% - 24px))',
  boxSizing: 'border-box',
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
