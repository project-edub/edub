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
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
        Danh sách lớp học
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Button
        variant="contained"
        color="primary"
        onClick={openCreateModal}
        sx={{ mb: 2, minHeight: 44, px: 2 }}
      >
        Thêm lớp
      </Button>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : classes.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          Không có lớp học nào
        </Typography>
      ) : (
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Mobile Card View */}
          {classes.map((cls) => (
            <Card key={cls.id} sx={{ borderRadius: 2, position: 'relative' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Sửa lớp">
                    <span>
                      <IconButton aria-label={`Sửa lớp ${cls.name}`} onClick={() => openEditModal(cls)} disabled={actionLoading} sx={{ minWidth: 40, minHeight: 40 }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Xóa lớp">
                    <span>
                      <IconButton aria-label={`Xóa lớp ${cls.name}`} color="error" onClick={() => setDeleteTarget(cls)} disabled={actionLoading} sx={{ minWidth: 40, minHeight: 40 }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
                <Typography
                  variant="h6"
                  component="button"
                  onClick={() => navigate(`/lecturer/classes/${cls.id}`)}
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    pr: 10,
                    cursor: 'pointer',
                    color: 'primary.main',
                    textDecoration: 'underline',
                    background: 'none',
                    border: 'none',
                    p: 0,
                    textAlign: 'left',
                    minHeight: 44,
                  }}
                >
                  {cls.name}
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2, fontSize: { xs: 0.875, sm: 1 } }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Năm học
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {cls.year}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Số học sinh
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {cls.studentCount}
                    </Typography>
                  </Box>
                </Box>

              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Desktop Table View */}
      {!loading && classes.length > 0 && (
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            overflowX: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
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
              {classes.map((cls) => (
                <tr key={cls.id}>
                  <td style={tdStyle}>
                    <Button
                      variant="text"
                      onClick={() => navigate(`/lecturer/classes/${cls.id}`)}
                      sx={{
                        p: 0,
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        textDecoration: 'underline',
                        minHeight: 44,
                        minWidth: 44,
                      }}
                    >
                      {cls.name}
                    </Button>
                  </td>
                  <td style={tdStyle}>{cls.year}</td>
                  <td style={tdStyle}>{cls.studentCount}</td>
                  <td style={tdStyle}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => openEditModal(cls)}
                      disabled={actionLoading}
                      sx={{ mr: 1, minHeight: 44 }}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setDeleteTarget(cls)}
                      disabled={actionLoading}
                      sx={{ minHeight: 44 }}
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
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

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={closeModal} disabled={actionLoading}>
            Hủy
          </Button>
          <Button
            onClick={modal.type === 'create' ? handleCreateSubmit : handleEditSubmit}
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? 'Đang xử lý...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

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
  padding: '12px',
  borderBottom: '1px solid',
  borderColor: 'var(--edub-border)',
  fontSize: '14px',
};
