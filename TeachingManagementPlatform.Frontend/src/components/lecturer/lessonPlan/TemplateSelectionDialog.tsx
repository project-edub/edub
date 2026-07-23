import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { CurriculumTemplate, CurriculumTemplateLesson } from '../../../types/curriculumTemplate';
import * as curriculumTemplateService from '../../../services/adminCurriculumTemplateService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateSelectionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** The lesson plan ID to generate lessons for */
  lessonPlanId: number;
  /** Subject of the current lesson plan */
  subject: string;
  /** Grade of the current lesson plan */
  grade: number;
  /** Callback when lessons are generated successfully */
  onGenerated: () => void;
}

type DialogStep = 'list' | 'preview';

// ── Component ─────────────────────────────────────────────────────────────────

export default function TemplateSelectionDialog({
  open,
  onClose,
  lessonPlanId,
  subject,
  grade,
  onGenerated,
}: TemplateSelectionDialogProps) {
  const [step, setStep] = useState<DialogStep>('list');
  const [templates, setTemplates] = useState<CurriculumTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [selectedTemplate, setSelectedTemplate] = useState<CurriculumTemplate | null>(null);
  const [lessons, setLessons] = useState<CurriculumTemplateLesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // Generate state
  const [generating, setGenerating] = useState(false);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setStep('list');
      setSelectedTemplate(null);
      setLessons([]);
      setError(null);
      fetchTemplates();
    }
  }, [open, subject, grade]);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await curriculumTemplateService.getTemplates(subject, grade);
      setTemplates(data);
    } catch {
      setError('Không thể tải danh sách mẫu giáo án. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [subject, grade]);

  async function handleSelectTemplate(template: CurriculumTemplate) {
    setSelectedTemplate(template);
    setStep('preview');
    setLessonsLoading(true);
    setError(null);
    try {
      const data = await curriculumTemplateService.getTemplateLessons(template.id);
      setLessons(data);
    } catch {
      setError('Không thể tải danh sách bài học. Vui lòng thử lại.');
    } finally {
      setLessonsLoading(false);
    }
  }

  function handleBackToList() {
    setStep('list');
    setSelectedTemplate(null);
    setLessons([]);
    setError(null);
  }

  async function handleApply() {
    if (!selectedTemplate) return;
    setGenerating(true);
    setError(null);
    try {
      await curriculumTemplateService.generateFromTemplate(lessonPlanId, selectedTemplate.id);
      onGenerated();
      onClose();
    } catch {
      setError('Không thể tạo giáo án từ mẫu. Vui lòng thử lại.');
    } finally {
      setGenerating(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="template-selection-dialog-title"
    >
      <DialogTitle id="template-selection-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {step === 'preview' && (
            <IconButton
              onClick={handleBackToList}
              size="small"
              aria-label="Quay lại danh sách"
              disabled={generating}
            >
              <ArrowLeft size={20} />
            </IconButton>
          )}
          <Sparkles size={20} />
          <span>
            {step === 'list' ? 'Chọn mẫu giáo án' : `Xem trước: ${selectedTemplate?.sourceNote || 'Mẫu giáo án'}`}
          </span>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 'list' && renderTemplateList()}
        {step === 'preview' && renderLessonPreview()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {step === 'list' && (
          <>
            <Button onClick={onClose}>Đóng</Button>
          </>
        )}
        {step === 'preview' && (
          <>
            <Button onClick={handleBackToList} disabled={generating}>
              Quay lại
            </Button>
            <Button
              variant="contained"
              onClick={handleApply}
              disabled={generating || lessons.length === 0}
            >
              {generating ? 'Đang tạo...' : 'Áp dụng'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );

  // ── Sub-renders ─────────────────────────────────────────────────────────────

  function renderTemplateList() {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (templates.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Chưa có mẫu giáo án nào cho môn {subject}{grade > 0 ? ` lớp ${grade}` : ''}.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bạn có thể tạo template mới từ giáo án hiện có hoặc nhập từ file.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Chọn một mẫu giáo án phù hợp cho môn {subject}{grade > 0 ? ` lớp ${grade}` : ''}:
        </Typography>
        {templates.map((template) => (
          <Card
            key={template.id}
            variant="outlined"
            sx={{
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <CardActionArea onClick={() => handleSelectTemplate(template)}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {template.sourceNote || `Mẫu giáo án ${template.subject}`}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${template.lessonCount} bài học`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={`Đã dùng ${template.usageCount} lần`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    );
  }

  function renderLessonPreview() {
    if (lessonsLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (lessons.length === 0 && !error) {
      return (
        <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Mẫu này chưa có bài học nào.
        </Typography>
      );
    }

    // Group lessons by chapter
    const chapters = new Map<string, CurriculumTemplateLesson[]>();
    for (const lesson of lessons) {
      const chapter = lesson.chapterName || 'Không có chương';
      if (!chapters.has(chapter)) {
        chapters.set(chapter, []);
      }
      chapters.get(chapter)!.push(lesson);
    }

    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Danh sách {lessons.length} bài học sẽ được tạo:
        </Typography>

        {Array.from(chapters.entries()).map(([chapterName, chapterLessons], idx) => (
          <Box key={chapterName} sx={{ mb: 2 }}>
            {idx > 0 && <Divider sx={{ mb: 2 }} />}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {chapterName}
            </Typography>
            {chapterLessons.map((lesson) => (
              <Box
                key={lesson.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 0.75,
                  px: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 32 }}>
                  {lesson.orderIndex}.
                </Typography>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {lesson.lessonName}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  }
}
