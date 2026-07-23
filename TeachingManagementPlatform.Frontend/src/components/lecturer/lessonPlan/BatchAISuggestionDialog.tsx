import { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Alert from '@mui/material/Alert';
import { Sparkles } from 'lucide-react';
import type { Lesson } from '../../../types/lessonPlan';
import type { LessonSuggestionResponse } from '../../../types/lessonSuggestion';
import * as lessonSuggestionService from '../../../services/lessonSuggestionService';
import AISuggestionPanel from './AISuggestionPanel';

interface BatchAISuggestionDialogProps {
  open: boolean;
  onClose: () => void;
  lessons: Lesson[];
}

interface BatchResult {
  lessonId: number;
  lessonName: string;
  suggestion: LessonSuggestionResponse | null;
  error: string | null;
}

type BatchPhase = 'idle' | 'processing' | 'reviewing';

/**
 * Runs async tasks with a concurrency limit.
 * Returns results in the same order as the input tasks.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onProgress: (completed: number) => void,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;
  let completed = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex;
      nextIndex++;
      results[currentIndex] = await tasks[currentIndex]();
      completed++;
      onProgress(completed);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

export default function BatchAISuggestionDialog({
  open,
  onClose,
  lessons,
}: BatchAISuggestionDialogProps) {
  const [phase, setPhase] = useState<BatchPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  const totalLessons = lessons.length;

  const handleStart = useCallback(async () => {
    if (lessons.length === 0) return;

    setPhase('processing');
    setProgress(0);
    setResults([]);
    setReviewIndex(0);

    const tasks = lessons.map((lesson) => async (): Promise<BatchResult> => {
      try {
        const suggestion = await lessonSuggestionService.suggestContent(lesson.id);
        return { lessonId: lesson.id, lessonName: lesson.name, suggestion, error: null };
      } catch {
        return { lessonId: lesson.id, lessonName: lesson.name, suggestion: null, error: 'Không thể lấy gợi ý cho bài này.' };
      }
    });

    const batchResults = await runWithConcurrency(tasks, 3, (completed) => {
      setProgress(completed);
    });

    setResults(batchResults);
    setPhase('reviewing');
  }, [lessons]);

  function handleClose() {
    // Reset state when closing
    setPhase('idle');
    setProgress(0);
    setResults([]);
    setReviewIndex(0);
    onClose();
  }

  function handleNextLesson() {
    if (reviewIndex < results.length - 1) {
      setReviewIndex((prev) => prev + 1);
    }
  }

  function handlePrevLesson() {
    if (reviewIndex > 0) {
      setReviewIndex((prev) => prev - 1);
    }
  }

  const progressPercent = totalLessons > 0 ? (progress / totalLessons) * 100 : 0;
  const currentResult = results[reviewIndex] ?? null;

  return (
    <Dialog
      open={open}
      onClose={phase === 'processing' ? undefined : handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Sparkles size={24} color="currentColor" />
        Gợi ý AI cho toàn bộ giáo án
      </DialogTitle>

      <DialogContent dividers>
        {/* Idle phase - confirmation */}
        {phase === 'idle' && (
          <Box sx={{ py: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              AI sẽ phân tích {totalLessons} bài học và đưa ra gợi ý nội dung cho từng bài.
              Kết quả chỉ để tham khảo — bạn sẽ duyệt từng bài trước khi áp dụng.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Quá trình này có thể mất vài phút tùy số lượng bài học. Bạn có thể đóng dialog sau khi hoàn tất để tiếp tục làm việc.
            </Typography>
          </Box>
        )}

        {/* Processing phase - progress bar */}
        {phase === 'processing' && (
          <Box sx={{ py: 3 }}>
            <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
              Đang xử lý gợi ý AI...
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{ height: 8, borderRadius: 4, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {progress}/{totalLessons} bài đã xử lý
            </Typography>
          </Box>
        )}

        {/* Review phase - review each lesson */}
        {phase === 'reviewing' && currentResult && (
          <Box>
            {/* Stepper indicator */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Bài {reviewIndex + 1} / {results.length}
              </Typography>
              <Stepper
                activeStep={reviewIndex}
                alternativeLabel
                sx={{
                  '& .MuiStepLabel-label': { fontSize: '0.7rem' },
                  overflowX: 'auto',
                }}
              >
                {results.map((r, idx) => (
                  <Step key={r.lessonId} completed={idx < reviewIndex}>
                    <StepLabel
                      error={!!r.error}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setReviewIndex(idx)}
                    >
                      {r.lessonName.length > 15
                        ? r.lessonName.slice(0, 15) + '...'
                        : r.lessonName}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Suggestion panel for current lesson */}
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <AISuggestionPanel
                lessonId={currentResult.lessonId}
                lessonName={currentResult.lessonName}
                suggestion={currentResult.suggestion}
                loading={false}
                error={currentResult.error}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {phase === 'idle' && (
          <>
            <Button onClick={handleClose}>Hủy</Button>
            <Button
              variant="contained"
              onClick={handleStart}
              startIcon={<Sparkles size={20} />}
              disabled={totalLessons === 0}
            >
              Bắt đầu ({totalLessons} bài)
            </Button>
          </>
        )}

        {phase === 'processing' && (
          <Typography variant="body2" color="text.secondary">
            Đang xử lý, vui lòng chờ...
          </Typography>
        )}

        {phase === 'reviewing' && (
          <>
            <Button onClick={handlePrevLesson} disabled={reviewIndex === 0}>
              ← Bài trước
            </Button>
            <Box sx={{ flex: 1 }} />
            {reviewIndex < results.length - 1 ? (
              <Button variant="contained" onClick={handleNextLesson}>
                Bài tiếp theo →
              </Button>
            ) : (
              <Button variant="contained" color="success" onClick={handleClose}>
                Hoàn tất duyệt
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
