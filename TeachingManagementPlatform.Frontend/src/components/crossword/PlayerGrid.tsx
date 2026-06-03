import { useCallback, useRef, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import PlayerCell from './PlayerCell';
import type {
  CrosswordGrid,
  CrosswordPlayerWordDto,
  Direction,
} from '../../types/crossword';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PlayerGridProps {
  grid: CrosswordGrid;
  words: CrosswordPlayerWordDto[];
  selectedCell: { row: number; col: number } | null;
  selectedWordId: number | null;
  direction: Direction;
  gameStatus: string;
  onCellSelect: (row: number, col: number) => void;
  onLetterInput: (row: number, col: number, letter: string) => void;
  onDirectionChange: (direction: Direction) => void;
  onSelectedWordChange: (wordId: number | null) => void;
  onSelectedCellChange: (cell: { row: number; col: number } | null) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlayerGrid({
  grid,
  words,
  selectedCell,
  selectedWordId,
  direction,
  gameStatus,
  onCellSelect,
  onLetterInput,
  onDirectionChange,
  onSelectedWordChange,
  onSelectedCellChange,
}: PlayerGridProps) {
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const colCount = grid[0]?.length ?? 0;
  const rowCount = grid.length;
  const isPlaying = gameStatus === 'playing';

  // ── Current clue text for ARIA live region ────────────────────────────────

  const currentClue = useMemo(() => {
    if (!selectedWordId) return '';
    const word = words.find((w) => w.id === selectedWordId);
    if (!word) return '';
    return `${word.number} ${word.direction === 'across' ? 'Ngang' : 'Dọc'}: ${word.clue}`;
  }, [selectedWordId, words]);

  // ── Highlighting helpers ──────────────────────────────────────────────────

  const isCellHighlighted = useCallback(
    (row: number, col: number): boolean => {
      if (selectedWordId == null) return false;
      const word = words.find((w) => w.id === selectedWordId);
      if (!word) return false;

      if (word.direction === 'across') {
        return (
          row === word.startRow &&
          col >= word.startCol &&
          col < word.startCol + word.wordLength
        );
      } else {
        return (
          col === word.startCol &&
          row >= word.startRow &&
          row < word.startRow + word.wordLength
        );
      }
    },
    [selectedWordId, words],
  );

  const isCellCursor = useCallback(
    (row: number, col: number): boolean => {
      return selectedCell?.row === row && selectedCell?.col === col;
    },
    [selectedCell],
  );

  // ── Focus a cell ──────────────────────────────────────────────────────────

  const focusCell = useCallback((row: number, col: number) => {
    const key = `${row}-${col}`;
    const input = cellRefs.current.get(key);
    if (input) {
      input.focus();
    }
  }, []);

  // ── Find next cell in direction ───────────────────────────────────────────

  const findNextCell = useCallback(
    (row: number, col: number, dir: Direction, forward: boolean): { row: number; col: number } | null => {
      const step = forward ? 1 : -1;
      let r = row;
      let c = col;

      if (dir === 'across') {
        c += step;
      } else {
        r += step;
      }

      // Stay in bounds and skip black cells
      while (r >= 0 && r < rowCount && c >= 0 && c < colCount) {
        if (!grid[r][c].isBlack) {
          return { row: r, col: c };
        }
        if (dir === 'across') {
          c += step;
        } else {
          r += step;
        }
      }

      return null;
    },
    [grid, rowCount, colCount],
  );

  // ── Find next word ────────────────────────────────────────────────────────

  const findNextWord = useCallback(
    (currentWordId: number | null, forward: boolean): CrosswordPlayerWordDto | null => {
      if (words.length === 0) return null;

      // Sort words by number
      const sorted = [...words].sort((a, b) => {
        if (a.direction !== b.direction) {
          return a.direction === 'across' ? -1 : 1;
        }
        return a.number - b.number;
      });

      if (!currentWordId) return sorted[0];

      const currentIdx = sorted.findIndex((w) => w.id === currentWordId);
      if (currentIdx === -1) return sorted[0];

      const nextIdx = forward
        ? (currentIdx + 1) % sorted.length
        : (currentIdx - 1 + sorted.length) % sorted.length;

      return sorted[nextIdx];
    },
    [words],
  );

  // ── Handle letter input from cell ─────────────────────────────────────────

  const handleLetterInput = useCallback(
    (row: number, col: number, letter: string) => {
      if (!isPlaying) return;

      onLetterInput(row, col, letter);

      // Auto-advance to next cell
      const next = findNextCell(row, col, direction, true);
      if (next) {
        onSelectedCellChange(next);
        focusCell(next.row, next.col);
      }
    },
    [isPlaying, onLetterInput, findNextCell, direction, onSelectedCellChange, focusCell],
  );

  // ── Handle key down ───────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (row: number, col: number, key: string, event: React.KeyboardEvent) => {
      if (!isPlaying) return;

      switch (key) {
        case 'Backspace': {
          event.preventDefault();
          const currentLetter = grid[row]?.[col]?.letter;

          if (currentLetter) {
            // Clear current cell
            onLetterInput(row, col, '');
          } else {
            // Move back and clear
            const prev = findNextCell(row, col, direction, false);
            if (prev) {
              onLetterInput(prev.row, prev.col, '');
              onSelectedCellChange(prev);
              focusCell(prev.row, prev.col);
            }
          }
          break;
        }

        case 'ArrowLeft': {
          event.preventDefault();
          const left = findNextCell(row, col, 'across', false);
          if (left) {
            onCellSelect(left.row, left.col);
            focusCell(left.row, left.col);
          }
          break;
        }

        case 'ArrowRight': {
          event.preventDefault();
          const right = findNextCell(row, col, 'across', true);
          if (right) {
            onCellSelect(right.row, right.col);
            focusCell(right.row, right.col);
          }
          break;
        }

        case 'ArrowUp': {
          event.preventDefault();
          const up = findNextCell(row, col, 'down', false);
          if (up) {
            onCellSelect(up.row, up.col);
            focusCell(up.row, up.col);
          }
          break;
        }

        case 'ArrowDown': {
          event.preventDefault();
          const down = findNextCell(row, col, 'down', true);
          if (down) {
            onCellSelect(down.row, down.col);
            focusCell(down.row, down.col);
          }
          break;
        }

        case 'Tab':
        case 'Enter': {
          event.preventDefault();
          const forward = !event.shiftKey;
          const nextWord = findNextWord(selectedWordId, forward);
          if (nextWord) {
            onSelectedWordChange(nextWord.id);
            onDirectionChange(nextWord.direction);
            onSelectedCellChange({ row: nextWord.startRow, col: nextWord.startCol });
            focusCell(nextWord.startRow, nextWord.startCol);
          }
          break;
        }

        default:
          break;
      }
    },
    [
      isPlaying,
      grid,
      direction,
      selectedWordId,
      findNextCell,
      findNextWord,
      onLetterInput,
      onCellSelect,
      onSelectedCellChange,
      onSelectedWordChange,
      onDirectionChange,
      focusCell,
    ],
  );

  // ── Ref callback ──────────────────────────────────────────────────────────

  const setCellRef = useCallback(
    (row: number, col: number) => (el: HTMLInputElement | null) => {
      const key = `${row}-${col}`;
      if (el) {
        cellRefs.current.set(key, el);
      } else {
        cellRefs.current.delete(key);
      }
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (colCount === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
        Không có dữ liệu lưới.
      </Typography>
    );
  }

  return (
    <Box>
      {/* ARIA live region for clue announcements */}
      <Box
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {currentClue}
      </Box>

      {/* Grid */}
      <Box
        role="grid"
        aria-label="Lưới ô chữ"
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${colCount}, auto)`,
          gap: '1px',
          backgroundColor: '#1a1a2e',
          border: '2px solid #1a1a2e',
          borderRadius: 1,
          width: 'fit-content',
          maxWidth: '100%',
          overflow: 'auto',
        }}
      >
        {grid.flatMap((row) =>
          row.map((cell) => (
            <PlayerCell
              key={`${cell.row}-${cell.col}`}
              ref={setCellRef(cell.row, cell.col)}
              cell={cell}
              isHighlighted={isCellHighlighted(cell.row, cell.col)}
              isCursor={isCellCursor(cell.row, cell.col)}
              isPlaying={isPlaying}
              onSelect={onCellSelect}
              onLetterInput={handleLetterInput}
              onKeyDown={handleKeyDown}
            />
          )),
        )}
      </Box>
    </Box>
  );
}
