import Tooltip from '@mui/material/Tooltip';
import type { TooltipProps } from '@mui/material/Tooltip';
import { HelpCircle } from 'lucide-react';

interface InlineHintProps {
  text: string;
  placement?: TooltipProps['placement'];
}

export default function InlineHint({ text, placement = 'right' }: InlineHintProps) {
  return (
    <Tooltip title={text} placement={placement} enterTouchDelay={0} arrow>
      <span
        role="img"
        aria-label={text}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          marginLeft: 6,
          cursor: 'help',
        }}
      >
        <HelpCircle size={18} style={{ color: 'inherit' }} />
      </span>
    </Tooltip>
  );
}
