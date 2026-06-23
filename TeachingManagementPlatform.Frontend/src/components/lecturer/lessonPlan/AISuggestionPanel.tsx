import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { LessonSuggestionResponse } from '../../../types/lessonSuggestion';
import * as lessonSuggestionService from '../../../services/lessonSuggestionService';

interface AISuggestionPanelBaseProps {
  lessonId: number;
  lessonName: string;
}

interface DialogModeProps extends AISuggestionPanelBaseProps {
  /** When `open` is provided, the panel renders as a MUI Dialog */
  open: boolean;
  onClose: () => void;
  /** Not used in dialog mode */
  suggestion?: undefined;
  loading?: undefined;
  error?: undefined;
}

interface InlineModeProps extends AISuggestionPanelBaseProps {
  /** Pre-loaded suggestion data (used in batch mode) */
  suggestion?: LessonSuggestionResponse | null;
  /** Whether the panel is currently loading data externally */
  loading?: boolean;
  /** Error message from external loading */
  error?: string | null;
  onClose?: () => void;
  open?: undefined;
}

type AISuggestionPanelProps = DialogModeProps | InlineModeProps;

function SuggestionContent({
  lessonId,
  lessonName,
  suggestion,
  loading,
  error,
  onClose,
}: {
  lessonId: number;
  lessonName: string;
  suggestion: LessonSuggestionResponse | null;
  loading: boolean;
  error: string | null;
  onClose?: () => void;
}) {
  const [selectedAttachments, setSelectedAttachments] = useState<number[]>([]);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  function toggleAttachment(fileId: number) {
    setSelectedAttachments((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId],
    );
  }

  async function handleAcceptAttachments() {
    if (selectedAttachments.length === 0) return;
    setApplying(true);
    try {
      for (const fileId of selectedAttachments) {
        await lessonSuggestionService.acceptSuggestion(lessonId, {
          type: 'attachment',
          value: String(fileId),
        });
      }
      setApplySuccess('Đã gán tài liệu thành công!');
      setSelectedAttachments([]);
    } catch {
      // silently fail, user can retry
    } finally {
      setApplying(false);
    }
  }

  async function handleAcceptQuizTopic() {
    if (!suggestion?.suggestedQuizTopic) return;
    setApplying(true);
    try {
      await lessonSuggestionService.acceptSuggestion(lessonId, {
        type: 'quiz_topic',
        value: suggestion.suggestedQuizTopic,
      });
      setApplySuccess('Đã áp dụng chủ đề quiz!');
    } catch {
      // silently fail
    } finally {
      setApplying(false);
    }
  }

  async function handleAcceptCrosswordTopic() {
    if (!suggestion?.suggestedCrosswordTopic) return;
    setApplying(true);
    try {
      await lessonSuggestionService.acceptSuggestion(lessonId, {
        type: 'crossword_topic',
        value: suggestion.suggestedCrosswordTopic,
      });
      setApplySuccess('Đã áp dụng chủ đề crossword!');
    } catch {
      // silently fail
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Đang phân tích bài &quot;{lessonName}&quot;...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!suggestion) {
    return null;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AutoAwesomeIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight={600}>
          Gợi ý AI cho: {lessonName}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Gợi ý bởi AI — Vui lòng xem xét trước khi áp dụng.
      </Alert>

      {applySuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setApplySuccess(null)}>
          {applySuccess}
        </Alert>
      )}

      {/* Suggested Attachments */}
      {suggestion.suggestedAttachments.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Tài liệu gợi ý
          </Typography>
          {suggestion.suggestedAttachments.map((att) => (
            <FormControlLabel
              key={att.fileId}
              control={
                <Checkbox
                  checked={selectedAttachments.includes(att.fileId)}
                  onChange={() => toggleAttachment(att.fileId)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {att.fileName}{' '}
                  <Chip
                    label={`${Math.round(att.similarity * 100)}%`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Typography>
              }
              sx={{ display: 'block' }}
            />
          ))}
          <Button
            variant="outlined"
            size="small"
            onClick={handleAcceptAttachments}
            disabled={applying || selectedAttachments.length === 0}
            sx={{ mt: 1 }}
          >
            Áp dụng tài liệu đã chọn
          </Button>
        </Box>
      )}

      {/* Keywords */}
      {suggestion.suggestedKeywords.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Từ khóa gợi ý
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {suggestion.suggestedKeywords.map((kw, i) => (
              <Chip key={i} label={kw} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
      )}

      {/* Quiz topic */}
      {suggestion.suggestedQuizTopic && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Chủ đề quiz gợi ý
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {suggestion.suggestedQuizTopic}
          </Typography>
          <Button variant="outlined" size="small" onClick={handleAcceptQuizTopic} disabled={applying}>
            Tạo quiz
          </Button>
        </Box>
      )}

      {/* Crossword topic */}
      {suggestion.suggestedCrosswordTopic && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Chủ đề crossword gợi ý
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {suggestion.suggestedCrosswordTopic}
          </Typography>
          <Button variant="outlined" size="small" onClick={handleAcceptCrosswordTopic} disabled={applying}>
            Tạo crossword
          </Button>
        </Box>
      )}

      {/* Close button (inline mode only) */}
      {onClose && (
        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Button onClick={onClose} size="small">
            Đóng
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default function AISuggestionPanel(props: AISuggestionPanelProps) {
  // Dialog mode: fetches suggestions internally
  if (props.open !== undefined) {
    return <AISuggestionDialog {...(props as DialogModeProps)} />;
  }

  // Inline mode: uses externally provided data
  const { lessonId, lessonName, suggestion, loading, error, onClose } = props as InlineModeProps;
  return (
    <SuggestionContent
      lessonId={lessonId}
      lessonName={lessonName}
      suggestion={suggestion ?? null}
      loading={loading ?? false}
      error={error ?? null}
      onClose={onClose}
    />
  );
}

function AISuggestionDialog({ open, onClose, lessonId, lessonName }: DialogModeProps) {
  const [step, setStep] = useState<'input' | 'loading' | 'result'>('input');
  const [description, setDescription] = useState('');
  const [suggestion, setSuggestion] = useState<LessonSuggestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aiSuggestionCost = 5; // Hardcoded for now, can be fetched from config

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('input');
      setDescription('');
      setSuggestion(null);
      setError(null);
    }
  }, [open]);

  function handleConfirm() {
    setStep('loading');
    setError(null);
    setSuggestion(null);
    lessonSuggestionService
      .suggestContent(lessonId, description || undefined)
      .then((data) => {
        setSuggestion(data);
        setStep('result');
      })
      .catch((err) => {
        const message = err?.response?.data?.error?.message || 'Không thể lấy gợi ý AI cho bài này.';
        setError(message);
        setStep('input');
      });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeIcon color="primary" fontSize="small" />
        Gợi ý AI
      </DialogTitle>
      <DialogContent dividers>
        {step === 'input' && (
          <Box sx={{ p: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Mô tả ngắn gọn nội dung bạn muốn:
            </Typography>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Tìm tài liệu về phương trình bậc hai, công thức giải..."
              style={{
                width: '100%',
                minHeight: 80,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <Alert severity="info" sx={{ mt: 2 }} icon={false}>
              <Typography variant="body2">
                Chi phí: <strong>{aiSuggestionCost} ECoin</strong>
              </Typography>
            </Alert>
          </Box>
        )}
        {step === 'loading' && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Đang phân tích bài &quot;{lessonName}&quot;...
            </Typography>
          </Box>
        )}
        {step === 'result' && (
          <SuggestionContent
            lessonId={lessonId}
            lessonName={lessonName}
            suggestion={suggestion}
            loading={false}
            error={null}
          />
        )}
      </DialogContent>
      <DialogActions>
        {step === 'input' && (
          <>
            <Button onClick={onClose}>Hủy</Button>
            <Button variant="contained" onClick={handleConfirm}>
              Gợi ý AI
            </Button>
          </>
        )}
        {step === 'loading' && (
          <Button onClick={onClose} disabled>
            Đóng
          </Button>
        )}
        {step === 'result' && <Button onClick={onClose}>Đóng</Button>}
      </DialogActions>
    </Dialog>
  );
}
