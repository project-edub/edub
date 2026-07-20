import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AxiosError } from 'axios';
import { Box } from '@mui/material';
import type { ApiError } from '../../types/common';
import * as scoreTemplateService from '../../services/scoreTemplateService';
import type {
  ScoreTemplate,
  ScoreTemplateColumn,
} from '../../services/scoreTemplateService';
import Pagination, { usePagination } from '../../components/common/Pagination';
import AdminPanelBanner from '../../components/common/AdminPanelBanner';

interface ModalState {
  type: 'create' | 'edit' | null;
  template?: ScoreTemplate;
}

interface ColumnFormRow {
  name: string;
  coefficient: string;
  isAverageColumn: boolean;
}

export default function ScoreTemplateManager() {
  const [templates, setTemplates] = useState<ScoreTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [deleteTarget, setDeleteTarget] = useState<ScoreTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formColumns, setFormColumns] = useState<ColumnFormRow[]>([]);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { paginatedItems, currentPage, pageSize, totalItems, setCurrentPage, setPageSize } = usePagination(templates);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await scoreTemplateService.getScoreTemplates();
      setTemplates(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  function resetForm(template?: ScoreTemplate) {
    if (template) {
      setFormName(template.name);
      setFormSubject(template.subject);
      setFormColumns(
        template.columns
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((col) => ({
            name: col.name,
            coefficient: col.coefficient !== null ? String(col.coefficient) : '',
            isAverageColumn: col.isAverageColumn,
          })),
      );
    } else {
      setFormName('');
      setFormSubject('');
      setFormColumns([]);
    }
    setFormError('');
    setFieldErrors({});
  }

  function openCreateModal() {
    resetForm();
    setModal({ type: 'create' });
  }

  function openEditModal(template: ScoreTemplate) {
    resetForm(template);
    setModal({ type: 'edit', template });
  }

  function closeModal() {
    setModal({ type: null });
    setFormError('');
    setFieldErrors({});
  }

  // Column management
  function addColumn() {
    setFormColumns((prev) => [
      ...prev,
      { name: '', coefficient: '1', isAverageColumn: false },
    ]);
  }

  function removeColumn(index: number) {
    setFormColumns((prev) => prev.filter((_, i) => i !== index));
  }

  function updateColumn(index: number, field: keyof ColumnFormRow, value: string | boolean) {
    setFormColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, [field]: value } : col)),
    );
  }

  function moveColumnUp(index: number) {
    if (index === 0) return;
    setFormColumns((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveColumnDown(index: number) {
    setFormColumns((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formName.trim()) {
      errors.name = 'Tên template không được để trống';
    }
    if (!formSubject.trim()) {
      errors.subject = 'Môn học không được để trống';
    }
    if (formColumns.length === 0) {
      errors.columns = 'Cần ít nhất một cột điểm';
    }

    for (let i = 0; i < formColumns.length; i++) {
      const col = formColumns[i];
      if (!col.name.trim()) {
        errors[`col_${i}_name`] = `Tên cột ${i + 1} không được để trống`;
      }
      if (col.coefficient.trim() !== '' && !col.isAverageColumn) {
        const coeff = Number(col.coefficient);
        if (Number.isNaN(coeff) || coeff < 1 || !Number.isInteger(coeff)) {
          errors[`col_${i}_coeff`] = `Hệ số cột ${i + 1} phải là số nguyên dương`;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildColumnsPayload(): ScoreTemplateColumn[] {
    return formColumns.map((col, index) => ({
      name: col.name.trim(),
      coefficient: col.isAverageColumn
        ? null
        : col.coefficient.trim() === ''
          ? null
          : Number(col.coefficient),
      isAverageColumn: col.isAverageColumn,
      sortOrder: index,
    }));
  }

  async function submitTemplate(mode: 'create' | 'edit', template?: ScoreTemplate) {
    if (mode === 'edit' && !template) return;

    setFormError('');
    setFieldErrors({});

    if (!validateForm()) return;

    const data = {
      name: formName.trim(),
      subject: formSubject.trim(),
      columns: buildColumnsPayload(),
    };

    setActionLoading(true);
    try {
      if (mode === 'create') {
        await scoreTemplateService.createScoreTemplate(data);
      } else if (template) {
        await scoreTemplateService.updateScoreTemplate(template.id, data);
      }
      closeModal();
      await loadTemplates();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setActionLoading(true);
    try {
      await scoreTemplateService.deleteScoreTemplate(deleteTarget.id);
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
    <Box sx={{ ...pageStyle, p: { xs: 1.5, md: 3 } }}>
      <AdminPanelBanner>
        <div>
          <p style={eyebrowStyle}>Score Template</p>
          <h1 style={titleStyle}>Quản lý Template Điểm</h1>
          <p style={subtitleStyle}>
            Tạo và quản lý các template cấu hình cột điểm theo môn học. Giáo viên sẽ chọn template khi tạo bảng điểm mới.
          </p>
        </div>

        <Box sx={{ ...heroActionsStyle, width: { xs: '100%', md: 'auto' } }}>
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <span style={statValueStyle}>{templates.length}</span>
              <span style={statLabelStyle}>template</span>
            </div>
          </div>

          <button type="button" onClick={openCreateModal} className="btn btn-add" style={{ minHeight: 44 }}>
            Thêm template
          </button>
        </Box>
      </AdminPanelBanner>

      {error && (
        <div role="alert" style={alertErrorStyle}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={emptyStateStyle}>Đang tải dữ liệu template...</div>
      ) : templates.length === 0 ? (
        <div style={emptyStateStyle}>
          Chưa có template nào. Tạo template đầu tiên để giáo viên có thể nhanh chóng thiết lập bảng điểm.
        </div>
      ) : (
        <>
          <div style={tableShellStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Tên template</th>
                  <th style={thStyle}>Môn học</th>
                  <th style={thStyle}>Số cột</th>
                  <th style={thStyle}>Cấu hình cột</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((tpl) => (
                  <tr key={tpl.id}>
                    <td style={tdStyle}>{tpl.name}</td>
                    <td style={tdStyle}>{tpl.subject}</td>
                    <td style={tdStyle}>{tpl.columns.length}</td>
                    <td style={tdStyle}>
                      <div style={columnChipsStyle}>
                        {tpl.columns
                          .slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((col, idx) => (
                            <span key={idx} style={col.isAverageColumn ? chipAvgStyle : chipStyle}>
                              {col.name}
                              {col.coefficient !== null && ` (×${col.coefficient})`}
                              {col.isAverageColumn && ' [ĐTB]'}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={actionButtonsStyle}>
                        <button
                          type="button"
                          onClick={() => openEditModal(tpl)}
                          disabled={actionLoading}
                          className="btn btn-update"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(tpl)}
                          disabled={actionLoading}
                          className="btn btn-delete"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination totalItems={totalItems} currentPage={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* Create/Edit Modal */}
      {modal.type && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={modalTitleStyle}>
                  {modal.type === 'create' ? 'Tạo template mới' : 'Chỉnh sửa template'}
                </h2>
                <p style={modalSubtitleStyle}>
                  Cấu hình tên, môn học và danh sách cột điểm cho template.
                </p>
              </div>
              <button type="button" onClick={closeModal} style={closeButtonStyle} aria-label="Đóng">
                ×
              </button>
            </div>

            {formError && <div role="alert" style={alertErrorStyle}>{formError}</div>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modal.type) {
                  void submitTemplate(modal.type, modal.template);
                }
              }}
              noValidate
            >
              <div style={formGridStyle}>
                <Field label="Tên template" error={fieldErrors.name}>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={inputStyle}
                    placeholder="Ví dụ: Toán THCS HK1"
                  />
                </Field>
                <Field label="Môn học" error={fieldErrors.subject}>
                  <input
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    style={inputStyle}
                    placeholder="Ví dụ: Toán, Văn, Anh..."
                  />
                </Field>
              </div>

              {/* Columns section */}
              <section style={sectionBlockStyle}>
                <div style={sectionHeaderStyle}>
                  <strong>Danh sách cột điểm</strong>
                  <button type="button" onClick={addColumn} className="btn btn-add" style={addColumnBtnStyle}>
                    + Thêm cột
                  </button>
                </div>

                {fieldErrors.columns && (
                  <span style={fieldErrorStyle}>{fieldErrors.columns}</span>
                )}

                {formColumns.length === 0 ? (
                  <p style={emptyColumnsStyle}>Chưa có cột nào. Nhấn "Thêm cột" để bắt đầu.</p>
                ) : (
                  <div style={columnsListStyle}>
                    {formColumns.map((col, index) => (
                      <div key={index} style={columnRowStyle}>
                        <div style={columnOrderStyle}>
                          <button
                            type="button"
                            onClick={() => moveColumnUp(index)}
                            disabled={index === 0}
                            style={arrowBtnStyle}
                            title="Di chuyển lên"
                          >
                            ▲
                          </button>
                          <span style={orderLabelStyle}>{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => moveColumnDown(index)}
                            disabled={index === formColumns.length - 1}
                            style={arrowBtnStyle}
                            title="Di chuyển xuống"
                          >
                            ▼
                          </button>
                        </div>

                        <div style={columnFieldsStyle}>
                          <Field label="Tên cột" error={fieldErrors[`col_${index}_name`]}>
                            <input
                              value={col.name}
                              onChange={(e) => updateColumn(index, 'name', e.target.value)}
                              style={inputStyle}
                              placeholder="Miệng, 15p, 1 Tiết..."
                            />
                          </Field>
                          <Field label="Hệ số" error={fieldErrors[`col_${index}_coeff`]}>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={col.coefficient}
                              onChange={(e) => updateColumn(index, 'coefficient', e.target.value)}
                              style={inputStyle}
                              disabled={col.isAverageColumn}
                              placeholder="1, 2, 3..."
                            />
                          </Field>
                          <label style={checkboxLabelStyle}>
                            <input
                              type="checkbox"
                              checked={col.isAverageColumn}
                              onChange={(e) => updateColumn(index, 'isAverageColumn', e.target.checked)}
                            />
                            <span>Cột ĐTB</span>
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeColumn(index)}
                          style={removeColumnBtnStyle}
                          title="Xóa cột"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div style={footerActionsStyle}>
                <button type="button" onClick={closeModal} disabled={actionLoading} className="btn btn-neutral">
                  Hủy
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-update">
                  {actionLoading
                    ? 'Đang xử lý...'
                    : modal.type === 'create'
                      ? 'Tạo template'
                      : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={modalTitleStyle}>Xác nhận xóa</h2>
            <p style={{ ...modalSubtitleStyle, marginBottom: 20 }}>
              Bạn có chắc chắn muốn xóa template <strong>{deleteTarget.name}</strong>?
              Thao tác này không thể hoàn tác.
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
    </Box>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label style={fieldWrapperStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
      {error && <span style={fieldErrorStyle}>{error}</span>}
    </label>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
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

const columnChipsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
};

const chipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 8,
  backgroundColor: '#e2e8f0',
  fontSize: 13,
  color: '#334155',
};

const chipAvgStyle: React.CSSProperties = {
  ...chipStyle,
  backgroundColor: '#dbeafe',
  color: '#1e40af',
  fontWeight: 600,
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

const modalSubtitleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  color: '#64748b',
};

const closeButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 28,
  lineHeight: 1,
  color: '#64748b',
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
};

const sectionBlockStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
};

const addColumnBtnStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 12px',
};

const emptyColumnsStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 14,
  textAlign: 'center',
  padding: '12px 0',
};

const columnsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const columnRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: 12,
  borderRadius: 12,
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
};

const columnOrderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  minWidth: 32,
  paddingTop: 4,
};

const arrowBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  padding: 2,
  color: '#475569',
  lineHeight: 1,
};

const orderLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#64748b',
};

const columnFieldsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  flex: 1,
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  paddingTop: 28,
  fontSize: 14,
  whiteSpace: 'nowrap',
};

const removeColumnBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 18,
  color: '#ef4444',
  paddingTop: 4,
  lineHeight: 1,
};

const footerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  marginTop: 20,
};

const fieldWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const fieldLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
};

const fieldErrorStyle: React.CSSProperties = {
  color: '#b91c1c',
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
};
