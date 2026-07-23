import { useState, useEffect, useCallback, useMemo } from 'react';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { SlidersHorizontal } from 'lucide-react';
import type { StudentListColumn } from '../../types/studentList';
import type { ScoreColumnConfig } from '../../utils/scoreCalculation';
import { updateScoreColumnMetadata } from '../../services/scoreMetadataService';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ScoreColumnConfigMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  column: StudentListColumn | null;
  allColumns: StudentListColumn[];
  columnConfigs: Map<number, ScoreColumnConfig>;
  /** Called after config is persisted via PUT API – parent should refetch metadata & recalculate */
  onConfigSaved: () => void;
  /** Called when user wants to open classification ranges configuration for an average column */
  onOpenClassificationConfig?: (columnId: number) => void;
  /** Called when user wants to delete this column */
  onDeleteColumn?: (columnId: number) => void;
  /** Called when user renames this column */
  onRenameColumn?: (columnId: number, newName: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScoreColumnConfigMenu({
  anchorEl,
  open,
  onClose,
  column,
  allColumns,
  columnConfigs,
  onConfigSaved,
  onOpenClassificationConfig,
  onDeleteColumn,
  onRenameColumn,
}: ScoreColumnConfigMenuProps) {
  // Local form state
  const [columnName, setColumnName] = useState('');
  const [coefficient, setCoefficient] = useState<string>('');
  const [isAverageColumn, setIsAverageColumn] = useState(false);
  const [sourceColumnIds, setSourceColumnIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local state when popover opens or column changes
  useEffect(() => {
    if (!open || !column) return;
    const config = columnConfigs.get(column.id);
    setColumnName(column.name);
    setCoefficient(config?.coefficient != null ? String(config.coefficient) : '');
    setIsAverageColumn(config?.isAverageColumn ?? false);
    setSourceColumnIds(config?.sourceColumnIds ?? []);
    setError(null);
  }, [open, column, columnConfigs]);

  // Available source columns: exclude the current column and other average columns
  const availableSourceColumns = useMemo(() => {
    if (!column) return [];
    return allColumns.filter((col) => {
      if (col.id === column.id) return false;
      const colConfig = columnConfigs.get(col.id);
      if (colConfig?.isAverageColumn) return false;
      return true;
    });
  }, [allColumns, column, columnConfigs]);

  // Warning: source columns that have no coefficient configured (Requirement 2.4)
  const missingCoefficientWarnings = useMemo(() => {
    if (!isAverageColumn || sourceColumnIds.length === 0) return [];
    return sourceColumnIds
      .map((id) => {
        const config = columnConfigs.get(id);
        if (!config || config.coefficient === null) {
          const col = allColumns.find((c) => c.id === id);
          return col?.name ?? `Cột #${id}`;
        }
        return null;
      })
      .filter((name): name is string => name !== null);
  }, [isAverageColumn, sourceColumnIds, columnConfigs, allColumns]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCoefficientChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty or positive integers only
    if (val === '' || /^[1-9]\d*$/.test(val)) {
      setCoefficient(val);
    }
  }, []);

  const handleToggleAverage = useCallback((_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setIsAverageColumn(checked);
    if (!checked) {
      setSourceColumnIds([]);
    }
  }, []);

  const handleToggleSource = useCallback((colId: number) => {
    setSourceColumnIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!column) return;
    setError(null);
    setSaving(true);

    try {
      // Rename column if name changed
      if (onRenameColumn && columnName.trim() && columnName.trim() !== column.name) {
        await onRenameColumn(column.id, columnName.trim());
      }

      await updateScoreColumnMetadata(column.id, {
        coefficient: coefficient !== '' ? parseInt(coefficient, 10) : null,
        isAverageColumn,
        sourceColumnIds: isAverageColumn ? sourceColumnIds : [],
      });
      // Persist succeeded → notify parent to refetch metadata & recalculate averages
      onConfigSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? 'Lỗi khi lưu cấu hình';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [column, columnName, coefficient, isAverageColumn, sourceColumnIds, onConfigSaved, onClose, onRenameColumn]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!column) return null;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <Box sx={{ p: 2, minWidth: 280, maxWidth: 360 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Cấu hình cột
        </Typography>

        {/* Column name input */}
        {onRenameColumn && (
          <TextField
            label="Tên cột"
            size="small"
            fullWidth
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            sx={{ mb: 2 }}
            slotProps={{
              htmlInput: { 'aria-label': 'Tên cột' },
            }}
          />
        )}

        {/* Coefficient input (Requirement 2.1) */}
        {!isAverageColumn && (
          <TextField
            label="Hệ số"
            size="small"
            fullWidth
            value={coefficient}
            onChange={handleCoefficientChange}
            placeholder="1, 2, 3..."
            helperText="Số nguyên dương (để trống nếu không áp dụng)"
            sx={{ mb: 2 }}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                'aria-label': `Hệ số cột ${column.name}`,
              },
            }}
          />
        )}

        {/* Toggle "Đặt làm cột ĐTB" (Requirement 2.2) */}
        <FormControlLabel
          control={
            <Switch
              checked={isAverageColumn}
              onChange={handleToggleAverage}
              size="small"
            />
          }
          label="Đặt làm cột ĐTB"
          sx={{ mb: 1, display: 'flex' }}
        />

        {/* Source columns multi-select (visible when isAverage = true) */}
        {isAverageColumn && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Chọn cột nguồn tính trung bình:
            </Typography>
            <Box
              sx={{
                maxHeight: 180,
                overflow: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 0.5,
              }}
              role="group"
              aria-label="Các cột nguồn tham gia tính trung bình"
            >
              {availableSourceColumns.map((col) => {
                const colConfig = columnConfigs.get(col.id);
                const hasCoefficient = colConfig?.coefficient != null;
                return (
                  <FormControlLabel
                    key={col.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={sourceColumnIds.includes(col.id)}
                        onChange={() => handleToggleSource(col.id)}
                      />
                    }
                    label={
                      <span>
                        {col.name}
                        {hasCoefficient && (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 0.5 }}
                          >
                            (HS: {colConfig!.coefficient})
                          </Typography>
                        )}
                      </span>
                    }
                    sx={{ display: 'block', ml: 0 }}
                  />
                );
              })}
              {availableSourceColumns.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                  Không có cột nguồn khả dụng.
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Warning: source columns missing coefficient (Requirement 2.4) */}
        {missingCoefficientWarnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2, py: 0, fontSize: 12 }}>
            Cột nguồn chưa có hệ số: <strong>{missingCoefficientWarnings.join(', ')}</strong>.
            Các cột này sẽ bị bỏ qua khi tính trung bình.
          </Alert>
        )}

        {/* Classification config shortcut for average columns (Requirement 6.1) */}
        {isAverageColumn && onOpenClassificationConfig && column && (
          <>
            <Divider sx={{ mb: 1.5 }} />
            <Button
              size="small"
              fullWidth
              startIcon={<SlidersHorizontal size={18} />}
              onClick={() => {
                onOpenClassificationConfig(column.id);
                onClose();
              }}
              sx={{ mb: 1.5, justifyContent: 'flex-start', textTransform: 'none' }}
            >
              Cấu hình xếp loại
            </Button>
          </>
        )}

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, py: 0, fontSize: 12 }}>
            {error}
          </Alert>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          {onDeleteColumn && column && (
            <Button
              size="small"
              color="error"
              onClick={() => { onDeleteColumn(column.id); onClose(); }}
              disabled={saving}
              sx={{ mr: 'auto' }}
            >
              Xóa cột
            </Button>
          )}
          <Button size="small" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : undefined}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </Box>
      </Box>
    </Popover>
  );
}
