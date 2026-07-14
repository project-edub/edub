import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Tooltip } from '@mui/material';
import type { ClassDetail, CreateClassRequest, UpdateClassRequest } from '../../types/class';
import type { ApiError } from '../../types/common';
import * as classService from '../../services/classService';
import ActionButton from '../../components/common/ActionButton';
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
        <h1 style={{ margin: 0, color: 'var(--edub-text-primary)' }}>Danh sách lớp</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn btn-add"
          style={{ borderRadius: 8 }}
        >
          + Thêm lớp
        </button>
      </div>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : classes.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          Không có lớp học nào
        </Typography>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Tên lớp</th>
                <th style={thStyle}>Niên khóa</th>
                <th style={thStyle}>Số học sinh</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
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
                    onClick={() => navigate(`/lecturer/classes/${cls.id}`)}
                  >
                    <td style={tdStyle}>{cls.name}</td>
                    <td style={tdStyle}>{cls.year}</td>
                    <td style={tdStyle}>{cls.studentCount}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <ActionButton icon="edit" label="Sửa" color="primary" onClick={() => openEditModal(cls)} disabled={actionLoading} />
                        <ActionButton icon="delete" label="Xóa" color="error" onClick={() => setDeleteTarget(cls)} disabled={actionLoading} />
                      </div>
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
      <Dialog open={modal.type !== null} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          {modal.type === 'create' ? 'Thêm lớp học' : 'Sửa lớp học'}
        </DialogTitle>

        {formError && (
          <Box sx={{ px: 3, pt: 0 }}>
            <Alert severity="error">{formError}</Alert>
          </Box>
        )}

        <DialogContent sx={{ pt: formError ? 1 : 2 }}>
          <Box component="form" noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              label="Tên lớp"
              placeholder="Nhập tên lớp"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Năm học"
              placeholder="Nhập năm học (vd: 2024-2025)"
              value={formYear}
              onChange={(e) => setFormYear(e.target.value)}
              fullWidth
              variant="outlined"
            />
          </Box>
        </DialogContent>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="modal-year" style={{ display: 'block', marginBottom: 4 }}>Niên khóa</label>
                <input
                  id="modal-year"
                  type="text"
                  placeholder="Nhập niên khóa (vd: 2024-2025)"
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  style={inputStyle}
                />
              </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa lớp <strong>{deleteTarget?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={actionLoading}>
            Hủy
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={actionLoading}
          >
            {actionLoading ? 'Đang xử lý...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px',
  borderBottom: '2px solid',
  borderColor: 'var(--edub-border)',
  fontWeight: 600,
  fontSize: '14px',
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
