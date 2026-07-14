import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
} from '@mui/material';
import type { LessonPlanSummary, LessonPlan, CreateLessonPlanRequest } from '../../types/lessonPlan';
import type { ApiError } from '../../types/common';
import * as lessonPlanService from '../../services/lessonPlanService';
import LessonPlanModal from '../../components/lecturer/LessonPlanModal';
import ActionButton from '../../components/common/ActionButton';
import Toast from '../../components/common/Toast';
import Pagination, { usePagination } from '../../components/common/Pagination';
import InlineHint from '../../components/common/InlineHint';
import { GRADE_OPTIONS } from '../../constants/lessonPlanOptions';

interface ModalState {
  type: 'create' | 'edit' | null;
  plan?: LessonPlan | null;
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--edub-border)' };
const tdStyle: React.CSSProperties = { padding: '12px', borderBottom: '1px solid var(--edub-border)' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' };
const deleteModalStyle: React.CSSProperties = { width: 'min(420px, calc(100% - 24px))', boxSizing: 'border-box', padding: 24, borderRadius: 12, backgroundColor: 'var(--edub-surface)', border: '1px solid var(--edub-border)' };

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

  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSchoolYear, setFilterSchoolYear] = useState('');
  const schoolYearOptions = Array.from(new Set(plans.map((plan) => `${plan.schoolYearStart}-${plan.schoolYearEnd}`))).sort().reverse();

  // Share dialog state
  const [shareDialogPlan, setShareDialogPlan] = useState<LessonPlanSummary | null>(null);
  const [shareCodeResult, setShareCodeResult] = useState<string | null>(null);
  const [shareCodeCopied, setShareCodeCopied] = useState(false);

  // Join by code state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');

  const { paginatedItems: paginatedPlans, currentPage, pageSize, totalItems, setCurrentPage, setPageSize } = usePagination(plans);

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
  void handleCopyLink; // reserved for future use

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

  function getShareTooltip(plan: LessonPlanSummary): string {
    if (plan.isShared) return 'Bỏ chia sẻ';
    if (plan.shareCode) return 'Sao chép mã';
    return 'Chia sẻ';
  }

  return (
    <div style={{ padding: 24, backgroundColor: 'var(--edub-surface)', color: 'var(--edub-text-primary)', border: '1px solid var(--edub-border)', borderRadius: 16 }}>
      <h1 style={{ marginBottom: 24, color: 'var(--edub-text-primary)' }}>
        Giáo án
        <InlineHint text="Tạo giáo án mới hoặc sử dụng mẫu có sẵn từ cộng đồng" />
      </h1>

      {error && (
        <Typography role="alert" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Filter controls — stack on mobile */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          mb: 2,
          flexWrap: 'wrap',
          alignItems: { xs: 'stretch', sm: 'flex-end' },
        }}
      >
        <TextField
          id="filter-subject"
          label="Môn học"
          placeholder="Tìm kiếm môn học"
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          size="small"
          sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' } }}
        />
        <TextField
          id="filter-grade"
          label="Khối lớp"
          select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          size="small"
          sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' } }}
        >
          <MenuItem value="">Tất cả khối</MenuItem>
          {GRADE_OPTIONS.map((grade) => <MenuItem key={grade} value={grade}>{grade}</MenuItem>)}
        </TextField>
        <TextField
          id="filter-year"
          label="Năm học"
          select
          value={filterSchoolYear}
          onChange={(e) => setFilterSchoolYear(e.target.value)}
          size="small"
          sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' } }}
        >
          <MenuItem value="">Tất cả năm học</MenuItem>
          {schoolYearOptions.map((schoolYear) => <MenuItem key={schoolYear} value={schoolYear}>{schoolYear}</MenuItem>)}
        </TextField>
        <Button
          variant="outlined"
          onClick={() => loadPlans()}
          sx={{ minHeight: 44, alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          Lọc
        </Button>

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
      </Box>

      {joinMessage && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, backgroundColor: joinMessage.includes('thành công') ? '#e8f5e9' : '#fce4ec', color: joinMessage.includes('thành công') ? '#2e7d32' : '#c62828', fontSize: 14 }}>
          {joinMessage}
        </div>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : plans.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4 }} color="text.secondary">
          Không có giáo án nào
        </Typography>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Môn</th>
              <th style={thStyle}>Khối</th>
              <th style={thStyle}>Niên khóa</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlans.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 16 }}>
                  Không có giáo án nào
                </td>
              </tr>
            ) : (
              paginatedPlans.map((plan) => (
                <tr
                  key={plan.id}
                  style={{ cursor: 'pointer', backgroundColor: hoveredRowId === plan.id ? '#f5f5f5' : undefined, transition: 'background-color 0.15s' }}
                  onMouseEnter={() => setHoveredRowId(plan.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  onClick={() => navigate(`/lecturer/lesson-plans/${plan.id}/lessons`)}
                >
                  <td style={tdStyle}>{plan.subject}</td>
                  <td style={tdStyle}>{plan.grade}</td>
                  <td style={tdStyle}>{plan.schoolYearStart} - {plan.schoolYearEnd}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <ActionButton icon="share" label={getShareTooltip(plan)} color="primary" onClick={() => handleShareClick(plan)} disabled={actionLoading} />
                      {!plan.isShared && plan.shareCode && (
                        <ActionButton icon="close" label="Hủy chia sẻ" color="default" onClick={() => handleCancelPrivateShare(plan)} disabled={actionLoading} />
                      )}
                      <ActionButton icon="edit" label="Sửa" color="primary" onClick={() => openEditModal(plan)} disabled={actionLoading} />
                      <ActionButton icon="delete" label="Xóa" color="error" onClick={() => setDeleteTarget(plan)} disabled={actionLoading} />
                    </div>
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

      {/* Share Options Dialog */}
      {shareDialogPlan && !shareCodeResult && (
        <div style={overlayStyle}>
          <div style={deleteModalStyle}>
            <h2 style={{ marginBottom: 16 }}>
              Chia sẻ giáo án
              <InlineHint text="Chia sẻ giáo án để đồng nghiệp có thể tham khảo" />
            </h2>
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
