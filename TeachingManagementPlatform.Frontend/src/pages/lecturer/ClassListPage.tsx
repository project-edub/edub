import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import type { ClassDetail, CreateClassRequest, UpdateClassRequest } from '../../types/class';
import type { ApiError } from '../../types/common';
import * as classService from '../../services/classService';
import CrudIcon from '../../components/common/CrudIcon';
import Pagination, { usePagination } from '../../components/common/Pagination';

interface ModalState {
  type: 'create' | 'edit' | null;
  cls?: ClassDetail;
}

export default function ClassListPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [deleteTarget, setDeleteTarget] = useState<ClassDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

  const { paginatedItems: paginatedClasses, currentPage, pageSize, totalItems, setCurrentPage, setPageSize } = usePagination(classes);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formError, setFormError] = useState('');

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await classService.getAll();
      setClasses(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  function openCreateModal() {
    setFormName('');
    setFormYear('');
    setFormError('');
    setModal({ type: 'create' });
  }

  function openEditModal(cls: ClassDetail) {
    setFormName(cls.name);
    setFormYear(cls.year);
    setFormError('');
    setModal({ type: 'edit', cls });
  }

  function closeModal() {
    setModal({ type: null });
    setFormError('');
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formYear.trim()) {
      setFormError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setActionLoading(true);
    try {
      const data: CreateClassRequest = {
        name: formName.trim(),
        year: formYear.trim(),
      };
      await classService.create(data);
      closeModal();
      await loadClasses();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!modal.cls) return;
    setFormError('');

    if (!formName.trim() || !formYear.trim()) {
      setFormError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setActionLoading(true);
    try {
      const data: UpdateClassRequest = {
        name: formName.trim(),
        year: formYear.trim(),
      };
      await classService.update(modal.cls.id, data);
      closeModal();
      await loadClasses();
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
      await classService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadClasses();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: 'var(--edub-text-primary)' }}>Danh sách lớp học</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn btn-add"
          style={{ borderRadius: 8 }}
        >
          + Thêm lớp
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Tên lớp</th>
                <th style={thStyle}>Năm học</th>
                <th style={thStyle}>Số học sinh</th>
                <th style={thStyle}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 16 }}>
                    Không có lớp học nào
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((cls) => (
                  <tr
                    key={cls.id}
                    style={{ cursor: 'pointer', backgroundColor: hoveredRowId === cls.id ? '#f5f5f5' : undefined, transition: 'background-color 0.15s' }}
                    onMouseEnter={() => setHoveredRowId(cls.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    onDoubleClick={() => navigate(`/lecturer/classes/${cls.id}`)}
                  >
                    <td style={tdStyle}>{cls.name}</td>
                    <td style={tdStyle}>{cls.year}</td>
                    <td style={tdStyle}>{cls.studentCount}</td>
                    <td style={tdStyle}>
                      <CrudIcon name="edit" tooltip="Sửa" onClick={() => openEditModal(cls)} disabled={actionLoading} />
                      <CrudIcon name="delete" tooltip="Xóa" onClick={() => setDeleteTarget(cls)} disabled={actionLoading} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination totalItems={totalItems} currentPage={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* Create / Edit Modal */}
      {modal.type && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>
              {modal.type === 'create' ? 'Thêm lớp học' : 'Sửa lớp học'}
            </h2>

            {formError && (
              <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
                {formError}
              </div>
            )}

            <form onSubmit={modal.type === 'create' ? handleCreateSubmit : handleEditSubmit} noValidate>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="modal-name" style={{ display: 'block', marginBottom: 4 }}>Tên lớp</label>
                <input
                  id="modal-name"
                  type="text"
                  placeholder="Nhập tên lớp"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="modal-year" style={{ display: 'block', marginBottom: 4 }}>Năm học</label>
                <input
                  id="modal-year"
                  type="text"
                  placeholder="Nhập năm học (vd: 2024-2025)"
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={actionLoading}
                  className="btn btn-neutral"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-update"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Lưu'}
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
            <h2 style={{ marginBottom: 16 }}>Xác nhận xóa</h2>
            <p style={{ marginBottom: 16 }}>
              Bạn có chắc chắn muốn xóa lớp <strong>{deleteTarget.name}</strong>?
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

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--edub-surface)',
  color: 'var(--edub-text-primary)',
  border: '1px solid var(--edub-border)',
  padding: 24,
  borderRadius: 8,
  minWidth: 400,
  maxWidth: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  boxSizing: 'border-box',
  borderRadius: 8,
};
