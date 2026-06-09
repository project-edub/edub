import { forwardRef, useCallback } from 'react';
import { Box } from '@mui/material';
import type { CellState, GridCell } from '../../types/crossword';

// ── Cell state → background color ────────────────────────────────────────────

function getCellStateColor(state: CellState): string {
  switch (state) {
    case 'correct':
      return '#c8e6c9';
    case 'incorrect':
      return '#ffcdd2';
    case 'revealed':
      return '#fff9c4';
    case 'filled':
    case 'empty':
    default:
      return '#ffffff';
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PlayerCellProps {
  cell: GridCell;
  isHighlighted: boolean;
  isCursor: boolean;
  isPlaying: boolean;
  onSelect: (row: number, col: number) => void;
  onLetterInput: (row: number, col: number, letter: string) => void;
  onKeyDown: (row: number, col: number, key: string, event: React.KeyboardEvent) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const PlayerCell = forwardRef<HTMLInputElement, PlayerCellProps>(
  ({ cell, isHighlighted, isCursor, isPlaying, onSelect, onLetterInput, onKeyDown }, ref) => {
    const { row, col, letter, isBlack, cellNumber, state } = cell;

    // ── Black cell ──────────────────────────────────────────────────────────

    if (isBlack) {
      return (
        <Box
          data-testid={`cell-${row}-${col}`}
          aria-hidden="true"
          sx={{
            width: { xs: 28, sm: 34, md: 40 },
            height: { xs: 28, sm: 34, md: 40 },
            backgroundColor: '#1a1a2e',
          }}
        />
      );
    }

    // ── Background color ────────────────────────────────────────────────────

    const bgColor = isCursor
      ? '#bbdefb'
      : isHighlighted
        ? '#e3f2fd'
        : getCellStateColor(state);

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Only accept A-Z (case insensitive)
        const lastChar = val.slice(-1).toUpperCase();
        if (/^[A-Z]$/.test(lastChar)) {
          onLetterInput(row, col, lastChar);
        }
      },
      [row, col, onLetterInput],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        onKeyDown(row, col, e.key, e);
      },
      [row, col, onKeyDown],
    );

    const handleClick = useCallback(() => {
      onSelect(row, col);
    }, [row, col, onSelect]);

    // ── Aria label ──────────────────────────────────────────────────────────

    const ariaLabel = `Ô ${row + 1}, ${col + 1}${cellNumber ? `, số ${cellNumber}` : ''}${letter ? `, chữ ${letter}` : ''}`;

    // ── Render ──────────────────────────────────────────────────────────────

    return (
      <Box
        data-testid={`cell-${row}-${col}`}
        sx={{
          width: { xs: 28, sm: 34, md: 40 },
          height: { xs: 28, sm: 34, md: 40 },
          position: 'relative',
          backgroundColor: bgColor,
          transition: 'background-color 0.15s',
        }}
        role="gridcell"
      >
        {/* Cell number */}
        {cellNumber != null && (
          <Box
            component="span"
            sx={{
              position: 'absolute',
              top: 1,
              left: 2,
              fontSize: { xs: 7, sm: 8, md: 9 },
              fontWeight: 600,
              color: '#64748b',
              lineHeight: 1,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            {cellNumber}
          </Box>
        )}

        {/* Input */}
        <Box
          component="input"
          ref={ref}
          type="text"
          maxLength={1}
          value={letter}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onFocus={handleClick}
          readOnly={!isPlaying}
          aria-label={ariaLabel}
          autoComplete="off"
          sx={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            textAlign: 'center',
            fontSize: { xs: 12, sm: 14, md: 16 },
            fontWeight: 700,
            textTransform: 'uppercase',
            caretColor: 'transparent',
            cursor: isPlaying ? 'pointer' : 'default',
            padding: 0,
            '&:focus': {
              outline: '2px solid #1976d2',
              outlineOffset: '-2px',
            },
          }}
        />
      </Box>
    );
  },
);

PlayerCell.displayName = 'PlayerCell';

export default PlayerCell;
