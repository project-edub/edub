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
import { GRADE_OPTIONS } from '../../constants/lessonPlanOptions';

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

  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSchoolYear, setFilterSchoolYear] = useState('');
  const schoolYearOptions = Array.from(new Set(plans.map((plan) => `${plan.schoolYearStart}-${plan.schoolYearEnd}`))).sort().reverse();

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

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 2 },
        bgcolor: 'var(--edub-surface)',
        color: 'var(--edub-text-primary)',
        border: '1px solid var(--edub-border)',
        borderRadius: 2,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3, color: 'var(--edub-text-primary)' }}>
        Giáo án
      </Typography>

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
      </Box>

      <Button
        variant="contained"
        onClick={openCreateModal}
        className="btn btn-add"
        sx={{ mb: 2, minHeight: 44 }}
      >
        Thêm giáo án
      </Button>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : plans.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4 }} color="text.secondary">
          Không có giáo án nào
        </Typography>
      ) : (
        <>
          {/* Mobile Card View */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {plans.map((plan) => (
              <Card key={plan.id} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
                    {plan.subject}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Khối
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {plan.grade}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Niên khóa
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {plan.schoolYearStart} - {plan.schoolYearEnd}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate(`/lecturer/lesson-plans/${plan.id}/lessons`)}
                      disabled={actionLoading}
                      sx={{ minHeight: 44 }}
                    >
                      Xem
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => openEditModal(plan)}
                        disabled={actionLoading}
                        sx={{ minHeight: 44 }}
                      >
                        Sửa
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        onClick={() => setDeleteTarget(plan)}
                        disabled={actionLoading}
                        sx={{ minHeight: 44 }}
                      >
                        Xóa
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Desktop Table View */}
          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Môn</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Khối</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Niên khóa</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id} hover>
                    <TableCell>{plan.subject}</TableCell>
                    <TableCell>{plan.grade}</TableCell>
                    <TableCell>{plan.schoolYearStart} - {plan.schoolYearEnd}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/lecturer/lesson-plans/${plan.id}/lessons`)}
                          disabled={actionLoading}
                          className="btn btn-view"
                          sx={{ minHeight: 44 }}
                        >
                          Xem
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openEditModal(plan)}
                          disabled={actionLoading}
                          className="btn btn-update"
                          sx={{ minHeight: 44 }}
                        >
                          Sửa
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => setDeleteTarget(plan)}
                          disabled={actionLoading}
                          className="btn btn-delete"
                          sx={{ minHeight: 44 }}
                        >
                          Xóa
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {modal.type && (
        <LessonPlanModal
          mode={modal.type}
          plan={modal.plan}
          loading={actionLoading}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      <Dialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa giáo án <strong>{deleteTarget?.subject}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 }, p: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={actionLoading}
            fullWidth
            sx={{ minHeight: 44, m: { xs: 0, sm: undefined } }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleDelete}
            disabled={actionLoading}
            color="error"
            variant="contained"
            fullWidth
            sx={{ minHeight: 44, m: { xs: 0, sm: undefined } }}
          >
            {actionLoading ? 'Đang xử lý...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
