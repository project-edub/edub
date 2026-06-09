import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import type { StudentListColumn } from '../../types/studentList';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectiveCloneDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Columns available in the source list */
  columns: StudentListColumn[];
  /** Default name suggestion for the new list */
  defaultName?: string;
  /** Whether the clone operation is in progress */
  cloning?: boolean;
  /** Callback when user confirms clone with selected columns and new name */
  onConfirm: (selectedColumnIds: number[], newListName: string) => void;
  /** Callback when dialog is closed/cancelled */
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SelectiveCloneDialog({
  open,
  columns,
  defaultName = '',
  cloning = false,
  onConfirm,
  onClose,
}: SelectiveCloneDialogProps) {
  const [selectedColumnIds, setSelectedColumnIds] = useState<Set<number>>(new Set());
  const [newListName, setNewListName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // Select all columns by default
      setSelectedColumnIds(new Set(columns.map((c) => c.id)));
      setNewListName(defaultName);
      setNameError(null);
    }
  }, [open, columns, defaultName]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleColumn = useCallback((columnId: number) => {
    setSelectedColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedColumnIds(new Set(columns.map((c) => c.id)));
  }, [columns]);

  const handleDeselectAll = useCallback(() => {
    setSelectedColumnIds(new Set());
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewListName(e.target.value);
    if (nameError) setNameError(null);
  }, [nameError]);

  function handleConfirm() {
    const trimmedName = newListName.trim();
    if (!trimmedName) {
      setNameError('Vui lòng nhập tên bảng mới');
      return;
    }
    if (selectedColumnIds.size === 0) {
      return; // Button should be disabled, but guard anyway
    }
    onConfirm(Array.from(selectedColumnIds), trimmedName);
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const allSelected = columns.length > 0 && selectedColumnIds.size === columns.length;
  const noneSelected = selectedColumnIds.size === 0;
  const sortedColumns = [...columns].sort((a, b) => a.sortOrder - b.sortOrder);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="selective-clone-dialog-title"
    >
      <DialogTitle id="selective-clone-dialog-title">
        Nhân bản chọn lọc cột
      </DialogTitle>

      <DialogContent dividers>
        {/* New list name input */}
        <TextField
          label="Tên bảng mới"
          value={newListName}
          onChange={handleNameChange}
          fullWidth
          size="small"
          error={Boolean(nameError)}
          helperText={nameError}
          disabled={cloning}
          sx={{ mb: 3 }}
          autoFocus
        />

        <Divider sx={{ mb: 2 }} />

        {/* Column selection header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">
            Chọn cột để copy ({selectedColumnIds.size}/{columns.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              onClick={handleSelectAll}
              disabled={allSelected || cloning}
            >
              Chọn tất cả
            </Button>
            <Button
              size="small"
              onClick={handleDeselectAll}
              disabled={noneSelected || cloning}
            >
              Bỏ chọn tất cả
            </Button>
          </Box>
        </Box>

        {/* Column checkboxes */}
        {columns.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            Không có cột nào để chọn.
          </Typography>
        ) : (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              maxHeight: 280,
              overflow: 'auto',
              px: 1,
              py: 0.5,
            }}
          >
            {sortedColumns.map((column) => (
              <FormControlLabel
                key={column.id}
                control={
                  <Checkbox
                    checked={selectedColumnIds.has(column.id)}
                    onChange={() => handleToggleColumn(column.id)}
                    disabled={cloning}
                    size="small"
                  />
                }
                label={column.name}
                sx={{ display: 'block', ml: 0 }}
              />
            ))}
          </Box>
        )}

        {noneSelected && columns.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Vui lòng chọn ít nhất một cột để nhân bản.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={cloning}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={noneSelected || !newListName.trim() || cloning}
        >
          {cloning ? 'Đang nhân bản...' : 'Nhân bản'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
