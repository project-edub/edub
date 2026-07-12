
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import * as lessonPlanService from '../../services/lessonPlanService';
import type { LessonPlan } from '../../types/lessonPlan';

export default function LessonListPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const planId = Number(idParam);
  const navigate = useNavigate();

  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!planId || isNaN(planId)) { setError('ID không hợp lệ.'); setLoading(false); return; }
    loadPlan();
  }, [planId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPlan() {
    setLoading(true); setError('');
    try {
      const data = await lessonPlanService.getById(planId);
      setPlan(data);
    } catch {
      setError('Không thể tải giáo án.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLesson() {
    if (!newLessonName.trim() || !plan) return;
    setActionLoading(true); setError('');
    try {
      const maxOrder = plan.lessons.length > 0
        ? Math.max(...plan.lessons.map((l) => l.orderIndex))
        : 0;
      const existingLessons = plan.lessons.map((l) => ({
        id: l.id,
        name: l.name,
        orderIndex: l.orderIndex,
      }));
      await lessonPlanService.update(planId, {
        lessons: [...existingLessons, { name: newLessonName.trim(), orderIndex: maxOrder + 1 }],
      });
      setNewLessonName('');
      setAdding(false);
      await loadPlan();
    } catch (err: any) {
      setError(err?.message || 'Thêm bài học thất bại.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 900, mx: 'auto', display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !plan) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 900, mx: 'auto' }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button variant="outlined" onClick={() => navigate('/lecturer/lesson-plans')} sx={{ minHeight: 44 }}>
          ← Quay lại
        </Button>
      </Box>
    );
  }

  if (!plan) return null;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 900, mx: 'auto' }}>
      <Button
        variant="outlined"
        onClick={() => navigate('/lecturer/lesson-plans')}
        sx={{ mb: 2.5, minHeight: 44 }}
      >
        ← Quay lại danh sách giáo án
      </Button>

      {error && (
        <Typography role="alert" color="error" sx={{ mb: 1.5 }}>
          {error}
        </Typography>
      )}

      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        {plan.subject}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Khối {plan.grade} · Niên khóa {plan.schoolYearStart} – {plan.schoolYearEnd} · {plan.lessons.length} bài học
      </Typography>

      <Box sx={{ mb: 2 }}>
        {adding ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              alignItems: { xs: 'stretch', sm: 'center' },
            }}
          >
            <TextField
              placeholder="Tên bài học"
              value={newLessonName}
              onChange={(e) => setNewLessonName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddLesson(); }}
              size="small"
              autoFocus
              fullWidth
              sx={{ maxWidth: { sm: 400 } }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleAddLesson}
                disabled={actionLoading || !newLessonName.trim()}
                sx={{ minHeight: 44, flex: { xs: 1, sm: 'none' } }}
              >
                {actionLoading ? 'Đang thêm...' : 'Lưu'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => { setAdding(false); setNewLessonName(''); }}
                sx={{ minHeight: 44, flex: { xs: 1, sm: 'none' } }}
              >
                Hủy
              </Button>
            </Box>
          </Box>
        ) : (
          <Button variant="contained" onClick={() => setAdding(true)} sx={{ minHeight: 44 }}>
            + Thêm bài học
          </Button>
        )}
      </Box>

      {plan.lessons.length === 0 ? (
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            color: 'var(--edub-text-secondary)',
            border: '1px dashed var(--edub-border)',
            borderRadius: 2,
          }}
        >
          Chưa có bài học nào. Nhấn "+ Thêm bài học" để bắt đầu.
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {plan.lessons
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((lesson, idx) => (
              <Card
                key={lesson.id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'box-shadow 150ms ease',
                  '&:hover': { boxShadow: 2 },
                }}
                onClick={() => navigate(`/lecturer/lessons/${lesson.id}/edit`)}
              >
                <CardContent
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 1,
                    '&:last-child': { pb: 2 },
                  }}
                >
                  <Box>
                    <Typography component="span" sx={{ fontWeight: 700, mr: 1, color: 'var(--edub-text-secondary)' }}>
                      {idx + 1}.
                    </Typography>
                    <Typography component="span" sx={{ fontWeight: 600 }}>
                      {lesson.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Xem & sửa →
                  </Typography>
                </CardContent>
              </Card>
            ))}
        </Box>
      )}
    </Box>
  );
}
