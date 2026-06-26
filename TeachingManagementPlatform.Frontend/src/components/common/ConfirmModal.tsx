interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title = 'Xác nhận', message, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>{title}</h3>
        <p style={{ margin: '0 0 20px', color: '#374151' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onCancel} style={cancelBtnStyle}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} style={confirmBtnStyle}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 10000,
};
const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24,
  maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db',
  backgroundColor: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600,
};
const confirmBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600,
};
