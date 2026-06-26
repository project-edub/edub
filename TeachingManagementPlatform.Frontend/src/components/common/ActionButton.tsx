import CrudIcon from './CrudIcon';

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  color?: 'primary' | 'error' | 'success' | 'default';
}

const COLOR_MAP = {
  primary: { border: '#1976d2', text: '#1976d2' },
  error: { border: '#dc2626', text: '#dc2626' },
  success: { border: '#2e7d32', text: '#2e7d32' },
  default: { border: '#6b7280', text: '#374151' },
};

export default function ActionButton({ icon, label, onClick, disabled, color = 'default' }: ActionButtonProps) {
  const colors = COLOR_MAP[color];
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 16,
        border: `1px solid ${disabled ? '#d1d5db' : colors.border}`,
        background: 'transparent',
        color: disabled ? '#9ca3af' : colors.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 150ms',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget.style.backgroundColor = colors.border + '10'); }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <CrudIcon name={icon} size={14} />
      {label}
    </button>
  );
}
