import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Alert, CircularProgress, Typography, TextField, Switch,
  FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import * as quizService from '../../services/quizService';
import type { QuizGameDetail, QuizQuestionDetail, QuizSubmission } from '../../services/quizService';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizEditorPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const gameId = Number(idParam);
  const navigate = useNavigate();

  const [game, setGame] = useState<QuizGameDetail | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionDetail[]>([]);
  const [title, setTitle] = useState('');
  const [showAnswers, setShowAnswers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Submissions tab
  const [activeTab, setActiveTab] = useState(0);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Load game
  useEffect(() => {
    if (!gameId || isNaN(gameId)) { setError('ID không hợp lệ.'); setLoading(false); return; }
    (async () => {
      try {
        const data = await quizService.getQuiz(gameId);
        setGame(data);
        setQuestions(data.questions);
        setTitle(data.title);
        setShowAnswers(data.showAnswersAfterSubmit);
      } catch (err: any) {
        setError(err?.message || 'Không thể tải bài quiz.');
      } finally { setLoading(false); }
    })();
  }, [gameId]);

  // Load submissions when tab changes
  useEffect(() => {
    if (activeTab !== 1 || !gameId) return;
    setSubmissionsLoading(true);
    (async () => {
      try {
        const data = await quizService.getQuizSubmissions(gameId);
        setSubmissions(data);
      } catch {} finally { setSubmissionsLoading(false); }
    })();
  }, [activeTab, gameId]);

  const handleSave = useCallback(async () => {
    if (!game) return;
    setSaving(true); setError(null);
    try {
      const updated = await quizService.updateQuiz(game.id, { ...game, title, showAnswersAfterSubmit: showAnswers, questions });
      setGame(updated);
    } catch (err: any) { setError(err?.message || 'Lưu thất bại.'); }
    finally { setSaving(false); }
  }, [game, title, showAnswers, questions]);

  const handlePublish = useCallback(async () => {
    if (!game) return;
    setPublishing(true); setError(null);
    try {
      // Save first
      await quizService.updateQuiz(game.id, { ...game, title, showAnswersAfterSubmit: showAnswers, questions });
      const updated = await quizService.publishQuiz(game.id, { showAnswersAfterSubmit: showAnswers });
      setGame(updated);
      setShowPublishModal(true);
    } catch (err: any) { setError(err?.message || 'Xuất bản thất bại.'); }
    finally { setPublishing(false); }
  }, [game, title, showAnswers, questions]);

  const handleQuestionChange = useCallback((qId: number, field: keyof QuizQuestionDetail, value: any) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, [field]: value } : q));
  }, []);

  const handleOptionChange = useCallback((qId: number, optionIndex: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const options: string[] = JSON.parse(q.optionsJson);
      options[optionIndex] = value;
      return { ...q, optionsJson: JSON.stringify(options) };
    }));
  }, []);

  const handleDeleteQuestion = useCallback((qId: number) => {
    setQuestions(prev => prev.filter(q => q.id !== qId).map((q, idx) => ({ ...q, number: idx + 1 })));
  }, []);

  const handleAddQuestion = useCallback(async () => {
    if (!game) return;
    try {
      const newQuestion = await quizService.addQuestion(game.id);
      setQuestions(prev => [...prev, newQuestion]);
    } catch (err: any) {
      setError(err?.message || 'Thêm câu hỏi thất bại.');
    }
  }, [game]);

  const shareUrl = game ? `${window.location.origin}/quiz/${game.slug}` : '';

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error && !game) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
  if (!game) return null;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 3, gap: 2 }}>
        <Button variant="text" onClick={() => navigate('/lecturer/quiz-generator')} sx={{ minHeight: 44, alignSelf: { xs: 'flex-start', md: 'auto' } }}>← Quay lại</Button>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button variant="outlined" onClick={() => void handleSave()} disabled={saving} sx={{ minHeight: 44, flex: 1 }}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
          <Button variant="contained" onClick={() => void handlePublish()} disabled={publishing} sx={{ minHeight: 44, flex: 1 }}>
            {publishing ? 'Đang xuất bản...' : game.status === 'published' ? 'Tái xuất bản' : 'Xuất bản'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Published link */}
      {game.status === 'published' && (
        <Box sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1 }}>
          <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600 }}>🔗 Link quiz:</Typography>
          <Typography variant="body2" sx={{ flex: 1, color: '#166534', overflowWrap: 'anywhere' }}>{shareUrl}</Typography>
          <IconButton size="small" onClick={() => void handleCopy()} sx={{ minWidth: 44, minHeight: 44, alignSelf: { xs: 'flex-end', sm: 'auto' } }}><ContentCopyIcon fontSize="small" /></IconButton>
          {copied && <Chip label="Đã sao chép" size="small" color="success" />}
        </Box>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3 }}>
        <Tab label={`Câu hỏi (${questions.length})`} />
        <Tab label={`Bài nộp (${game.status === 'published' ? submissions.length || '...' : 0})`} />
        <Tab label="Cài đặt" />
      </Tabs>

      {/* Tab 0: Questions */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {questions.map((q, idx) => {
            const options: string[] = JSON.parse(q.optionsJson);
            return (
              <Box key={q.id} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', position: 'relative' }}>
                <IconButton size="small" sx={{ position: 'absolute', top: 8, right: 8, minWidth: 44, minHeight: 44 }} onClick={() => handleDeleteQuestion(q.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Câu {idx + 1}</Typography>
                <TextField
                  fullWidth size="small" value={q.questionText}
                  onChange={e => handleQuestionChange(q.id, 'questionText', e.target.value)}
                  sx={{ mb: 1.5 }}
                  placeholder="Nội dung câu hỏi"
                />
                {options.map((opt, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={OPTION_LABELS[i]}
                      size="small"
                      color={q.correctAnswerIndex === i ? 'success' : 'default'}
                      onClick={() => handleQuestionChange(q.id, 'correctAnswerIndex', i)}
                      sx={{ cursor: 'pointer', minWidth: 32 }}
                    />
                    <TextField
                      fullWidth size="small" value={opt}
                      onChange={e => handleOptionChange(q.id, i, e.target.value)}
                      placeholder={`Đáp án ${OPTION_LABELS[i]}`}
                    />
                  </Box>
                ))}
                <TextField
                  fullWidth size="small" value={q.explanation || ''}
                  onChange={e => handleQuestionChange(q.id, 'explanation', e.target.value)}
                  placeholder="Giải thích (tùy chọn)" sx={{ mt: 1 }}
                />
              </Box>
            );
          })}
          {questions.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Chưa có câu hỏi nào. Nhấn nút bên dưới để thêm câu hỏi.
            </Typography>
          )}
          <Button variant="outlined" onClick={() => void handleAddQuestion()} sx={{ alignSelf: 'center' }}>
            + Thêm câu hỏi
          </Button>
        </Box>
      )}

      {/* Tab 1: Submissions */}
      {activeTab === 1 && (
        <Box>
          {submissionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : submissions.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Chưa có bài nộp nào.</Typography>
          ) : (
            <>
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
              {submissions.map(s => (
                <Box key={s.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>{s.studentName}</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <Typography variant="body2">Đúng: {s.correctCount}/{s.totalQuestions}</Typography>
                    <Chip label={`${s.scorePercent.toFixed(0)}%`} size="small" color={s.scorePercent >= 80 ? 'success' : s.scorePercent >= 50 ? 'warning' : 'error'} sx={{ justifySelf: 'start' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{new Date(s.submittedAt).toLocaleString('vi-VN')}</Typography>
                </Box>
              ))}
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Tên học sinh</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Đúng</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Tổng</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Điểm</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Thời gian nộp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.studentName}</TableCell>
                      <TableCell align="center">{s.correctCount}</TableCell>
                      <TableCell align="center">{s.totalQuestions}</TableCell>
                      <TableCell align="center">
                        <Chip label={`${s.scorePercent.toFixed(0)}%`} size="small" color={s.scorePercent >= 80 ? 'success' : s.scorePercent >= 50 ? 'warning' : 'error'} />
                      </TableCell>
                      <TableCell>{new Date(s.submittedAt).toLocaleString('vi-VN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            </>
          )}
        </Box>
      )}

      {/* Tab 2: Settings */}
      {activeTab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Tên bài quiz" value={title} onChange={e => setTitle(e.target.value)} fullWidth placeholder="Tên trò chơi" />
          <FormControlLabel
            control={<Switch checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)} />}
            label="Hiện đáp án đúng sau khi học sinh nộp bài"
          />
          <Typography variant="caption" color="text.secondary">
            Nếu tắt, học sinh chỉ thấy số câu đúng/sai mà không biết đáp án chính xác.
          </Typography>
        </Box>
      )}

      {/* Publish success modal */}
      <Dialog open={showPublishModal} onClose={() => setShowPublishModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Xuất bản thành công!</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>Chia sẻ link này cho học sinh:</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField value={shareUrl} fullWidth size="small" slotProps={{ input: { readOnly: true } }} />
            <IconButton onClick={() => void handleCopy()} sx={{ minWidth: 44, minHeight: 44 }}><ContentCopyIcon /></IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPublishModal(false)} variant="contained" sx={{ minHeight: 44 }}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
