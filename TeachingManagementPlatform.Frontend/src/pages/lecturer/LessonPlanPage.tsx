import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import type { LessonPlanSummary, CreateLessonPlanRequest } from '../../types/lessonPlan';
import type { ApiError } from '../../types/common';
import * as lessonPlanService from '../../services/lessonPlanService';
import LessonPlanModal from '../../components/lecturer/LessonPlanModal';

interface ModalState {
  type: 'create' | 'edit' | null;
  plan?: LessonPlan | null;
}

export default function LessonPlanPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<LessonPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [deleteTarget, setDeleteTarget] = useState<LessonPlanSummary | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter state
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSchoolYear, setFilterSchoolYear] = useState('');

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filterGrade) params.grade = filterGrade;
      if (filterSubject) params.subject = filterSubject;
      if (filterSchoolYear) params.schoolYear = filterSchoolYear;
      const data = await lessonPlanService.getAll(params);
      setPlans(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [filterGrade, filterSubject, filterSchoolYear]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  async function openEditModal(plan: LessonPlanSummary) {
    setActionLoading(true);
    try {
      const full = await lessonPlanService.getById(plan.id);
      setModal({ type: 'edit', plan: full });
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  function openCreateModal() {
    setModal({ type: 'create', plan: null });
  }

  function closeModal() {
    setModal({ type: null });
  }

  async function handleSubmit(data: CreateLessonPlanRequest) {
    setActionLoading(true);
    try {
      if (modal.type === 'create') {
        await lessonPlanService.create(data);
      } else if (modal.type === 'edit' && modal.plan) {
        const updatedPlan = await lessonPlanService.update(modal.plan.id, data);
        if (expandedPlan?.id === updatedPlan.id) {
          setExpandedPlan(updatedPlan);
        }
      }
      closeModal();
      await loadPlans();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await lessonPlanService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadPlans();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  function handleFilter() {
    loadPlans();
  }

  return (
    <div style={{ padding: 24, backgroundColor: 'var(--edub-surface)', color: 'var(--edub-text-primary)', border: '1px solid var(--edub-border)', borderRadius: 16 }}>
      <h1 style={{ marginBottom: 24, color: 'var(--edub-text-primary)' }}>Giáo án</h1>

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
        <div>
          <label htmlFor="filter-year" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Năm học</label>
          <input
            id="filter-year"
            type="text"
            placeholder="Tìm kiếm năm học"
            value={filterSchoolYear}
            onChange={(e) => setFilterSchoolYear(e.target.value)}
            style={{ padding: 8, width: 160, borderRadius: 8, border: '1px solid var(--edub-input-border)', backgroundColor: 'var(--edub-input-bg)', color: 'var(--edub-text-primary)' }}
          />
        </div>
        <button type="button" onClick={handleFilter} className="btn btn-view" style={{ padding: '8px 16px' }}>
          Lọc
        </button>
      </div>

      <button
        type="button"
        onClick={openCreateModal}
        style={{ marginBottom: 16, padding: '8px 16px', cursor: 'pointer', borderRadius: 8, backgroundColor: 'green', color: 'white', border: 'none' }}
        className="btn btn-add"
      >
        Thêm giáo án
      </button>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Môn</th>
              <th style={thStyle}>Khối</th>
              <th style={thStyle}>Niên khóa</th>
              <th style={thStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 16 }}>
                  Không có giáo án nào
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id}>
                  <td style={tdStyle}>{plan.subject}</td>
                  <td style={tdStyle}>{plan.grade}</td>
                  <td style={tdStyle}>{plan.schoolYearStart} - {plan.schoolYearEnd}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => navigate(`/lecturer/lesson-plans/${plan.id}/lessons`)}
                      disabled={actionLoading}
                      className="btn btn-view"
                      style={{ marginRight: 8 }}
                    >
                      Xem
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(plan)}
                      disabled={actionLoading}
                      className="btn btn-update"
                      style={{ marginRight: 8 }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(plan)}
                      disabled={actionLoading}
                      className="btn btn-delete"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Create / Edit Modal */}
      {modal.type && (
        <LessonPlanModal
          mode={modal.type}
          plan={modal.plan}
          loading={actionLoading}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={deleteModalStyle}>
            <h2 style={{ marginBottom: 16 }}>Xác nhận xóa</h2>
            <p style={{ marginBottom: 16 }}>
              Bạn có chắc chắn muốn xóa giáo án <strong>{deleteTarget.subject}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
                className="btn btn-neutral"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="btn btn-delete"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xóa'}
              </button>
            </div>
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

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const deleteModalStyle: React.CSSProperties = {
  backgroundColor: 'var(--edub-surface)',
  color: 'var(--edub-text-primary)',
  border: '1px solid var(--edub-border)',
  padding: 24,
  borderRadius: 8,
  minWidth: 400,
  maxWidth: 500,
};
