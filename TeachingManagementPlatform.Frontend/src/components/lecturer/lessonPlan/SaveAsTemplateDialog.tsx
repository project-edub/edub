import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Alert from '@mui/material/Alert';
import type { SaveAsTemplateRequest } from '../../../types/curriculumTemplate';
import * as curriculumTemplateService from '../../../services/adminCurriculumTemplateService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SaveAsTemplateDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed/cancelled */
  onClose: () => void;
  /** Lesson plan ID to save as template */
  lessonPlanId: number;
  /** Callback after successful save */
  onSaved: () => void;
}

const BOOK_SET_OPTIONS = [
  'Kết nối tri thức',
  'Chân trời sáng tạo',
  'Cánh diều',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SaveAsTemplateDialog({
  open,
  onClose,
  lessonPlanId,
  onSaved,
}: SaveAsTemplateDialogProps) {
  const [isPublic, setIsPublic] = useState(true);
  const [bookSet, setBookSet] = useState('');
  const [sourceNote, setSourceNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIsPublic(true);
      setBookSet('');
      setSourceNote('');
      setError(null);
    }
  }, [open]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const request: SaveAsTemplateRequest = {
        isPublic,
        ...(bookSet ? { bookSet } : {}),
        ...(sourceNote.trim() ? { sourceNote: sourceNote.trim() } : {}),
      };
      await curriculumTemplateService.saveAsTemplate(lessonPlanId, request);
      onSaved();
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể lưu làm mẫu. Vui lòng thử lại.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [isPublic, bookSet, sourceNote, lessonPlanId, onSaved, onClose]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="save-as-template-dialog-title"
    >
      <DialogTitle id="save-as-template-dialog-title">
        Lưu giáo án làm mẫu
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={saving}
            />
          }
          label="Công khai mẫu giáo án (giáo viên khác có thể sử dụng)"
          sx={{ mb: 2, display: 'block' }}
        />

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="book-set-label">Bộ sách (tuỳ chọn)</InputLabel>
          <Select
            labelId="book-set-label"
            value={bookSet}
            label="Bộ sách (tuỳ chọn)"
            onChange={(e) => setBookSet(e.target.value)}
            disabled={saving}
          >
            <MenuItem value="">
              <em>Không chọn</em>
            </MenuItem>
            {BOOK_SET_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Ghi chú nguồn"
          placeholder="Ví dụ: PPCT Bộ GD&ĐT 2024, Sở GD&ĐT TP.HCM..."
          value={sourceNote}
          onChange={(e) => setSourceNote(e.target.value)}
          fullWidth
          size="small"
          multiline
          minRows={2}
          maxRows={4}
          disabled={saving}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Đang lưu...' : 'Lưu làm mẫu'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
