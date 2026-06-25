import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import type { ApiError } from '../../types/common';
import * as adminService from '../../services/adminCurriculumTemplateService';
import type {
  CurriculumTemplate,
  CurriculumTemplateLesson,
} from '../../types/curriculumTemplate';
import Pagination, { usePagination } from '../../components/common/Pagination';

interface DialogState {
  mode: 'create' | 'edit' | 'view' | null;
  template?: CurriculumTemplate;
}

interface LessonRow {
  chapterName: string;
  lessonName: string;
  suggestedPeriods: number;
}

export default function CurriculumTemplateManagementPage() {
  const [templates, setTemplates] = useState<CurriculumTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState<number | ''>('');

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>({ mode: null });

  // Delete state (confirmation handled by Task 7.3)
  const [deleteTarget, setDeleteTarget] = useState<CurriculumTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { paginatedItems, currentPage, pageSize, totalItems, setCurrentPage, setPageSize } = usePagination(templates);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getTemplates(
        filterSubject || undefined,
        filterGrade || undefined,
        'system',
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

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await adminService.deleteTemplate(deleteTarget.id);
      setDeleteTarget(null);
      await loadTemplates();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  }

  return (
    <div style={pageStyle}>
      {/* Hero Section */}
      <div style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Curriculum Template</p>
          <h1 style={titleStyle}>Quản lý Mẫu Giáo Án</h1>
          <p style={subtitleStyle}>
            Quản lý mẫu giáo án hệ thống. Giáo viên có thể sử dụng các mẫu này cho giáo án của mình.
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
        <>
          <div style={tableShellStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Tên môn</th>
                  <th style={thStyle}>Lớp</th>
                  <th style={thStyle}>Số bài học</th>
                  <th style={thStyle}>Số lần sử dụng</th>
                  <th style={thStyle}>Ngày tạo</th>
                  <th style={thStyle}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((tpl) => {
                  return (
                    <tr key={tpl.id}>
                      <td style={tdStyle}>{tpl.subject}</td>
                      <td style={tdStyle}>{tpl.grade}</td>
                      <td style={tdStyle}>{tpl.lessonCount}</td>
                      <td style={tdStyle}>{tpl.usageCount}</td>
                      <td style={tdStyle}>{formatDate(tpl.createdAt)}</td>
                      <td style={tdStyle}>
                        <div style={actionButtonsStyle}>
                          <button
                            type="button"
                            onClick={() => openViewDialog(tpl)}
                            className="btn btn-neutral"
                            style={actionBtnStyle}
                          >
                            Xem
                          </button>
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination totalItems={totalItems} currentPage={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={modalTitleStyle}>Xác nhận xóa</h2>
            <p style={{ color: '#64748b', marginBottom: 20 }}>
              Xóa mẫu sẽ xóa toàn bộ bài học trong mẫu. Bạn có chắc chắn muốn xóa mẫu{' '}
              <strong>{deleteTarget.subject} - Lớp {deleteTarget.grade}</strong>?
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

      {/* CurriculumTemplateDialog — Full Create/Edit/View implementation */}
      {dialog.mode && (
        <CurriculumTemplateDialog
          mode={dialog.mode}
          template={dialog.template}
          onClose={closeDialog}
          onSaved={async () => {
            closeDialog();
            await loadTemplates();
          }}
        />
      )}
    </div>
  );
}

// ─── CurriculumTemplateDialog Component ─────────────────────────

interface DialogProps {
  mode: 'create' | 'edit' | 'view';
  template?: CurriculumTemplate;
  onClose: () => void;
  onSaved: () => void;
}

function CurriculumTemplateDialog({ mode, template, onClose, onSaved }: DialogProps) {
  const [subject, setSubject] = useState(template?.subject || '');
  const [grade, setGrade] = useState<number>(template?.grade || 1);
  const [sourceNote, setSourceNote] = useState(template?.sourceNote || '');
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  // Lessons state
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsSaving, setLessonsSaving] = useState(false);

  // After create, store the new template id to allow lesson editing
  const [createdTemplateId, setCreatedTemplateId] = useState<number | null>(null);

  const isReadonly = mode === 'view';
  const templateId = createdTemplateId ?? template?.id;

  useEffect(() => {
    if (template && (mode === 'edit' || mode === 'view')) {
      loadLessons(template.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLessons(id: number) {
    setLessonsLoading(true);
    try {
      const data = await adminService.getTemplateLessons(id);
      setLessons(data.map((l) => ({
        chapterName: l.chapterName || '',
        lessonName: l.lessonName,
        suggestedPeriods: l.suggestedPeriods,
      })));
    } catch {
      setDialogError('Không thể tải danh sách bài học.');
    } finally {
      setLessonsLoading(false);
    }
  }

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  async function handleSaveMetadata() {
    setSaving(true);
    setDialogError('');
    try {
      if (mode === 'create' && !createdTemplateId) {
        const created = await adminService.createTemplate({
          subject,
          grade,
          sourceNote: sourceNote || undefined,
          lessons: lessons.length > 0 ? lessons.map((l, i) => ({
            orderIndex: i + 1,
            chapterName: l.chapterName || undefined,
            lessonName: l.lessonName,
            suggestedPeriods: l.suggestedPeriods,
          })) : undefined,
        });
        setCreatedTemplateId(created.id);
        onSaved();
      } else if (mode === 'edit' && template) {
        await adminService.updateTemplate(template.id, {
          subject,
          grade,
          sourceNote: sourceNote || undefined,
        });
        onSaved();
      }
    } catch (err) {
      setDialogError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLessons() {
    if (!templateId) return;
    setLessonsSaving(true);
    setDialogError('');
    try {
      await adminService.updateTemplateLessons(templateId, {
        lessons: lessons.map((l, i) => ({
          orderIndex: i + 1,
          chapterName: l.chapterName || undefined,
          lessonName: l.lessonName,
          suggestedPeriods: l.suggestedPeriods,
        })),
      });
      onSaved();
    } catch (err) {
      setDialogError(extractError(err));
    } finally {
      setLessonsSaving(false);
    }
  }

  function addLessonRow() {
    setLessons([...lessons, { chapterName: '', lessonName: '', suggestedPeriods: 1 }]);
  }

  function removeLessonRow(index: number) {
    setLessons(lessons.filter((_, i) => i !== index));
  }

  function updateLessonRow(index: number, field: keyof LessonRow, value: string | number) {
    setLessons(lessons.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}>
          <h2 style={modalTitleStyle}>
            {mode === 'create' && 'Tạo mẫu giáo án mới'}
            {mode === 'edit' && 'Chỉnh sửa mẫu giáo án'}
            {mode === 'view' && 'Chi tiết mẫu giáo án'}
          </h2>
          <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="Đóng">
            ×
          </button>
        </div>

        {dialogError && (
          <div role="alert" style={alertErrorStyle}>{dialogError}</div>
        )}

        {/* Metadata Form */}
        <div style={formGridStyle}>
          <div style={formFieldStyle}>
            <label style={filterLabelStyle}>Môn học *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isReadonly}
              placeholder="VD: Toán, Ngữ văn..."
              style={inputStyle}
            />
          </div>
          <div style={formFieldStyle}>
            <label style={filterLabelStyle}>Lớp *</label>
            <select
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              disabled={isReadonly}
              style={inputStyle}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>Lớp {g}</option>
              ))}
            </select>
          </div>
          <div style={formFieldStyle}>
            <label style={filterLabelStyle}>Ghi chú nguồn</label>
            <input
              type="text"
              value={sourceNote}
              onChange={(e) => setSourceNote(e.target.value)}
              disabled={isReadonly}
              placeholder="VD: Chương trình GDPT 2018"
              style={inputStyle}
            />
          </div>
        </div>

        {!isReadonly && mode !== 'view' && (
          <div style={{ ...footerActionsStyle, marginTop: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={handleSaveMetadata}
              disabled={saving || !subject}
              className="btn btn-add"
            >
              {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        )}

        {/* Lessons Section */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Danh sách bài học</h3>
            {!isReadonly && (
              <button type="button" onClick={addLessonRow} className="btn btn-neutral" style={{ fontSize: 13 }}>
                Thêm bài
              </button>
            )}
          </div>

          {lessonsLoading ? (
            <p style={{ color: '#64748b' }}>Đang tải bài học...</p>
          ) : lessons.length === 0 ? (
            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có bài học nào.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Chương</th>
                    <th style={thStyle}>Tên bài</th>
                    <th style={thStyle}>Số tiết</th>
                    {!isReadonly && <th style={thStyle}></th>}
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((row, idx) => (
                    <tr key={idx}>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={tdStyle}>
                        {isReadonly ? (
                          row.chapterName || '—'
                        ) : (
                          <input
                            type="text"
                            value={row.chapterName}
                            onChange={(e) => updateLessonRow(idx, 'chapterName', e.target.value)}
                            style={{ ...inputStyle, width: '100%', minWidth: 100 }}
                            placeholder="Chương..."
                          />
                        )}
                      </td>
                      <td style={tdStyle}>
                        {isReadonly ? (
                          row.lessonName
                        ) : (
                          <input
                            type="text"
                            value={row.lessonName}
                            onChange={(e) => updateLessonRow(idx, 'lessonName', e.target.value)}
                            style={{ ...inputStyle, width: '100%', minWidth: 150 }}
                            placeholder="Tên bài *"
                          />
                        )}
                      </td>
                      <td style={tdStyle}>
                        {isReadonly ? (
                          row.suggestedPeriods
                        ) : (
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={row.suggestedPeriods}
                            onChange={(e) => updateLessonRow(idx, 'suggestedPeriods', Number(e.target.value) || 1)}
                            style={{ ...inputStyle, width: 60 }}
                          />
                        )}
                      </td>
                      {!isReadonly && (
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => removeLessonRow(idx)}
                            className="btn btn-delete"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                          >
                            Xóa
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isReadonly && templateId && lessons.length > 0 && (
            <div style={{ ...footerActionsStyle, marginTop: 12 }}>
              <button
                type="button"
                onClick={handleSaveLessons}
                disabled={lessonsSaving || lessons.some((l) => !l.lessonName)}
                className="btn btn-add"
              >
                {lessonsSaving ? 'Đang lưu...' : 'Lưu bài học'}
              </button>
            </div>
          )}
        </div>

        <div style={footerActionsStyle}>
          <button type="button" onClick={onClose} className="btn btn-neutral">
            Đóng
          </button>
        </div>
      </div>
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
  verticalAlign: 'top',
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

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 16,
};

const formFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};
