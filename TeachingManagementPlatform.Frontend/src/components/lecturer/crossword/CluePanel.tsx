import { useEffect, useRef } from 'react';
import { Box, Button, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { CrosswordWordDetailDto } from '../../../types/crossword';
import type { PlacedWord } from '../../../utils/gridBuilder';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CluePanelProps {
  /** All words in the game (with clue, direction, etc.) */
  words: CrosswordWordDetailDto[];
  /** Placed words from the grid result (with number, direction, id) */
  placedWords: PlacedWord[];
  /** Currently selected word ID (highlighted + auto-scrolled) */
  selectedWordId: number | null;
  /** Called when a clue item is clicked */
  onWordSelect: (wordId: number) => void;
  /** Called when the edit button is clicked — parent opens WordEditModal */
  onEditWord: (wordId: number) => void;
  /** Called when the delete button is clicked — parent handles grid rebuild */
  onDeleteWord: (wordId: number) => void;
  /** Called when "+ Thêm từ thủ công" button is clicked */
  onAddWord: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CluePanel({
  words,
  placedWords,
  selectedWordId,
  onWordSelect,
  onEditWord,
  onDeleteWord,
  onAddWord,
}: CluePanelProps) {
  const activeRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the active item into view when selectedWordId changes
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedWordId]);

  const acrossWords = placedWords
    .filter((pw) => pw.direction === 'across')
    .sort((a, b) => a.number - b.number);

  const downWords = placedWords
    .filter((pw) => pw.direction === 'down')
    .sort((a, b) => a.number - b.number);

  const renderClueItem = (pw: PlacedWord) => {
    const wordDetail = words.find((w) => w.id === pw.id);
    if (!wordDetail) return null;

    const isActive = selectedWordId === pw.id;

    return (
      <Box
        key={pw.id}
        ref={isActive ? activeRef : undefined}
        onClick={() => pw.id != null && onWordSelect(pw.id)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          mb: 0.5,
          borderRadius: 1,
          cursor: 'pointer',
          backgroundColor: isActive ? 'primary.light' : 'transparent',
          color: isActive ? 'primary.contrastText' : 'text.primary',
          '&:hover': {
            backgroundColor: isActive ? 'primary.light' : 'action.hover',
          },
          transition: 'background-color 0.2s',
        }}
      >
        {/* Clue text */}
        <Typography variant="body2" sx={{ flex: 1, mr: 1 }}>
          <strong>{pw.number}.</strong> {wordDetail.clue}
        </Typography>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Chỉnh sửa">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (pw.id != null) onEditWord(pw.id);
              }}
              aria-label={`Chỉnh sửa từ ${pw.number}`}
              sx={{
                color: isActive ? 'primary.contrastText' : 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <Pencil size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xoá">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (pw.id != null) onDeleteWord(pw.id);
              }}
              aria-label={`Xoá từ ${pw.number}`}
              sx={{
                color: isActive ? 'primary.contrastText' : 'text.secondary',
                '&:hover': { color: 'error.main' },
              }}
            >
              <Trash2 size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Across clues */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        NGANG
      </Typography>
      {acrossWords.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1, mb: 1 }}>
          Chưa có từ ngang nào.
        </Typography>
      )}
      {acrossWords.map(renderClueItem)}

      <Divider sx={{ my: 2 }} />

      {/* Down clues */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        DỌC
      </Typography>
      {downWords.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1, mb: 1 }}>
          Chưa có từ dọc nào.
        </Typography>
      )}
      {downWords.map(renderClueItem)}

      <Divider sx={{ my: 2 }} />

      {/* Add word button */}
      <Button
        variant="outlined"
        startIcon={<Plus size={18} />}
        onClick={onAddWord}
        fullWidth
        sx={{ textTransform: 'none' }}
      >
        + Thêm từ thủ công
      </Button>
    </Box>
  );
}
