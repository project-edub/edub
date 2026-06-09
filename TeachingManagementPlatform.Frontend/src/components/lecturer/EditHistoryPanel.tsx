import { useState, useEffect, useCallback } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreEditRecord {
  id: number;
  entryId: number;
  columnName: string;
  oldValue: string | null;
  newValue: string;
  editedAt: string;
  editedByUserId: number;
}

export interface EditHistoryPanelProps {
  /** The student entry ID to fetch edit history for */
  entryId: number | null;
  /** Whether the panel is open */
  open: boolean;
  /** Callback when the panel should close */
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string to a user-friendly Vietnamese timestamp.
 * Example: "14/01/2025 08:30"
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditHistoryPanel({ entryId, open, onClose }: EditHistoryPanelProps) {
  const [records, setRecords] = useState<ScoreEditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEditHistory = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ScoreEditRecord[]>(
        `/student-entries/${id}/edit-history`,
      );
      // Sort by editedAt descending (most recent first)
      const sorted = response.data.slice().sort(
        (a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime(),
      );
      setRecords(sorted);
    } catch {
      setError('Không thể tải lịch sử chỉnh sửa. Vui lòng thử lại.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && entryId != null) {
      fetchEditHistory(entryId);
    }
    if (!open) {
      setRecords([]);
      setError(null);
    }
  }, [open, entryId, fetchEditHistory]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { width: { xs: '100%', sm: 400 }, maxWidth: '100vw' },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <HistoryIcon color="primary" />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          Lịch sử chỉnh sửa
        </Typography>
        <IconButton onClick={onClose} aria-label="Đóng panel lịch sử">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && records.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Chưa có lịch sử chỉnh sửa.
          </Typography>
        )}

        {!loading && records.length > 0 && (
          <Stack spacing={1.5}>
            {records.map((record) => (
              <Box
                key={record.id}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {/* Timestamp */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {formatTimestamp(record.editedAt)}
                </Typography>

                {/* Column name */}
                <Chip
                  label={record.columnName}
                  size="small"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />

                {/* Old value → New value */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: record.oldValue ? 'text.secondary' : 'text.disabled',
                      textDecoration: record.oldValue ? 'line-through' : 'none',
                      fontStyle: record.oldValue ? 'normal' : 'italic',
                    }}
                  >
                    {record.oldValue ?? '(trống)'}
                  </Typography>

                  <ArrowForwardIcon fontSize="small" color="action" />

                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {record.newValue}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 1.5, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {records.length > 0
            ? `${records.length} thay đổi`
            : 'Không có dữ liệu'}
        </Typography>
      </Box>
    </Drawer>
  );
}
