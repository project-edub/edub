interface AlertModalProps {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export default function AlertModal({ open, title = 'Thông báo', message, onClose }: AlertModalProps) {
  if (!open) return null;
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>{title}</h3>
        <p style={{ margin: '0 0 20px', color: '#374151' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={btnStyle}>Đóng</button>
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
  maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};
const btnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  backgroundColor: '#1976d2', color: '#fff', cursor: 'pointer', fontWeight: 600,
};
