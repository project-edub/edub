import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { SharedLessonPlan } from '../../types/lessonPlan';
import type { ApiError } from '../../types/common';
import * as lessonPlanService from '../../services/lessonPlanService';
import ActionButton from '../../components/common/ActionButton';
import Pagination, { usePagination } from '../../components/common/Pagination';

export default function SharedLessonPlansPage() {
  const [plans, setPlans] = useState<SharedLessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [detailPlan, setDetailPlan] = useState<{ id: number; subject: string; grade: string; schoolYearStart: string; schoolYearEnd: string; lecturerName: string; lessons: { id: number; name: string; orderIndex: number }[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

  // Filter state
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  const { paginatedItems: paginatedPlans, currentPage, pageSize, totalItems, setCurrentPage, setPageSize } = usePagination(plans);

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await lessonPlanService.getSharedPlans(
        filterSubject || undefined,
        filterGrade || undefined
      );
      setPlans(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [filterSubject, filterGrade]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  async function handleCopy(planId: number) {
    setSavingId(planId);
    try {
      await lessonPlanService.copySharedPlan(planId);
      setSavedIds((prev) => new Set(prev).add(planId));
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleViewDetail(planId: number) {
    setDetailLoading(true);
    setDetailPlan(null);
    try {
      const data = await lessonPlanService.getSharedPlanDetail(planId);
      setDetailPlan(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setDetailLoading(false);
    }
  }

  function handleFilter() {
    loadPlans();
  }

  return (
    <div style={{ padding: 24, backgroundColor: 'var(--edub-surface)', color: 'var(--edub-text-primary)', border: '1px solid var(--edub-border)', borderRadius: 16 }}>
      <h1 style={{ marginBottom: 24, color: 'var(--edub-text-primary)' }}>Giáo án cộng đồng</h1>

      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Filter controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label htmlFor="filter-subject" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Môn học</label>
          <input
            id="filter-subject"
            type="text"
            placeholder="Tìm kiếm môn học"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            style={{ padding: 8, width: 160, borderRadius: 8, border: '1px solid var(--edub-input-border)', backgroundColor: 'var(--edub-input-bg)', color: 'var(--edub-text-primary)' }}
          />
        </div>
        <div>
          <label htmlFor="filter-grade" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Khối lớp</label>
          <input
            id="filter-grade"
            type="text"
            placeholder="Tìm kiếm khối"
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            style={{ padding: 8, width: 160, borderRadius: 8, border: '1px solid var(--edub-input-border)', backgroundColor: 'var(--edub-input-bg)', color: 'var(--edub-text-primary)' }}
          />
        </div>
        <button type="button" onClick={handleFilter} className="btn btn-view" style={{ padding: '8px 16px' }}>
          Lọc
        </button>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Môn</th>
              <th style={thStyle}>Khối</th>
              <th style={thStyle}>Niên khóa</th>
              <th style={thStyle}>Số bài</th>
              <th style={thStyle}>Giảng viên</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlans.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 16 }}>
                  Chưa có giáo án được chia sẻ
                </td>
              </tr>
            ) : (
              paginatedPlans.map((plan) => (
                <tr
                  key={plan.id}
                  onClick={() => handleViewDetail(plan.id)}
                  onMouseEnter={() => setHoveredRowId(plan.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  style={{ cursor: 'pointer', backgroundColor: hoveredRowId === plan.id ? 'var(--edub-hover-bg, #f1f5f9)' : undefined, transition: 'background-color 150ms ease' }}
                >
                  <td style={tdStyle}>{plan.subject}</td>
                  <td style={tdStyle}>{plan.grade}</td>
                  <td style={tdStyle}>{plan.schoolYearStart} - {plan.schoolYearEnd}</td>
                  <td style={tdStyle}>{plan.lessonCount}</td>
                  <td style={tdStyle}>{plan.lecturerName}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    {savedIds.has(plan.id) ? (
                      <span style={{ color: 'green', fontWeight: 600, fontSize: 12 }}>✓ Đã lưu</span>
                    ) : (
                      <ActionButton icon="save" label="Lưu" color="success" onClick={() => handleCopy(plan.id)} disabled={savingId === plan.id} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <Pagination
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Detail dialog */}
      {(detailPlan || detailLoading) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setDetailPlan(null)}>
          <div style={{ background: 'var(--edub-surface, #fff)', borderRadius: 16, padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto', color: 'var(--edub-text-primary)' }} onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <p>Đang tải...</p>
            ) : detailPlan && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0 }}>Chi tiết giáo án</h2>
                  <button type="button" onClick={() => setDetailPlan(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--edub-text-primary)' }}>×</button>
                </div>
                <p><strong>Môn:</strong> {detailPlan.subject} | <strong>Lớp:</strong> {detailPlan.grade} | <strong>Niên khóa:</strong> {detailPlan.schoolYearStart} - {detailPlan.schoolYearEnd}</p>
                <p><strong>Giảng viên:</strong> {detailPlan.lecturerName}</p>
                <h3 style={{ marginTop: 16, marginBottom: 8 }}>Danh sách bài học ({detailPlan.lessons.length})</h3>
                {detailPlan.lessons.length === 0 ? (
                  <p style={{ color: '#94a3b8' }}>Chưa có bài học</p>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {detailPlan.lessons.map((l) => (
                      <li key={l.id} style={{ padding: '4px 0' }}>{l.name}</li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid var(--edub-border)',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--edub-border)',
};
