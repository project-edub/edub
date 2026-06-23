import { useEffect } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onClose, duration = 2000 }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose, duration]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '12px 24px',
        borderRadius: 8,
        backgroundColor: '#2e7d32',
        color: '#fff',
        fontWeight: 600,
        fontSize: 14,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        animation: 'toast-slide-in 0.3s ease',
      }}
    >
      {message}
    </div>
  );
}
