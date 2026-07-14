import { useState, useEffect, useCallback, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import type {
  CurriculumTemplate,
  CurriculumTemplateLesson,
  CreateCurriculumTemplateRequest,
  UpdateCurriculumTemplateRequest,
  LessonItemDto,
  BulkUpdateLessonsRequest,
} from '../../types/curriculumTemplate';
import * as lecturerService from '../../services/lecturerCurriculumTemplateService';
import TemplateLessonEditor from '../shared/TemplateLessonEditor';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CurriculumTemplateDialogProps {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  template?: CurriculumTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CurriculumTemplateDialog({
  open,
  mode,
  template,
  onClose,
  onSaved,
}: CurriculumTemplateDialogProps) {
  // Form fields
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState<number | ''>('');
  const [sourceNote, setSourceNote] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Lessons
  const [lessons, setLessons] = useState<CurriculumTemplateLesson[]>([]);
  const [_editedLessons, setEditedLessons] = useState<LessonItemDto[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [savingLessons, setSavingLessons] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ subject?: string; grade?: string }>({});

  const isReadOnly = mode === 'view';
  const lessonsRef = useRef<LessonItemDto[]>([]);

  // ── Reset / Load data ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    setError(null);
    setSuccessMsg(null);
    setValidationErrors({});
    setSaving(false);
    setSavingLessons(false);

    if (mode === 'create') {
      setSubject('');
      setGrade('');
      setSourceNote('');
      setIsPublic(false);
      setLessons([]);
      setEditedLessons([]);
    } else if ((mode === 'edit' || mode === 'view') && template) {
      setSubject(template.subject);
      setGrade(template.grade);
      setSourceNote(template.sourceNote ?? '');
      setIsPublic(template.isPublic);
      // Load lessons
      loadLessons(template.id);
    }
  }, [open, mode, template]);

  const loadLessons = async (templateId: number) => {
    try {
      const data = await lecturerService.getTemplateLessons(templateId);
      setLessons(data);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể tải bài học.';
      setError(message);
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: { subject?: string; grade?: string } = {};

    if (!subject.trim()) {
      errors.subject = 'Tên môn học không được để trống';
    }

    const gradeNum = typeof grade === 'number' ? grade : parseInt(String(grade), 10);
    if (!gradeNum || gradeNum < 1 || gradeNum > 12) {
      errors.grade = 'Lớp phải từ 1 đến 12';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveMetadata = useCallback(async () => {
    if (!validate()) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'create') {
        const request: CreateCurriculumTemplateRequest = {
          subject: subject.trim(),
          grade: typeof grade === 'number' ? grade : parseInt(String(grade), 10),
          ...(sourceNote.trim() ? { sourceNote: sourceNote.trim() } : {}),
        };
        // For lecturer create, isPublic is sent via updateTemplate after creation
        // Actually the backend CreateTemplateAsync for lecturer sets CreatedBy = lecturerId
        // IsPublic needs to be set via update after creation, or we include in create if supported
        // Based on the service, createTemplate only takes CreateCurriculumTemplateRequest
        // We'll create first, then update isPublic if true
        const created = await lecturerService.createTemplate(request);
        if (isPublic) {
          await lecturerService.updateTemplate(created.id, { isPublic: true });
        }
        onSaved();
        onClose();
      } else if (mode === 'edit' && template) {
        const request: UpdateCurriculumTemplateRequest = {
          subject: subject.trim(),
          grade: typeof grade === 'number' ? grade : parseInt(String(grade), 10),
          sourceNote: sourceNote.trim() || undefined,
          isPublic,
        };
        await lecturerService.updateTemplate(template.id, request);
        setSuccessMsg('Đã lưu thông tin template.');
        onSaved();
        // Keep dialog open for lesson editing
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Không thể lưu template. Vui lòng thử lại.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [mode, subject, grade, sourceNote, isPublic, template, onSaved, onClose]);

  const handleLessonsChange = useCallback((updated: LessonItemDto[]) => {
    setEditedLessons(updated);
    lessonsRef.current = updated;
  }, []);

  const handleSaveLessons = useCallback(async () => {
    if (!template) return;

    setSavingLessons(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const request: BulkUpdateLessonsRequest = {
        lessons: lessonsRef.current,
      };
      const updatedLessons = await lecturerService.bulkUpdateLessons(template.id, request);
      setLessons(updatedLessons);
      setSuccessMsg('Đã lưu bài học thành công.');
      onSaved();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Không thể lưu bài học. Vui lòng thử lại.';
      setError(message);
    } finally {
      setSavingLessons(false);
    }
  }, [template, onSaved]);

  // ── Title ───────────────────────────────────────────────────────────────────

  const dialogTitle =
    mode === 'create'
      ? 'Tạo mẫu giáo án mới'
      : mode === 'edit'
        ? 'Chỉnh sửa mẫu giáo án'
        : 'Xem mẫu giáo án';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="curriculum-template-dialog-title"
    >
      <DialogTitle id="curriculum-template-dialog-title">{dialogTitle}</DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMsg}
          </Alert>
        )}

        {/* Metadata Form */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Tên môn học"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (validationErrors.subject) {
                setValidationErrors((prev) => ({ ...prev, subject: undefined }));
              }
            }}
            required
            fullWidth
            size="small"
            disabled={isReadOnly || saving}
            error={!!validationErrors.subject}
            helperText={validationErrors.subject}
          />

          <TextField
            label="Lớp"
            type="number"
            value={grade}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
              setGrade(val as number | '');
              if (validationErrors.grade) {
                setValidationErrors((prev) => ({ ...prev, grade: undefined }));
              }
            }}
            required
            fullWidth
            size="small"
            disabled={isReadOnly || saving}
            error={!!validationErrors.grade}
            helperText={validationErrors.grade}
            slotProps={{ htmlInput: { min: 1, max: 12 } }}
          />

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
            disabled={isReadOnly || saving}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isReadOnly || saving}
              />
            }
            label="Công khai cho giáo viên khác"
          />
        </Box>

        {/* Save metadata button (create/edit only) */}
        {!isReadOnly && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSaveMetadata}
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </Button>
          </Box>
        )}

        {/* Divider between metadata and lessons */}
        <Divider sx={{ my: 3 }} />

        {/* Lesson Editor Section */}
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          Danh sách bài học
        </Typography>

        {mode === 'create' ? (
          <Alert severity="info">
            Lưu template trước, sau đó thêm bài học
          </Alert>
        ) : (
          <>
            <TemplateLessonEditor
              lessons={lessons}
              onChange={handleLessonsChange}
              readOnly={isReadOnly}
            />
            {!isReadOnly && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={handleSaveLessons}
                  disabled={savingLessons}
                >
                  {savingLessons ? 'Đang lưu...' : 'Lưu bài học'}
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving || savingLessons}>
          {isReadOnly ? 'Đóng' : 'Hủy'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
