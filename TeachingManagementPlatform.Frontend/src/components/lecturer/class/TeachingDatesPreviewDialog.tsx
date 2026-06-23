import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { LessonDate, SchoolYearHoliday } from '../../../types/teachingSchedule';
import * as teachingScheduleService from '../../../services/teachingScheduleService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TeachingDatesPreviewDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Class ID for the schedule */
  classId: number;
  /** Lesson plan ID to calculate dates for */
  lessonPlanId: number;
  /** List of holidays for highlight detection */
  holidays: SchoolYearHoliday[];
  /** Callback after dates are applied successfully */
  onApplied: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findHolidayConflict(
  dateStr: string,
  holidays: SchoolYearHoliday[],
): SchoolYearHoliday | undefined {
  if (!dateStr) return undefined;
  const date = dateStr.split('T')[0];
  return holidays.find((h) => {
    const start = h.startDate.split('T')[0];
    const end = h.endDate.split('T')[0];
    return date >= start && date <= end;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeachingDatesPreviewDialog({
  open,
  onClose,
  classId,
  lessonPlanId,
  holidays,
  onApplied,
}: TeachingDatesPreviewDialogProps) {
  const [lessonDates, setLessonDates] = useState<LessonDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const loadDates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await teachingScheduleService.calculateDates(classId, lessonPlanId);
      setLessonDates(result.lessonDates);
    } catch {
      setError('Không thể tính ngày dạy. Vui lòng kiểm tra lịch dạy đã được thiết lập.');
    } finally {
      setLoading(false);
    }
  }, [classId, lessonPlanId]);

  useEffect(() => {
    if (open) {
      setLessonDates([]);
      loadDates();
    }
  }, [open, loadDates]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleDateChange(index: number, newDate: string) {
    setLessonDates((prev) =>
      prev.map((item, i) => (i === index ? { ...item, teachingDate: newDate } : item)),
    );
  }

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      await teachingScheduleService.applyDates(classId, lessonPlanId, { dates: lessonDates });
      onApplied();
      onClose();
    } catch {
      setError('Không thể lưu ngày dạy. Vui lòng thử lại.');
    } finally {
      setApplying(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const hasHolidayConflicts = lessonDates.some(
    (d) => !!findHolidayConflict(d.teachingDate, holidays),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="teaching-dates-preview-title"
    >
      <DialogTitle id="teaching-dates-preview-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthIcon color="primary" />
          <span>Xem trước ngày dạy dự kiến</span>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {hasHolidayConflicts && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Một số ngày dạy trùng với ngày nghỉ lễ. Vui lòng kiểm tra các dòng được đánh dấu.
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Đang tính toán ngày dạy...
            </Typography>
          </Box>
        ) : lessonDates.length === 0 && !error ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Không có bài học nào để tính ngày dạy.
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bạn có thể chỉnh sửa ngày dạy cho từng bài trước khi xác nhận.
              Ngày trùng nghỉ lễ sẽ được đánh dấu cảnh báo.
            </Typography>

            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader aria-label="Bảng ngày dạy dự kiến">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 50 }}>STT</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tên bài</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 200 }}>Ngày dạy dự kiến</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lessonDates.map((item, idx) => {
                    const conflictHoliday = findHolidayConflict(item.teachingDate, holidays);
                    return (
                      <TableRow
                        key={item.lessonId}
                        sx={{
                          bgcolor: conflictHoliday ? 'warning.50' : undefined,
                          '&:hover': {
                            bgcolor: conflictHoliday ? 'warning.100' : 'action.hover',
                          },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {idx + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.lessonName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                              type="date"
                              size="small"
                              value={item.teachingDate ? item.teachingDate.split('T')[0] : ''}
                              onChange={(e) => handleDateChange(idx, e.target.value)}
                              disabled={applying}
                              sx={{ width: 160 }}
                              aria-label={`Ngày dạy bài ${item.lessonName}`}
                            />
                            {conflictHoliday && (
                              <Tooltip title={`Trùng nghỉ lễ: ${conflictHoliday.name}`} arrow>
                                <WarningAmberIcon
                                  color="warning"
                                  fontSize="small"
                                  aria-label={`Cảnh báo: trùng nghỉ lễ ${conflictHoliday.name}`}
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Tổng cộng {lessonDates.length} bài học
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={applying}>
          Huỷ
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={loading || applying || lessonDates.length === 0}
        >
          {applying ? 'Đang lưu...' : 'Xác nhận'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
