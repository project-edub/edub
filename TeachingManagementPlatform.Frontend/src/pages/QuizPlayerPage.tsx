import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, CircularProgress, TextField, Typography, Alert } from '@mui/material';
import * as quizService from '../services/quizService';
import type { QuizPlayerData, QuizSubmitResponse } from '../services/quizService';

export default function QuizPlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [quiz, setQuiz] = useState<QuizPlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!slug) { setError('Đường dẫn không hợp lệ.'); setLoading(false); return; }
    (async () => {
      try {
        const data = await quizService.getPlayerQuiz(slug);
        setQuiz(data);
      } catch { setError('Không tìm thấy bài quiz.'); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  const handleSubmit = useCallback(async () => {
    if (!quiz || !slug) return;
    if (quiz.requireStudentName && !studentName.trim()) { setError('Vui lòng nhập tên.'); return; }
    setSubmitting(true); setError(null);
    try {
      const answerList = quiz.questions.map(q => ({ questionId: q.id, answerIndex: answers[q.id] ?? -1 }));
      const res = await quizService.submitQuiz(slug, { studentName: studentName.trim() || 'Ẩn danh', answers: answerList });
      setResult(res);
    } catch { setError('Nộp bài thất bại.'); }
    finally { setSubmitting(false); }
  }, [quiz, slug, studentName, answers]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;
  if (error && !quiz) return <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 8 }}><Alert severity="error">{error}</Alert></Box>;
  if (!quiz) return null;

  // ── Result screen ──
  if (result) {
    return (
      <Box sx={{ maxWidth: 700, mx: 'auto', p: 3, mt: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, textAlign: 'center' }}>Kết quả</Typography>
        <Box sx={{ textAlign: 'center', mb: 3, p: 3, borderRadius: 3, bgcolor: result.correctCount === result.totalQuestions ? '#ecfdf5' : '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'primary.main' }}>{result.correctCount}/{result.totalQuestions}</Typography>
          <Typography variant="body1" color="text.secondary">Điểm: {result.scorePercent.toFixed(1)}%</Typography>
        </Box>
        {result.showAnswers && result.results && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {quiz.questions.map((q, idx) => {
              const r = result.results!.find(x => x.questionId === q.id);
              const options: string[] = JSON.parse(q.optionsJson);
              return (
                <Box key={q.id} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: r?.isCorrect ? '#a7f3d0' : '#fecdd3', bgcolor: r?.isCorrect ? '#f0fdf4' : '#fef2f2' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{idx + 1}. {q.questionText}</Typography>
                  {options.map((opt, i) => (
                    <Typography key={i} variant="body2" sx={{ ml: 2, color: i === r?.correctAnswerIndex ? '#166534' : answers[q.id] === i && !r?.isCorrect ? '#991b1b' : 'text.primary' }}>
                      {i === r?.correctAnswerIndex ? '✓' : answers[q.id] === i ? '✗' : '○'} {opt}
                    </Typography>
                  ))}
                  {r?.explanation && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>💡 {r.explanation}</Typography>}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    );
  }

  // ── Name entry screen ──
  if (!started) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', p: 3, mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{quiz.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{quiz.questions.length} câu hỏi</Typography>
        {quiz.requireStudentName && (
          <TextField label="Họ và tên" value={studentName} onChange={e => setStudentName(e.target.value)} fullWidth sx={{ mb: 2 }} />
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Button variant="contained" size="large" fullWidth onClick={() => { if (quiz.requireStudentName && !studentName.trim()) { setError('Vui lòng nhập tên.'); return; } setError(null); setStarted(true); }}>
          Bắt đầu làm bài
        </Button>
      </Box>
    );
  }

  // ── Quiz questions ──
  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 3, mt: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>{quiz.title}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {quiz.questions.map((q, idx) => {
          const options: string[] = JSON.parse(q.optionsJson);
          return (
            <Box key={q.id} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1.5 }}>{idx + 1}. {q.questionText}</Typography>
              {options.map((opt, i) => (
                <Box key={i} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: i }))} sx={{ p: 1.5, mb: 0.5, borderRadius: 1.5, cursor: 'pointer', border: '1px solid', borderColor: answers[q.id] === i ? 'primary.main' : 'divider', bgcolor: answers[q.id] === i ? 'primary.light' : 'transparent', color: answers[q.id] === i ? 'primary.contrastText' : 'text.primary', '&:hover': { bgcolor: answers[q.id] === i ? 'primary.light' : 'action.hover' } }}>
                  <Typography variant="body2">{String.fromCharCode(65 + i)}. {opt}</Typography>
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
      <Button variant="contained" size="large" fullWidth sx={{ mt: 3 }} disabled={submitting} onClick={() => void handleSubmit()}>
        {submitting ? 'Đang nộp...' : 'Nộp bài'}
      </Button>
    </Box>
  );
}
