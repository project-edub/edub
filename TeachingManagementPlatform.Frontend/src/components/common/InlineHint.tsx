import Tooltip from '@mui/material/Tooltip';
import type { TooltipProps } from '@mui/material/Tooltip';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';

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
        <HelpOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
      </span>
    </Tooltip>
  );
}
