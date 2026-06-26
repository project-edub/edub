import { useCallback, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import type { ApiError } from '../../types/common';
import * as lecturerService from '../../services/lecturerCurriculumTemplateService';
import type { CurriculumTemplate } from '../../types/curriculumTemplate';
import { useAuth } from '../../hooks/useAuth';

type TemplateCategory = 'system' | 'mine' | 'community';

interface DialogState {
  mode: 'create' | 'edit' | 'view' | null;
  template?: CurriculumTemplate;
}

function getCurrentUserId(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub ? Number(decoded.sub) : null;
  } catch {
    return null;
  }
}

function getTemplateCategory(template: CurriculumTemplate, currentUserId: number | null): TemplateCategory {
  if (template.createdBy === null || template.createdBy === undefined) return 'system';
  if (currentUserId !== null && template.createdBy === currentUserId) return 'mine';
  return 'community';
}

function getCategoryBadge(category: TemplateCategory): { label: string; style: React.CSSProperties } {
  switch (category) {
    case 'system':
      return { label: 'Mẫu hệ thống', style: badgeSystemStyle };
    case 'mine':
      return { label: 'Mẫu của tôi', style: badgeMineStyle };
    case 'community':
      return { label: 'Mẫu cộng đồng', style: badgeCommunityStyle };
  }
}

export default function CurriculumTemplatePage() {
  const { token } = useAuth();
  const currentUserId = useMemo(() => getCurrentUserId(token), [token]);

  const [templates, setTemplates] = useState<CurriculumTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState<number | ''>('');

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>({ mode: null });

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<CurriculumTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await lecturerService.getTemplates(
        filterSubject || undefined,
        filterGrade || undefined,
      );
      setTemplates(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [filterSubject, filterGrade]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  function openCreateDialog() {
    setDialog({ mode: 'create' });
  }

  function openEditDialog(template: CurriculumTemplate) {
    setDialog({ mode: 'edit', template });
  }

  function openViewDialog(template: CurriculumTemplate) {
    setDialog({ mode: 'view', template });
  }

  function closeDialog() {
    setDialog({ mode: null });
  }

  async function handleTogglePublic(template: CurriculumTemplate) {
    setActionLoading(true);
    try {
      await lecturerService.updateTemplate(template.id, { isPublic: !template.isPublic });
      await loadTemplates();
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
      await lecturerService.deleteTemplate(deleteTarget.id);
      setDeleteTarget(null);
      await loadTemplates();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      {/* Hero Section */}
      <div style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Curriculum Template</p>
          <h1 style={titleStyle}>Mẫu Giáo Án</h1>
          <p style={subtitleStyle}>
            Quản lý mẫu giáo án cá nhân, xem mẫu hệ thống và mẫu cộng đồng. Bạn có thể tạo, sửa, xóa mẫu của mình và chia sẻ công khai.
          </p>
        </div>

        <div style={heroActionsStyle}>
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <span style={statValueStyle}>{templates.length}</span>
              <span style={statLabelStyle}>mẫu giáo án</span>
            </div>
          </div>

          <button type="button" onClick={openCreateDialog} className="btn btn-add">
            Tạo mẫu mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <div style={filterFieldStyle}>
          <label style={filterLabelStyle}>Môn học</label>
          <input
            type="text"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            placeholder="Tìm theo môn học..."
            style={inputStyle}
          />
        </div>

        <div style={filterFieldStyle}>
          <label style={filterLabelStyle}>Lớp</label>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value ? Number(e.target.value) : '')}
            style={inputStyle}
          >
            <option value="">Tất cả</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>Lớp {g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" style={alertErrorStyle}>
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={emptyStateStyle}>Đang tải dữ liệu mẫu giáo án...</div>
      ) : templates.length === 0 ? (
        <div style={emptyStateStyle}>
          Không tìm thấy mẫu giáo án nào. Thử thay đổi bộ lọc hoặc tạo mẫu mới.
        </div>
      ) : (
        <div style={tableShellStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Tên môn</th>
                <th style={thStyle}>Lớp</th>
                <th style={thStyle}>Số bài học</th>
                <th style={thStyle}>Loại</th>
                <th style={thStyle}>Công khai</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => {
                const category = getTemplateCategory(tpl, currentUserId);
                const badge = getCategoryBadge(category);
                const isMine = category === 'mine';

                return (
                  <tr key={tpl.id}>
                    <td style={tdStyle}>{tpl.subject}</td>
                    <td style={tdStyle}>{tpl.grade}</td>
                    <td style={tdStyle}>{tpl.lessonCount}</td>
                    <td style={tdStyle}>
                      <span style={badge.style}>{badge.label}</span>
                    </td>
                    <td style={tdStyle}>
                      {isMine ? (
                        <label style={switchLabelStyle}>
                          <input
                            type="checkbox"
                            checked={tpl.isPublic}
                            onChange={() => handleTogglePublic(tpl)}
                            disabled={actionLoading}
                            style={switchInputStyle}
                          />
                          <span style={tpl.isPublic ? switchTrackOnStyle : switchTrackOffStyle}>
                            <span style={tpl.isPublic ? switchThumbOnStyle : switchThumbOffStyle} />
                          </span>
                        </label>
                      ) : (
                        <span style={naStyle}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={actionButtonsStyle}>
                        {isMine ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditDialog(tpl)}
                              disabled={actionLoading}
                              className="btn btn-update"
                              style={actionBtnStyle}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(tpl)}
                              disabled={actionLoading}
                              className="btn btn-delete"
                              style={actionBtnStyle}
                            >
                              Xóa
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openViewDialog(tpl)}
                            className="btn btn-neutral"
                            style={actionBtnStyle}
                          >
                            Xem
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={modalTitleStyle}>Xác nhận xóa</h2>
            <p style={{ color: '#64748b', marginBottom: 20 }}>
              Xóa mẫu sẽ xóa toàn bộ bài học trong mẫu. Bạn có chắc chắn?
            </p>
            <div style={footerActionsStyle}>
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

      {/* CurriculumTemplateDialog placeholder — will be implemented in Task 8.2 */}
      {dialog.mode && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>
                {dialog.mode === 'create' && 'Tạo mẫu giáo án mới'}
                {dialog.mode === 'edit' && 'Chỉnh sửa mẫu giáo án'}
                {dialog.mode === 'view' && 'Chi tiết mẫu giáo án'}
              </h2>
              <button type="button" onClick={closeDialog} style={closeButtonStyle} aria-label="Đóng">
                ×
              </button>
            </div>
            <p style={{ color: '#64748b' }}>
              {dialog.mode === 'view'
                ? 'Xem chi tiết mẫu giáo án (chế độ chỉ đọc).'
                : 'Dialog đầy đủ sẽ được triển khai trong Task 8.2 (CurriculumTemplateDialog).'}
            </p>
            <div style={footerActionsStyle}>
              <button type="button" onClick={closeDialog} className="btn btn-neutral">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  padding: 24,
  background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
};

const heroStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 24,
  alignItems: 'flex-start',
  marginBottom: 20,
  padding: 24,
  borderRadius: 20,
  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  color: '#fff',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontSize: 12,
  color: 'rgba(255,255,255,0.72)',
};

const titleStyle: React.CSSProperties = {
  margin: '8px 0 8px',
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.75)',
  maxWidth: 720,
  lineHeight: 1.6,
};

const heroActionsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 16,
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(1, minmax(84px, 1fr))',
  gap: 10,
};

const statCardStyle: React.CSSProperties = {
  minWidth: 96,
  padding: '12px 14px',
  borderRadius: 16,
  backgroundColor: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  textAlign: 'center',
};

const statValueStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 22,
  fontWeight: 700,
};

const statLabelStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 4,
  fontSize: 12,
  color: 'rgba(255,255,255,0.72)',
};

const filtersStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  marginBottom: 20,
  flexWrap: 'wrap',
  alignItems: 'flex-end',
};

const filterFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 160,
};

const filterLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
  color: '#475569',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
};

const alertErrorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 12,
  backgroundColor: '#fff1f2',
  border: '1px solid #fecdd3',
  color: '#9f1239',
};

const emptyStateStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  border: '1px dashed #cbd5e1',
  backgroundColor: '#f8fafc',
  color: '#475569',
  textAlign: 'center',
};

const tableShellStyle: React.CSSProperties = {
  overflowX: 'auto',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'middle',
};

const actionButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const actionBtnStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 12px',
};

// Badge styles
const badgeBaseStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
};

const badgeSystemStyle: React.CSSProperties = {
  ...badgeBaseStyle,
  backgroundColor: '#fef9c3',
  color: '#854d0e',
  border: '1px solid #fde047',
};

const badgeMineStyle: React.CSSProperties = {
  ...badgeBaseStyle,
  backgroundColor: '#dbeafe',
  color: '#1e40af',
  border: '1px solid #93c5fd',
};

const badgeCommunityStyle: React.CSSProperties = {
  ...badgeBaseStyle,
  backgroundColor: '#dcfce7',
  color: '#166534',
  border: '1px solid #86efac',
};

// Toggle switch styles
const switchLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
};

const switchInputStyle: React.CSSProperties = {
  position: 'absolute',
  opacity: 0,
  width: 0,
  height: 0,
};

const switchTrackBaseStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  width: 40,
  height: 22,
  borderRadius: 11,
  transition: 'background-color 0.2s',
};

const switchTrackOffStyle: React.CSSProperties = {
  ...switchTrackBaseStyle,
  backgroundColor: '#cbd5e1',
};

const switchTrackOnStyle: React.CSSProperties = {
  ...switchTrackBaseStyle,
  backgroundColor: '#3b82f6',
};

const switchThumbBaseStyle: React.CSSProperties = {
  position: 'absolute',
  top: 2,
  width: 18,
  height: 18,
  borderRadius: '50%',
  backgroundColor: '#fff',
  transition: 'left 0.2s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
};

const switchThumbOffStyle: React.CSSProperties = {
  ...switchThumbBaseStyle,
  left: 2,
};

const switchThumbOnStyle: React.CSSProperties = {
  ...switchThumbBaseStyle,
  left: 20,
};

const naStyle: React.CSSProperties = {
  color: '#94a3b8',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: 24,
  borderRadius: 20,
  width: '100%',
  maxWidth: 800,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 18px 50px rgba(15, 23, 42, 0.25)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 16,
};

const modalTitleStyle: React.CSSProperties = {
  margin: 0,
};

const closeButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 28,
  lineHeight: 1,
  color: '#64748b',
};

const footerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  marginTop: 20,
};
