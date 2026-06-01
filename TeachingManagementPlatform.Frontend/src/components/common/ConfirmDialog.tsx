import React from 'react';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title = 'Xác nhận', message, confirmLabel = 'Xoá', cancelLabel = 'Huỷ', onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div role="dialog" aria-label={title} style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h3>
        <div style={{ marginBottom: 16 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onCancel} className="btn btn-neutral">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="btn btn-delete">{confirmLabel}</button>
        </div>
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
  zIndex: 1100,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--edub-surface, #fff)',
  padding: 20,
  borderRadius: 12,
  minWidth: 320,
  boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
};
