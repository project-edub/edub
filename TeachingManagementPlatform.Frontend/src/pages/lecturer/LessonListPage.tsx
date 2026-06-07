
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

  if (loading) return <div style={pageStyle}><p>Đang tải...</p></div>;
  if (error && !plan) return <div style={pageStyle}><p style={{ color: '#d32f2f' }}>{error}</p><button className="btn btn-neutral" onClick={() => navigate('/lecturer/lesson-plans')}>← Quay lại</button></div>;
  if (!plan) return null;

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button type="button" className="btn btn-neutral" onClick={() => navigate('/lecturer/lesson-plans')}>← Quay lại danh sách giáo án</button>
      </div>

      {error && <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}

      <h1 style={{ marginBottom: 4 }}>{plan.subject}</h1>
      <p style={{ color: 'var(--edub-text-secondary)', marginBottom: 20 }}>
        Khối {plan.grade} · Niên khóa {plan.schoolYearStart} – {plan.schoolYearEnd} · {plan.lessons.length} bài học
      </p>

      {/* Add lesson button */}
      <div style={{ marginBottom: 16 }}>
        {adding ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Tên bài học"
              value={newLessonName}
              onChange={(e) => setNewLessonName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddLesson(); }}
              style={{ padding: 8, borderRadius: 6, border: '1px solid var(--edub-border)', flex: 1, maxWidth: 400 }}
              autoFocus
            />
            <button className="btn btn-update" onClick={handleAddLesson} disabled={actionLoading || !newLessonName.trim()}>
              {actionLoading ? 'Đang thêm...' : 'Lưu'}
            </button>
            <button className="btn btn-neutral" onClick={() => { setAdding(false); setNewLessonName(''); }}>Hủy</button>
          </div>
        ) : (
          <button className="btn btn-add" onClick={() => setAdding(true)}>+ Thêm bài học</button>
        )}
      </div>

      {plan.lessons.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--edub-text-secondary)', border: '1px dashed var(--edub-border)', borderRadius: 12 }}>
          Chưa có bài học nào. Nhấn "+ Thêm bài học" để bắt đầu.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plan.lessons
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((lesson, idx) => (
              <div
                key={lesson.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--edub-border)',
                  background: 'var(--edub-surface)',
                  cursor: 'pointer',
                  transition: 'box-shadow 150ms ease',
                }}
                onClick={() => navigate(`/lecturer/lessons/${lesson.id}/edit`)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <div>
                  <span style={{ fontWeight: 700, marginRight: 8, color: 'var(--edub-text-secondary)' }}>
                    {idx + 1}.
                  </span>
                  <span style={{ fontWeight: 600 }}>{lesson.name}</span>
                </div>
                <span style={{ color: 'var(--edub-text-secondary)', fontSize: 13 }}>Xem & sửa →</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: 24, maxWidth: 900, margin: '0 auto' };
