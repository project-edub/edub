import { useCallback } from 'react';
import { Box } from '@mui/material';
import type { CrosswordGrid as CrosswordGridType } from '../../../types/crossword';
import type { PlacedWord } from '../../../utils/gridBuilder';
import type { Direction } from '../../../types/crossword';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelectedCell {
  row: number;
  col: number;
}

export interface CrosswordGridProps {
  /** 2D array of grid cells from gridBuilder result */
  grid: CrosswordGridType;
  /** List of placed words with positions and numbers */
  placedWords: PlacedWord[];
  /** Currently selected word ID (for highlighting) */
  selectedWordId: number | null;
  /** Currently selected cell (for cursor) */
  selectedCell: SelectedCell | null;
  /** Current direction for word selection */
  direction: Direction;
  /** Words data for determining which cells belong to selected word */
  words: Array<{
    id: number;
    word: string;
    direction: Direction;
    startRow: number;
    startCol: number;
  }>;
  /** Called when a cell is clicked */
  onCellSelect: (row: number, col: number) => void;
  /** Called when a word is selected (e.g., for scrolling CluePanel) */
  onWordSelect?: (wordId: number) => void;
}

// ── Cell colors ───────────────────────────────────────────────────────────────

const CELL_COLORS = {
  black: '#1a1a2e',
  normal: '#ffffff',
  highlighted: '#e3f2fd',
  cursor: '#bbdefb',
  hover: '#e8eaf6',
} as const;

// ── GridCell sub-component ────────────────────────────────────────────────────

interface GridCellProps {
  row: number;
  col: number;
  letter: string;
  isBlack: boolean;
  isHighlighted: boolean;
  isCursor: boolean;
  cellNumber?: number;
  onClick: (row: number, col: number) => void;
}

function GridCell({
  row,
  col,
  letter,
  isBlack,
  isHighlighted,
  isCursor,
  cellNumber,
  onClick,
}: GridCellProps) {
  if (isBlack) {
    return (
      <Box
        data-testid={`cell-${row}-${col}`}
        sx={{
          width: { xs: 28, sm: 34, md: 40 },
          height: { xs: 28, sm: 34, md: 40 },
          backgroundColor: CELL_COLORS.black,
        }}
      />
    );
  }

  const backgroundColor = isCursor
    ? CELL_COLORS.cursor
    : isHighlighted
      ? CELL_COLORS.highlighted
      : CELL_COLORS.normal;

  return (
    <Box
      data-testid={`cell-${row}-${col}`}
      onClick={() => onClick(row, col)}
      sx={{
        width: { xs: 28, sm: 34, md: 40 },
        height: { xs: 28, sm: 34, md: 40 },
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        fontSize: { xs: 12, sm: 14, md: 16 },
        fontWeight: 700,
        userSelect: 'none',
        transition: 'background-color 0.15s',
        '&:hover': { backgroundColor: CELL_COLORS.hover },
      }}
      role="gridcell"
      aria-label={`Ô ${row + 1}, ${col + 1}${cellNumber ? `, số ${cellNumber}` : ''}${letter ? `, chữ ${letter}` : ''}`}
    >
      {/* Cell number — top-left corner */}
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
          }}
        >
          {cellNumber}
        </Box>
      )}
      {/* Letter — center */}
      {letter}
    </Box>
  );
}

// ── CrosswordGrid component ───────────────────────────────────────────────────

export default function CrosswordGrid({
  grid,
  placedWords,
  selectedWordId,
  selectedCell,
  direction: _direction,
  words,
  onCellSelect,
}: CrosswordGridProps) {
  /**
   * Determines if a cell belongs to the currently selected word (for highlighting).
   */
  const isCellHighlighted = useCallback(
    (row: number, col: number): boolean => {
      if (selectedWordId == null) return false;

      const selectedWord = words.find((w) => w.id === selectedWordId);
      if (!selectedWord) return false;

      if (selectedWord.direction === 'across') {
        return (
          row === selectedWord.startRow &&
          col >= selectedWord.startCol &&
          col < selectedWord.startCol + selectedWord.word.length
        );
      } else {
        return (
          col === selectedWord.startCol &&
          row >= selectedWord.startRow &&
          row < selectedWord.startRow + selectedWord.word.length
        );
      }
    },
    [selectedWordId, words],
  );

  /**
   * Determines if a cell is the current cursor position.
   */
  const isCellCursor = useCallback(
    (row: number, col: number): boolean => {
      return selectedCell?.row === row && selectedCell?.col === col;
    },
    [selectedCell],
  );

  /**
   * Gets the cell number for a given position (if it's a word start).
   */
  const getCellNumber = useCallback(
    (row: number, col: number): number | undefined => {
      const placed = placedWords.find(
        (pw) => pw.startRow === row && pw.startCol === col,
      );
      return placed?.number;
    },
    [placedWords],
  );

  const colCount = grid[0]?.length ?? 0;

  if (colCount === 0) return null;

  return (
    <Box
      role="grid"
      aria-label="Lưới ô chữ"
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${colCount}, auto)`,
        gap: '1px',
        backgroundColor: CELL_COLORS.black,
        border: `2px solid ${CELL_COLORS.black}`,
        borderRadius: 1,
        width: 'fit-content',
        maxWidth: '100%',
        overflow: 'auto',
      }}
    >
      {grid.flatMap((row) =>
        row.map((cell) => (
          <GridCell
            key={`${cell.row}-${cell.col}`}
            row={cell.row}
            col={cell.col}
            letter={cell.letter}
            isBlack={cell.isBlack}
            isHighlighted={isCellHighlighted(cell.row, cell.col)}
            isCursor={isCellCursor(cell.row, cell.col)}
            cellNumber={getCellNumber(cell.row, cell.col)}
            onClick={onCellSelect}
          />
        )),
      )}
    </Box>
  );
}
