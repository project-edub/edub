import { useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { Trash2, Plus } from 'lucide-react';
import type { ClassificationRange } from '../../utils/scoreCalculation';

// ── Preset colors for common classifications ──────────────────────────────────

export const PRESET_COLORS = [
  { label: 'Xanh lá (Giỏi)', color: '#4caf50' },
  { label: 'Xanh dương (Khá)', color: '#2196f3' },
  { label: 'Cam (Trung bình)', color: '#ff9800' },
  { label: 'Đỏ (Yếu)', color: '#f44336' },
  { label: 'Tím', color: '#9c27b0' },
  { label: 'Hồng', color: '#e91e63' },
  { label: 'Xanh ngọc', color: '#009688' },
  { label: 'Nâu', color: '#795548' },
] as const;

// ── Local editable range type (no id yet for new ranges) ──────────────────────

export interface EditableRange {
  id: number | null;
  minScore: string;
  maxScore: string;
  label: string;
  color: string;
}

// ── Validation helpers ────────────────────────────────────────────────────────

export interface RangeValidationError {
  index: number;
  field: 'minScore' | 'maxScore' | 'label' | 'color' | 'overlap';
  message: string;
}

/**
 * Validates that ranges do not overlap and have correct field values.
 * Returns an array of errors (empty = valid).
 */
export function validateRanges(ranges: EditableRange[]): RangeValidationError[] {
  const errors: RangeValidationError[] = [];

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];

    // Label required
    if (!r.label.trim()) {
      errors.push({ index: i, field: 'label', message: 'Nhãn không được để trống' });
    }

    // Color required
    if (!r.color.trim()) {
      errors.push({ index: i, field: 'color', message: 'Màu không được để trống' });
    }

    // Min score validation
    const min = parseFloat(r.minScore);
    if (r.minScore.trim() === '' || isNaN(min)) {
      errors.push({ index: i, field: 'minScore', message: 'Điểm min không hợp lệ' });
      continue;
    }
    if (min < 0 || min > 10) {
      errors.push({ index: i, field: 'minScore', message: 'Điểm min phải từ 0 đến 10' });
    }

    // Max score validation
    const max = parseFloat(r.maxScore);
    if (r.maxScore.trim() === '' || isNaN(max)) {
      errors.push({ index: i, field: 'maxScore', message: 'Điểm max không hợp lệ' });
      continue;
    }
    if (max < 0 || max > 10) {
      errors.push({ index: i, field: 'maxScore', message: 'Điểm max phải từ 0 đến 10' });
    }

    // Min must be <= Max
    if (!isNaN(min) && !isNaN(max) && min > max) {
      errors.push({ index: i, field: 'minScore', message: 'Điểm min phải ≤ điểm max' });
    }
  }

  // Check for overlaps between ranges
  const parsedRanges = ranges
    .map((r, idx) => ({
      idx,
      min: parseFloat(r.minScore),
      max: parseFloat(r.maxScore),
    }))
    .filter((r) => !isNaN(r.min) && !isNaN(r.max) && r.min <= r.max);

  for (let i = 0; i < parsedRanges.length; i++) {
    for (let j = i + 1; j < parsedRanges.length; j++) {
      const a = parsedRanges[i];
      const b = parsedRanges[j];
      // Two ranges overlap if a.min <= b.max && b.min <= a.max
      if (a.min <= b.max && b.min <= a.max) {
        errors.push({
          index: b.idx,
          field: 'overlap',
          message: `Khoảng ${b.idx + 1} chồng lấn với khoảng ${a.idx + 1}`,
        });
      }
    }
  }

  return errors;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ClassificationConfigPanelProps {
  /** Column ID of the average column being configured */
  columnId: number;
  /** Existing ranges from the server */
  initialRanges: ClassificationRange[];
  /** Called when user clicks "Lưu" with validated range data */
  onSave: (ranges: Omit<ClassificationRange, 'id' | 'columnId'>[]) => void;
  /** Called when user clicks "Hủy" */
  onCancel: () => void;
  /** Whether a save operation is in progress */
  saving?: boolean;
  /** Error message from the parent (e.g. API error) */
  error?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClassificationConfigPanel(props: ClassificationConfigPanelProps) {
  const {
    initialRanges,
    onSave,
    onCancel,
    saving = false,
    error: externalError = null,
  } = props;
  // Convert server ranges to editable local state
  const [ranges, setRanges] = useState<EditableRange[]>(() =>
    initialRanges.length > 0
      ? initialRanges
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((r) => ({
            id: r.id,
            minScore: String(r.minScore),
            maxScore: String(r.maxScore),
            label: r.label,
            color: r.color,
          }))
      : [createEmptyRange()],
  );

  const [validationErrors, setValidationErrors] = useState<RangeValidationError[]>([]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFieldChange = useCallback(
    (index: number, field: keyof EditableRange, value: string) => {
      setRanges((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
      // Clear validation errors on edit
      setValidationErrors([]);
    },
    [],
  );

  const handleAddRange = useCallback(() => {
    setRanges((prev) => [...prev, createEmptyRange()]);
    setValidationErrors([]);
  }, []);

  const handleRemoveRange = useCallback((index: number) => {
    setRanges((prev) => {
      if (prev.length <= 1) return prev; // Keep at least 1 range
      return prev.filter((_, i) => i !== index);
    });
    setValidationErrors([]);
  }, []);

  const handleColorSelect = useCallback((index: number, color: string) => {
    setRanges((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], color };
      return updated;
    });
    setValidationErrors([]);
  }, []);

  const handleSave = useCallback(() => {
    const errors = validateRanges(ranges);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const payload = ranges.map((r, idx) => ({
      minScore: parseFloat(r.minScore),
      maxScore: parseFloat(r.maxScore),
      label: r.label.trim(),
      color: r.color.trim(),
      sortOrder: idx,
    }));

    onSave(payload);
  }, [ranges, onSave]);

  // ── Error lookup helpers ──────────────────────────────────────────────────

  const getFieldError = useMemo(() => {
    const errorMap = new Map<string, string>();
    for (const err of validationErrors) {
      const key = `${err.index}-${err.field}`;
      if (!errorMap.has(key)) {
        errorMap.set(key, err.message);
      }
    }
    return (index: number, field: string) => errorMap.get(`${index}-${field}`) ?? null;
  }, [validationErrors]);

  const overlapErrors = useMemo(
    () => validationErrors.filter((e) => e.field === 'overlap'),
    [validationErrors],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 2, minWidth: 360, maxWidth: 500 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        Cấu hình xếp loại
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Định nghĩa các khoảng điểm xếp loại cho cột ĐTB. Mỗi giá trị điểm chỉ thuộc tối đa một khoảng.
      </Typography>

      {/* Overlap errors summary */}
      {overlapErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2, py: 0.5, fontSize: 12 }}>
          {overlapErrors.map((e) => e.message).join('. ')}
        </Alert>
      )}

      {/* External error (API error) */}
      {externalError && (
        <Alert severity="error" sx={{ mb: 2, py: 0.5, fontSize: 12 }}>
          {externalError}
        </Alert>
      )}

      {/* Range list */}
      <Stack spacing={2} sx={{ mb: 2 }}>
        {ranges.map((range, index) => (
          <Box
            key={index}
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: getFieldError(index, 'overlap') ? 'error.main' : 'divider',
              borderRadius: 1,
              position: 'relative',
            }}
          >
            {/* Range header with delete button */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                Khoảng {index + 1}
              </Typography>
              <Tooltip title="Xóa khoảng">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveRange(index)}
                    disabled={ranges.length <= 1 || saving}
                    aria-label={`Xóa khoảng ${index + 1}`}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            {/* Min/Max score row */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Điểm min"
                size="small"
                type="number"
                value={range.minScore}
                onChange={(e) => handleFieldChange(index, 'minScore', e.target.value)}
                error={!!getFieldError(index, 'minScore')}
                helperText={getFieldError(index, 'minScore')}
                disabled={saving}
                sx={{ flex: 1 }}
                slotProps={{
                  htmlInput: {
                    min: 0,
                    max: 10,
                    step: 0.01,
                    'aria-label': `Điểm min khoảng ${index + 1}`,
                  },
                }}
              />
              <TextField
                label="Điểm max"
                size="small"
                type="number"
                value={range.maxScore}
                onChange={(e) => handleFieldChange(index, 'maxScore', e.target.value)}
                error={!!getFieldError(index, 'maxScore')}
                helperText={getFieldError(index, 'maxScore')}
                disabled={saving}
                sx={{ flex: 1 }}
                slotProps={{
                  htmlInput: {
                    min: 0,
                    max: 10,
                    step: 0.01,
                    'aria-label': `Điểm max khoảng ${index + 1}`,
                  },
                }}
              />
            </Box>

            {/* Label input */}
            <TextField
              label="Nhãn xếp loại"
              size="small"
              fullWidth
              value={range.label}
              onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
              error={!!getFieldError(index, 'label')}
              helperText={getFieldError(index, 'label') ?? 'Ví dụ: Giỏi, Khá, TB, Yếu'}
              placeholder="Giỏi"
              disabled={saving}
              sx={{ mb: 1 }}
              slotProps={{
                htmlInput: {
                  'aria-label': `Nhãn xếp loại khoảng ${index + 1}`,
                },
              }}
            />

            {/* Color selection */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Màu sắc:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                {PRESET_COLORS.map((preset) => (
                  <Tooltip key={preset.color} title={preset.label}>
                    <Box
                      onClick={() => !saving && handleColorSelect(index, preset.color)}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: preset.color,
                        cursor: saving ? 'default' : 'pointer',
                        border: range.color === preset.color ? '2px solid #000' : '2px solid transparent',
                        transition: 'border-color 0.2s',
                        '&:hover': saving
                          ? {}
                          : { borderColor: 'rgba(0,0,0,0.4)' },
                      }}
                      role="button"
                      aria-label={`Chọn màu ${preset.label} cho khoảng ${index + 1}`}
                      aria-pressed={range.color === preset.color}
                      tabIndex={saving ? -1 : 0}
                      onKeyDown={(e) => {
                        if (!saving && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handleColorSelect(index, preset.color);
                        }
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              {/* Custom color input */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  value={range.color}
                  onChange={(e) => handleFieldChange(index, 'color', e.target.value)}
                  placeholder="#4caf50"
                  error={!!getFieldError(index, 'color')}
                  helperText={getFieldError(index, 'color')}
                  disabled={saving}
                  sx={{ flex: 1 }}
                  slotProps={{
                    htmlInput: {
                      'aria-label': `Mã màu tùy chỉnh khoảng ${index + 1}`,
                    },
                  }}
                />
                {range.color && (
                  <Chip
                    size="small"
                    label={range.label || '—'}
                    sx={{
                      backgroundColor: range.color,
                      color: '#fff',
                      fontWeight: 500,
                      textShadow: '0 0 2px rgba(0,0,0,0.3)',
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </Stack>

      {/* Add range button */}
      <Button
        size="small"
        startIcon={<Plus size={18} />}
        onClick={handleAddRange}
        disabled={saving}
        sx={{ mb: 2 }}
      >
        Thêm khoảng
      </Button>

      <Divider sx={{ mb: 2 }} />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button size="small" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </Box>
    </Box>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function createEmptyRange(): EditableRange {
  return {
    id: null,
    minScore: '',
    maxScore: '',
    label: '',
    color: '',
  };
}
