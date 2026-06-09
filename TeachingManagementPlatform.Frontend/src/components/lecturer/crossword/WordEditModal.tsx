import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import type { CrosswordWordDetailDto } from '../../../types/crossword';
import * as crosswordService from '../../../services/crosswordService';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface WordEditModalProps {
  open: boolean;
  word: CrosswordWordDetailDto | null;
  gameId: number;
  onClose: () => void;
  /** Called after a successful save with the updated word data */
  onSave: (updatedWord: CrosswordWordDetailDto) => void;
}

// ── Validation helpers ────────────────────────────────────────────────────────

const ANSWER_PATTERN = /^[A-Z_]{3,20}$/;

function validateAnswer(value: string): string | null {
  if (value.length < 3) return 'Đáp án phải có ít nhất 3 ký tự.';
  if (value.length > 20) return 'Đáp án không được vượt quá 20 ký tự.';
  if (!ANSWER_PATTERN.test(value)) return 'Đáp án chỉ chứa ký tự A-Z và dấu gạch dưới (_).';
  return null;
}

function validateClue(value: string): string | null {
  if (value.trim().length === 0) return 'Câu gợi ý không được để trống.';
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WordEditModal({
  open,
  word,
  gameId,
  onClose,
  onSave,
}: WordEditModalProps) {
  const [answer, setAnswer] = useState('');
  const [clue, setClue] = useState('');
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [clueError, setClueError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Reset form when word changes or modal opens
  useEffect(() => {
    if (word && open) {
      setAnswer(word.word);
      setClue(word.clue);
      setAnswerError(null);
      setClueError(null);
      setApiError(null);
      setSaving(false);
    }
  }, [word, open]);

  const originalAnswer = word?.word ?? '';
  const answerChanged = answer !== originalAnswer;

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z_]/g, '');
    setAnswer(value);
    setAnswerError(null);
  };

  const handleClueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClue(e.target.value);
    setClueError(null);
  };

  const handleSave = async () => {
    // Validate
    const aErr = validateAnswer(answer);
    const cErr = validateClue(clue);
    if (aErr) setAnswerError(aErr);
    if (cErr) setClueError(cErr);
    if (aErr || cErr) return;

    if (!word) return;

    setSaving(true);
    setApiError(null);

    try {
      await crosswordService.updateWord(gameId, word.id, {
        word: answer,
        clue: clue.trim(),
      });

      // Build updated word data for the parent
      const updatedWord: CrosswordWordDetailDto = {
        ...word,
        word: answer,
        clue: clue.trim(),
      };

      onSave(updatedWord);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Không thể lưu thay đổi. Vui lòng thử lại.';
      setApiError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Chỉnh sửa từ</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Answer field */}
          <TextField
            label="Đáp án"
            value={answer}
            onChange={handleAnswerChange}
            error={!!answerError}
            helperText={answerError ?? 'Chỉ chấp nhận A-Z và _ (3–20 ký tự)'}
            slotProps={{ htmlInput: { maxLength: 20 } }}
            disabled={saving}
            fullWidth
          />

          {/* Warning when answer is changed */}
          {answerChanged && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Thay đổi đáp án sẽ tính toán lại lưới
            </Alert>
          )}

          {/* Clue field */}
          <TextField
            label="Câu gợi ý"
            value={clue}
            onChange={handleClueChange}
            error={!!clueError}
            helperText={clueError}
            multiline
            minRows={2}
            disabled={saving}
            fullWidth
          />

          {/* Source context (readonly) */}
          {word?.sourceContext && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Nguồn ngữ cảnh
              </Typography>
              <TextField
                value={word.sourceContext}
                multiline
                minRows={2}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
                sx={{
                  '& .MuiInputBase-root': {
                    backgroundColor: 'action.hover',
                  },
                }}
              />
            </Box>
          )}

          {/* API error */}
          {apiError && (
            <Alert severity="error" onClose={() => setApiError(null)}>
              {apiError}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Huỷ
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
