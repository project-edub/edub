import { Pencil, Trash2, Download, Share2, Link, Check, X, Save, Plus, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  edit: Pencil,
  delete: Trash2,
  download: Download,
  share: Share2,
  link: Link,
  check: Check,
  close: X,
  save: Save,
  add: Plus,
  view: Eye,
};

interface CrudIconProps {
  name: string;
  tooltip?: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: number;
}

export default function CrudIcon({ name, tooltip, onClick, disabled, size = 20 }: CrudIconProps) {
  const IconComp = ICON_MAP[name];
  if (!IconComp) return null;

  return (
    <span
      role="button"
      aria-label={tooltip}
      title={tooltip}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 4,
      }}
    >
      <IconComp size={size} strokeWidth={2} />
    </span>
  );
}
