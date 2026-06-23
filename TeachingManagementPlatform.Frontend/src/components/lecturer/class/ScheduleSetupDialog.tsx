import { useState, useEffect, useCallback, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import type {
  ClassSubjectSchedule,
  WeekdaySlot,
  SchoolYearCalendar,
  UpsertScheduleRequest,
} from '../../../types/teachingSchedule';
import * as teachingScheduleService from '../../../services/teachingScheduleService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScheduleSetupDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed/cancelled */
  onClose: () => void;
  /** Class ID to set up schedule for */
  classId: number;
  /** Subject name (e.g. "Toán", "Ngữ văn") */
  subject: string;
  /** Existing schedule for editing (optional) */
  existingSchedule?: ClassSubjectSchedule | null;
  /** Callback after successful save */
  onSaved: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { value: 2, label: 'Thứ 2' },
  { value: 3, label: 'Thứ 3' },
  { value: 4, label: 'Thứ 4' },
  { value: 5, label: 'Thứ 5' },
  { value: 6, label: 'Thứ 6' },
  { value: 7, label: 'Thứ 7' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScheduleSetupDialog({
  open,
  onClose,
  classId,
  subject,
  existingSchedule,
  onSaved,
}: ScheduleSetupDialogProps) {
  const [periodsPerWeek, setPeriodsPerWeek] = useState<number>(0);
  const [selectedDays, setSelectedDays] = useState<Record<number, boolean>>({});
  const [dayPeriods, setDayPeriods] = useState<Record<number, number>>({});
  const [calendarId, setCalendarId] = useState<number | ''>('');
  const [calendars, setCalendars] = useState<SchoolYearCalendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Initialize state when dialog opens ────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    setError(null);

    if (existingSchedule) {
      setPeriodsPerWeek(existingSchedule.periodsPerWeek);
      setCalendarId(existingSchedule.calendarId);

      const days: Record<number, boolean> = {};
      const periods: Record<number, number> = {};
      for (const slot of existingSchedule.weekdaySlots) {
        days[slot.weekday] = true;
        periods[slot.weekday] = slot.periods;
      }
      setSelectedDays(days);
      setDayPeriods(periods);
    } else {
      setPeriodsPerWeek(0);
      setCalendarId('');
      setSelectedDays({});
      setDayPeriods({});
    }
  }, [open, existingSchedule]);

  // ── Fetch calendars ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingCalendars(true);

    teachingScheduleService
      .getCalendars()
      .then((data) => {
        if (cancelled) return;
        setCalendars(data);
        // Auto-select default calendar if no existing schedule
        if (!existingSchedule) {
          const defaultCal = data.find((c) => c.isDefault);
          if (defaultCal) setCalendarId(defaultCal.id);
          else if (data.length > 0) setCalendarId(data[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Không thể tải danh sách lịch năm học.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCalendars(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, existingSchedule]);

  // ── Validation ────────────────────────────────────────────────────────────

  const totalSelectedPeriods = useMemo(() => {
    return Object.entries(selectedDays)
      .filter(([, checked]) => checked)
      .reduce((sum, [weekday]) => sum + (dayPeriods[Number(weekday)] || 0), 0);
  }, [selectedDays, dayPeriods]);

  const isValid = useMemo(() => {
    if (periodsPerWeek <= 0) return false;
    if (calendarId === '' || calendarId <= 0) return false;
    const hasSelectedDay = Object.values(selectedDays).some((v) => v);
    if (!hasSelectedDay) return false;
    return totalSelectedPeriods === periodsPerWeek;
  }, [periodsPerWeek, calendarId, selectedDays, totalSelectedPeriods]);

  const validationMessage = useMemo(() => {
    if (periodsPerWeek <= 0) return null;
    const hasSelectedDay = Object.values(selectedDays).some((v) => v);
    if (!hasSelectedDay) return 'Vui lòng chọn ít nhất một ngày học trong tuần.';
    if (totalSelectedPeriods !== periodsPerWeek) {
      return `Tổng số tiết các ngày (${totalSelectedPeriods}) phải bằng số tiết/tuần (${periodsPerWeek}).`;
    }
    return null;
  }, [periodsPerWeek, selectedDays, totalSelectedPeriods]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDayToggle = useCallback((weekday: number, checked: boolean) => {
    setSelectedDays((prev) => ({ ...prev, [weekday]: checked }));
    if (!checked) {
      setDayPeriods((prev) => {
        const next = { ...prev };
        delete next[weekday];
        return next;
      });
    } else {
      setDayPeriods((prev) => ({ ...prev, [weekday]: 1 }));
    }
  }, []);

  const handleDayPeriodsChange = useCallback((weekday: number, value: number) => {
    setDayPeriods((prev) => ({ ...prev, [weekday]: Math.max(1, value) }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!isValid || calendarId === '') return;

    setSaving(true);
    setError(null);

    try {
      const weekdaySlots: WeekdaySlot[] = Object.entries(selectedDays)
        .filter(([, checked]) => checked)
        .map(([weekday]) => ({
          weekday: Number(weekday),
          periods: dayPeriods[Number(weekday)] || 1,
        }))
        .sort((a, b) => a.weekday - b.weekday);

      const request: UpsertScheduleRequest = {
        subject,
        periodsPerWeek,
        weekdaySlots,
        calendarId: calendarId as number,
      };

      await teachingScheduleService.upsertSchedule(classId, request);
      onSaved();
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Không thể lưu lịch dạy. Vui lòng thử lại.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [isValid, selectedDays, dayPeriods, subject, periodsPerWeek, calendarId, classId, onSaved, onClose]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="schedule-setup-dialog-title"
    >
      <DialogTitle id="schedule-setup-dialog-title">
        Thiết lập lịch dạy — {subject}
      </DialogTitle>

      <DialogContent dividers>
        {loadingCalendars ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && (
              <Alert severity="error">{error}</Alert>
            )}

            {/* Periods per week */}
            <TextField
              label="Số tiết/tuần"
              type="number"
              value={periodsPerWeek || ''}
              onChange={(e) => setPeriodsPerWeek(Math.max(0, Number(e.target.value)))}
              fullWidth
              size="small"
              disabled={saving}
              slotProps={{ htmlInput: { min: 1, max: 20 } }}
            />

            {/* Weekday selection with periods per day */}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Chọn ngày học trong tuần
            </Typography>

            {WEEKDAYS.map(({ value: weekday, label }) => (
              <Box
                key={weekday}
                sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!selectedDays[weekday]}
                      onChange={(e) => handleDayToggle(weekday, e.target.checked)}
                      disabled={saving}
                    />
                  }
                  label={label}
                  sx={{ minWidth: 100 }}
                />
                {selectedDays[weekday] && (
                  <TextField
                    label="Số tiết"
                    type="number"
                    value={dayPeriods[weekday] || ''}
                    onChange={(e) =>
                      handleDayPeriodsChange(weekday, Number(e.target.value))
                    }
                    size="small"
                    disabled={saving}
                    slotProps={{ htmlInput: { min: 1, max: 10 } }}
                    sx={{ width: 100 }}
                  />
                )}
              </Box>
            ))}

            {/* Validation message */}
            {validationMessage && (
              <Alert severity="warning">{validationMessage}</Alert>
            )}

            {/* Total periods summary */}
            {periodsPerWeek > 0 && (
              <Typography variant="body2" color="text.secondary">
                Tổng số tiết đã chọn: <strong>{totalSelectedPeriods}</strong> / {periodsPerWeek}
              </Typography>
            )}

            {/* Calendar selection */}
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel id="calendar-select-label">Lịch năm học</InputLabel>
              <Select
                labelId="calendar-select-label"
                value={calendarId}
                label="Lịch năm học"
                onChange={(e) => setCalendarId(e.target.value as number)}
                disabled={saving}
              >
                {calendars.map((cal) => (
                  <MenuItem key={cal.id} value={cal.id}>
                    {cal.yearStart} — {cal.yearEnd}
                    {cal.isDefault ? ' (Mặc định)' : ''}
                    {` • ${cal.holidayCount} ngày nghỉ`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !isValid}
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
