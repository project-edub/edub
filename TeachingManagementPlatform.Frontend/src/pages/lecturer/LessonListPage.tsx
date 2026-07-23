
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import { Sparkles, BookOpenText } from 'lucide-react';
import CrudIcon from '../../components/common/CrudIcon';
import ConfirmModal from '../../components/common/ConfirmModal';
import * as lessonPlanService from '../../services/lessonPlanService';
import * as lessonSuggestionService from '../../services/lessonSuggestionService';
import type { LessonPlan } from '../../types/lessonPlan';
import TemplateSelectionDialog from '../../components/lecturer/lessonPlan/TemplateSelectionDialog';
import AISuggestionPanel from '../../components/lecturer/lessonPlan/AISuggestionPanel';

const pageStyle: React.CSSProperties = { maxWidth: 960, margin: '0 auto' };

function parseGradeNumber(grade: string): number {
  const match = grade.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export default function LessonListPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const planId = Number(idParam);
  const navigate = useNavigate();

  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [newLessonPeriods, setNewLessonPeriods] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<number | null>(null);

  // Auto-generate state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // AI suggestion state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [selectedLessonForAI, setSelectedLessonForAI] = useState<{ id: number; name: string } | null>(null);

  // Batch AI suggestion state
  const [batchAIOpen, setBatchAIOpen] = useState(false);
  const [batchDescription, setBatchDescription] = useState('');
  const [batchCostInfo, setBatchCostInfo] = useState<{ totalLessons: number; uncachedCount: number; totalCost: number } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);

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
        lessons: [...existingLessons, { name: newLessonName.trim(), orderIndex: maxOrder + 1, suggestedPeriods: newLessonPeriods }],
      });
      setNewLessonName('');
      setNewLessonPeriods(1);
      setAdding(false);
      await loadPlan();
    } catch (err: any) {
      setError(err?.message || 'Thêm bài học thất bại.');
    } finally {
      setActionLoading(false);
    }
  }

  function handleAutoGenerateClick() {
    if (plan && plan.lessons.length > 0) {
      setConfirmDialogOpen(true);
    } else {
      setTemplateDialogOpen(true);
    }
  }

  function handleConfirmAppend() {
    setConfirmDialogOpen(false);
    setTemplateDialogOpen(true);
  }

  async function handleConfirmReplace() {
    setConfirmDialogOpen(false);
    // Clear all existing lessons first, then open template dialog
    if (!plan) return;
    setActionLoading(true);
    setError('');
    try {
      await lessonPlanService.update(planId, { lessons: [] });
      await loadPlan();
      setTemplateDialogOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Xóa bài học cũ thất bại.');
    } finally {
      setActionLoading(false);
    }
  }

  function handleGenerated() {
    loadPlan();
  }

  function handleOpenAISuggestion(lessonId: number, lessonName: string) {
    setSelectedLessonForAI({ id: lessonId, name: lessonName });
    setAiPanelOpen(true);
  }

  function handleCloseAISuggestion() {
    setAiPanelOpen(false);
    setSelectedLessonForAI(null);
  }

  async function handleDeleteLesson(lessonId: number) {
    if (!plan) return;
    setDeleteLessonTarget(null);
    setActionLoading(true);
    setError('');
    try {
      const remainingLessons = plan.lessons
        .filter((l) => l.id !== lessonId)
        .map((l) => ({ id: l.id, name: l.name, orderIndex: l.orderIndex }));
      await lessonPlanService.update(planId, { lessons: remainingLessons });
      await loadPlan();
    } catch (err: any) {
      setError(err?.message || 'Xóa bài học thất bại.');
    } finally {
      setActionLoading(false);
    }
  }

  async function openBatchAI() {
    setBatchAIOpen(true);
    setBatchDescription('');
    setBatchResult(null);
    setBatchCostInfo(null);
    try {
      const cost = await lessonSuggestionService.getSuggestAllCost(planId);
      setBatchCostInfo(cost);
    } catch {
      setBatchCostInfo(null);
    }
  }

  async function handleBatchAI() {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const result = await lessonSuggestionService.suggestAll(planId, batchDescription || undefined);
      setBatchResult(`Đã tạo gợi ý cho ${result.totalProcessed} bài học (chi phí: ${result.totalCost} ECoin)`);
    } catch (err: any) {
      setBatchResult(err?.response?.data?.error?.message || 'Có lỗi xảy ra.');
    } finally {
      setBatchLoading(false);
    }
  }

  if (loading) return <div style={pageStyle}><p>Đang tải...</p></div>;
  if (error && !plan) return <div style={pageStyle}><p style={{ color: '#d32f2f' }}>{error}</p><button className="btn btn-neutral" onClick={() => navigate('/lecturer/lesson-plans')}>← Quay lại</button></div>;
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

      {/* Add lesson button */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <>
            <button className="btn btn-add" onClick={() => setAdding(true)}>+ Thêm bài học</button>
            <Button
              variant="outlined"
              startIcon={<BookOpenText size={18} />}
              onClick={handleAutoGenerateClick}
              disabled={actionLoading}
              size="small"
            >
              Sử dụng giáo án có sẵn
            </Button>
            <Button
              variant="outlined"
              startIcon={<Sparkles size={18} />}
              onClick={openBatchAI}
              disabled={actionLoading || plan.lessons.length === 0}
              size="small"
            >
              Gợi ý AI cho toàn bộ
            </Button>
          </>
      </div>

      {/* Add lesson modal */}
      <Dialog open={adding} onClose={() => { setAdding(false); setNewLessonName(''); setNewLessonPeriods(1); }} maxWidth="xs" fullWidth>
        <DialogTitle>Thêm bài học</DialogTitle>
        <DialogContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Tên bài học</label>
              <input
                type="text"
                placeholder="Nhập tên bài học"
                value={newLessonName}
                onChange={(e) => setNewLessonName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newLessonName.trim()) handleAddLesson(); }}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--edub-border)', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAdding(false); setNewLessonName(''); setNewLessonPeriods(1); }}>Hủy</Button>
          <Button variant="contained" onClick={handleAddLesson} disabled={actionLoading || !newLessonName.trim()}>
            {actionLoading ? 'Đang thêm...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 700, marginRight: 8, color: 'var(--edub-text-secondary)' }}>
                    {idx + 1}.
                  </span>
                  <span style={{ fontWeight: 600 }}>{lesson.name}</span>
                  <Tooltip title="Gợi ý AI">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAISuggestion(lesson.id, lesson.name);
                      }}
                      aria-label={`Gợi ý AI cho bài ${lesson.name}`}
                      sx={{ ml: 0.5, color: 'primary.main' }}
                    >
                      <Sparkles size={18} />
                    </IconButton>
                  </Tooltip>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span onClick={(e) => e.stopPropagation()}>
                    <CrudIcon name="delete" tooltip="Xóa bài học" onClick={() => setDeleteLessonTarget(lesson.id)} disabled={actionLoading} />
                  </span>
                </div>
              </Card>
            ))}
        </Box>
      )}

      {/* Template Selection Dialog */}
      <TemplateSelectionDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        lessonPlanId={planId}
        subject={plan.subject}
        grade={parseGradeNumber(plan.grade)}
        onGenerated={handleGenerated}
      />

      {/* Confirmation Dialog when lessons already exist */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Giáo án đã có bài học</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Giáo án hiện tại đã có {plan.lessons.length} bài học. Bạn muốn thêm bài mới từ mẫu vào cuối hay thay thế toàn bộ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleConfirmAppend} variant="outlined">
            Thêm vào cuối
          </Button>
          <Button onClick={handleConfirmReplace} variant="contained" color="warning">
            Thay thế toàn bộ
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Suggestion Panel */}
      {selectedLessonForAI && (
        <AISuggestionPanel
          open={aiPanelOpen}
          onClose={handleCloseAISuggestion}
          lessonId={selectedLessonForAI.id}
          lessonName={selectedLessonForAI.name}
        />
      )}

      {/* Batch AI Suggestion Dialog */}
      <Dialog open={batchAIOpen} onClose={() => setBatchAIOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gợi ý AI cho toàn bộ bài học</DialogTitle>
        <DialogContent>
          {batchCostInfo && (
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9' }}>
              <p style={{ margin: 0, fontSize: 14 }}>Tổng bài học: <strong>{batchCostInfo.totalLessons}</strong></p>
              <p style={{ margin: '4px 0 0', fontSize: 14 }}>Bài chưa có gợi ý: <strong>{batchCostInfo.uncachedCount}</strong></p>
              <p style={{ margin: '4px 0 0', fontSize: 14 }}>Chi phí ước tính: <strong>{batchCostInfo.totalCost} ECoin</strong></p>
            </div>
          )}
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mô tả ngắn gọn nội dung môn học:</p>
          <textarea
            value={batchDescription}
            onChange={(e) => setBatchDescription(e.target.value)}
            placeholder="VD: Toán lớp 9 chương trình mới, tập trung vào hình học..."
            style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
          />
          {batchResult && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: batchResult.includes('Đã tạo') ? '#ecfdf5' : '#fef2f2', color: batchResult.includes('Đã tạo') ? '#065f46' : '#991b1b', fontSize: 13 }}>
              {batchResult}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchAIOpen(false)}>Đóng</Button>
          <Button variant="contained" onClick={handleBatchAI} disabled={batchLoading || !batchCostInfo || batchCostInfo.uncachedCount === 0}>
            {batchLoading ? 'Đang xử lý...' : 'Gợi ý AI'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmModal
        open={deleteLessonTarget !== null}
        title="Xóa bài học"
        message="Bạn có chắc chắn muốn xóa bài học này?"
        confirmLabel="Xóa"
        onConfirm={() => { if (deleteLessonTarget !== null) handleDeleteLesson(deleteLessonTarget); }}
        onCancel={() => setDeleteLessonTarget(null)}
      />

    </Box>
  );
}
