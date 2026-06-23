import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { SharedLessonPlan } from '../../types/lessonPlan';
import type { ApiError } from '../../types/common';
import * as lessonPlanService from '../../services/lessonPlanService';

export default function SharedLessonPlansPage() {
  const [plans, setPlans] = useState<SharedLessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // Filter state
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

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
              <th style={thStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 16 }}>
                  Chưa có giáo án được chia sẻ
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id}>
                  <td style={tdStyle}>{plan.subject}</td>
                  <td style={tdStyle}>{plan.grade}</td>
                  <td style={tdStyle}>{plan.schoolYearStart} - {plan.schoolYearEnd}</td>
                  <td style={tdStyle}>{plan.lessonCount}</td>
                  <td style={tdStyle}>{plan.lecturerName}</td>
                  <td style={tdStyle}>
                    {savedIds.has(plan.id) ? (
                      <span style={{ color: 'green', fontWeight: 600 }}>Đã lưu</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCopy(plan.id)}
                        disabled={savingId === plan.id}
                        style={{
                          padding: '6px 14px',
                          cursor: savingId === plan.id ? 'not-allowed' : 'pointer',
                          borderRadius: 8,
                          backgroundColor: '#1976d2',
                          color: 'white',
                          border: 'none',
                          opacity: savingId === plan.id ? 0.6 : 1,
                        }}
                      >
                        {savingId === plan.id ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
