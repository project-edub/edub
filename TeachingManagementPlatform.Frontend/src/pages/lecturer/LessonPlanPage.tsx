import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import type { LessonPlanSummary, LessonPlan, CreateLessonPlanRequest } from '../../types/lessonPlan';
import type { ApiError } from '../../types/common';
import * as lessonPlanService from '../../services/lessonPlanService';
import LessonPlanModal from '../../components/lecturer/LessonPlanModal';
import CrudIcon from '../../components/common/CrudIcon';
import Toast from '../../components/common/Toast';

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
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  // Filter state
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSchoolYear, setFilterSchoolYear] = useState('');

  // Share dialog state
  const [shareDialogPlan, setShareDialogPlan] = useState<LessonPlanSummary | null>(null);
  const [shareCodeResult, setShareCodeResult] = useState<string | null>(null);
  const [shareCodeCopied, setShareCodeCopied] = useState(false);

  // Join by code state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');

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
        await lessonPlanService.update(modal.plan.id, data);
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

  // Share icon click handler
  function handleShareClick(plan: LessonPlanSummary) {
    if (plan.isShared) {
      // Unshare (public)
      handleUnshare(plan);
    } else if (plan.shareCode) {
      // Already has private code, copy it
      navigator.clipboard.writeText(plan.shareCode);
      setToastMessage('Đã sao chép!');
    } else {
      // Open share options dialog
      setShareDialogPlan(plan);
      setShareCodeResult(null);
      setShareCodeCopied(false);
    }
  }

  function handleCancelPrivateShare(plan: LessonPlanSummary) {
    // Clear the shareCode locally - user can regenerate if needed
    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, shareCode: null } : p))
    );
  }

  async function handleUnshare(plan: LessonPlanSummary) {
    setActionLoading(true);
    try {
      const result = await lessonPlanService.toggleShare(plan.id, false);
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isShared: result.isShared } : p))
      );
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleShareAll(plan: LessonPlanSummary) {
    setActionLoading(true);
    try {
      const result = await lessonPlanService.toggleShare(plan.id, true);
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isShared: result.isShared } : p))
      );
      setShareDialogPlan(null);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSharePrivate(plan: LessonPlanSummary) {
    setActionLoading(true);
    try {
      const result = await lessonPlanService.generateShareCode(plan.id);
      setShareCodeResult(result.shareCode);
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, shareCode: result.shareCode } : p))
      );
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  function handleCopyShareCode(code: string) {
    navigator.clipboard.writeText(code);
    setShareCodeCopied(true);
    setToastMessage('Đã sao chép!');
    setTimeout(() => setShareCodeCopied(false), 2000);
  }

  function handleCopyLink(plan: LessonPlanSummary) {
    if (plan.shareCode) {
      navigator.clipboard.writeText(plan.shareCode);
      setToastMessage('Đã sao chép!');
    } else {
      const url = `${window.location.origin}/lecturer/shared-plans?highlight=${plan.id}`;
      navigator.clipboard.writeText(url);
      setToastMessage('Đã sao chép!');
    }
  }

  async function handleJoinByCode() {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinMessage('');
    try {
      const result = await lessonPlanService.joinByCode(joinCode.trim());
      setJoinMessage(`Đã thêm giáo án "${result.subject}" thành công!`);
      setJoinCode('');
      await loadPlans();
      setTimeout(() => setJoinMessage(''), 3000);
    } catch (err) {
      setJoinMessage(extractError(err));
    } finally {
      setJoinLoading(false);
    }
  }

  // Determine which icon to show for a plan
  function getShareIconName(plan: LessonPlanSummary): string {
    if (plan.isShared) return 'close'; // public shared → X to unshare
    if (plan.shareCode) return 'link'; // private code → copy icon
    return 'share'; // not shared → share icon
  }

  function getShareTooltip(plan: LessonPlanSummary): string {
    if (plan.isShared) return 'Bỏ chia sẻ';
    if (plan.shareCode) return 'Sao chép mã';
    return 'Chia sẻ';
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

        {/* Join by code input */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginLeft: 'auto' }}>
          <div>
            <label htmlFor="join-code" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Nhập mã giáo án</label>
            <input
              id="join-code"
              type="text"
              placeholder="Mã 6 ký tự"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoinByCode(); }}
              style={{ padding: 8, width: 120, borderRadius: 8, border: '1px solid var(--edub-input-border)', backgroundColor: 'var(--edub-input-bg)', color: 'var(--edub-text-primary)', textTransform: 'uppercase' }}
              maxLength={6}
            />
          </div>
          <button
            type="button"
            onClick={handleJoinByCode}
            disabled={joinLoading || !joinCode.trim()}
            className="btn btn-view"
            style={{ padding: '8px 12px' }}
          >
            {joinLoading ? '...' : 'Nhập'}
          </button>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 8, backgroundColor: 'green', color: 'white', border: 'none' }}
          className="btn btn-add"
        >
          + Tạo giáo án
        </button>
      </div>

      {joinMessage && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, backgroundColor: joinMessage.includes('thành công') ? '#e8f5e9' : '#fce4ec', color: joinMessage.includes('thành công') ? '#2e7d32' : '#c62828', fontSize: 14 }}>
          {joinMessage}
        </div>
      )}

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
                <tr
                  key={plan.id}
                  style={{ cursor: 'pointer', backgroundColor: hoveredRowId === plan.id ? '#f5f5f5' : undefined, transition: 'background-color 0.15s' }}
                  onMouseEnter={() => setHoveredRowId(plan.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  onDoubleClick={() => navigate(`/lecturer/lesson-plans/${plan.id}/lessons`)}
                >
                  <td style={tdStyle}>{plan.subject}</td>
                  <td style={tdStyle}>{plan.grade}</td>
                  <td style={tdStyle}>{plan.schoolYearStart} - {plan.schoolYearEnd}</td>
                  <td style={tdStyle}>
                    <CrudIcon
                      name={getShareIconName(plan)}
                      tooltip={getShareTooltip(plan)}
                      onClick={() => handleShareClick(plan)}
                      disabled={actionLoading}
                    />
                    {!plan.isShared && plan.shareCode && (
                      <CrudIcon
                        name="close"
                        tooltip="Hủy chia sẻ"
                        onClick={() => handleCancelPrivateShare(plan)}
                        disabled={actionLoading}
                      />
                    )}
                    <CrudIcon name="edit" tooltip="Sửa" onClick={() => openEditModal(plan)} disabled={actionLoading} />
                    <CrudIcon name="delete" tooltip="Xóa" onClick={() => setDeleteTarget(plan)} disabled={actionLoading} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Share Options Dialog */}
      {shareDialogPlan && !shareCodeResult && (
        <div style={overlayStyle}>
          <div style={deleteModalStyle}>
            <h2 style={{ marginBottom: 16 }}>Chia sẻ giáo án</h2>
            <p style={{ marginBottom: 16, color: 'var(--edub-text-secondary)' }}>
              Chọn hình thức chia sẻ cho giáo án <strong>{shareDialogPlan.subject}</strong>:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                onClick={() => handleShareAll(shareDialogPlan)}
                disabled={actionLoading}
                className="btn btn-update"
                style={{ padding: '12px 16px', textAlign: 'left' }}
              >
                Chia sẻ cho tất cả giáo viên
              </button>
              <button
                type="button"
                onClick={() => handleSharePrivate(shareDialogPlan)}
                disabled={actionLoading}
                className="btn btn-view"
                style={{ padding: '12px 16px', textAlign: 'left' }}
              >
                Chia sẻ riêng tư (tạo mã)
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShareDialogPlan(null)}
                className="btn btn-neutral"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Code Result Dialog */}
      {shareDialogPlan && shareCodeResult && (
        <div style={overlayStyle}>
          <div style={deleteModalStyle}>
            <h2 style={{ marginBottom: 16 }}>Mã chia sẻ</h2>
            <p style={{ marginBottom: 12, color: 'var(--edub-text-secondary)' }}>
              Mã chia sẻ giáo án <strong>{shareDialogPlan.subject}</strong>:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 4, padding: '8px 16px', backgroundColor: '#f5f5f5', borderRadius: 8, border: '1px solid #ddd' }}>
                {shareCodeResult}
              </span>
              <button
                type="button"
                onClick={() => handleCopyShareCode(shareCodeResult)}
                className="btn btn-view"
                style={{ padding: '8px 12px' }}
              >
                {shareCodeCopied ? 'Đã sao chép!' : 'Sao chép mã'}
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--edub-text-secondary)', marginBottom: 16 }}>
              Chia sẻ mã này cho giáo viên khác. Họ có thể nhập mã để nhận giáo án của bạn.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShareDialogPlan(null); setShareCodeResult(null); }}
                className="btn btn-neutral"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
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

      <Toast message={toastMessage} visible={!!toastMessage} onClose={() => setToastMessage('')} />
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
