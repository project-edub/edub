import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CreateIcon from '@mui/icons-material/Create';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import * as quizService from '../../services/quizService';
import type { QuizListItem } from '../../services/quizService';
import Pagination, { usePagination } from '../../components/common/Pagination';

export default function QuizListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<QuizListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create quiz dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);

  const { paginatedItems, currentPage, pageSize, totalItems, setCurrentPage, setPageSize } = usePagination(items);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await quizService.getQuizList();
      setItems(data);
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await quizService.deleteQuiz(deleteTarget.id);
      setDeleteTarget(null);
      await loadList();
    } catch (err: any) {
      setError(err?.message || 'Xóa thất bại.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, loadList]);

  const handleCreateManual = useCallback(async () => {
    if (!manualTitle.trim()) return;
    setCreating(true);
    try {
      const result = await quizService.createEmptyQuiz(manualTitle.trim());
      setManualDialogOpen(false);
      setManualTitle('');
      navigate(`/lecturer/quiz/${result.gameId}/edit`);
    } catch (err: any) {
      setError(err?.message || 'Tạo quiz thất bại.');
      setManualDialogOpen(false);
    } finally {
      setCreating(false);
    }
  }, [manualTitle, navigate]);

  const handleDuplicate = useCallback(async (quizId: number) => {
    setDuplicating(quizId);
    try {
      await quizService.duplicateQuiz(quizId);
      await loadList();
    } catch (err: any) {
      setError(err?.message || 'Nhân bản thất bại.');
    } finally {
      setDuplicating(null);
    }
  }, [loadList]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Quiz</Typography>
          <Typography variant="body2" color="text.secondary">Quản lý bài quiz trắc nghiệm của bạn.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
          Tạo quiz mới
        </Button>
      </Box>

      {error && <Typography role="alert" color="error">{error}</Typography>}

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

      {!loading && items.length === 0 && (
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 3, p: 4, textAlign: 'center', bgcolor: 'action.hover' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Chưa có quiz nào</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>Tạo quiz mới</Button>
        </Box>
      )}

      {!loading && items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Tiêu đề</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Câu hỏi</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Bài nộp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title || 'Chưa đặt tên'}</Typography></TableCell>
                    <TableCell>
                      <Chip label={item.status === 'published' ? 'Đã xuất bản' : 'Nháp'} color={item.status === 'published' ? 'success' : 'default'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">{item.questionCount}</TableCell>
                    <TableCell align="center">{item.submissionCount}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {item.status === 'published' && (
                          <Button size="small" variant="outlined" color="success" startIcon={<PlayArrowIcon />} onClick={() => window.open(`/quiz/${item.slug}`, '_blank')}>
                            Chơi
                          </Button>
                        )}
                        {item.status === 'published' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ContentCopyIcon />}
                            onClick={async () => {
                              await navigator.clipboard.writeText(`${window.location.origin}/quiz/${item.slug}`);
                              setCopiedId(item.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                          >
                            {copiedId === item.id ? 'Đã copy!' : 'Copy link'}
                          </Button>
                        )}
                        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/lecturer/quiz/${item.id}/edit`)}>
                          Quản lý
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<FileCopyOutlinedIcon />}
                          onClick={() => void handleDuplicate(item.id)}
                          disabled={duplicating === item.id}
                        >
                          {duplicating === item.id ? 'Đang nhân bản...' : 'Nhân bản'}
                        </Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(item)}>
                          Xóa
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination totalItems={totalItems} currentPage={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </>
      )}

      <Dialog open={deleteTarget != null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent><DialogContentText>Bạn có chắc chắn muốn xóa quiz "{deleteTarget?.title}"?</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Hủy</Button>
          <Button onClick={() => void handleDelete()} color="error" variant="contained" disabled={deleting}>{deleting ? 'Đang xóa...' : 'Xóa'}</Button>
        </DialogActions>
      </Dialog>

      {/* Create quiz choice dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Tạo quiz mới</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Chọn cách tạo quiz:</DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => { setCreateDialogOpen(false); navigate('/lecturer/quiz/new'); }}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              Tạo với AI — Tải tài liệu lên để tạo quiz tự động
            </Button>
            <Button
              variant="outlined"
              startIcon={<CreateIcon />}
              onClick={() => { setCreateDialogOpen(false); setManualDialogOpen(true); }}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              Tạo thủ công — Tự thêm câu hỏi
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
        </DialogActions>
      </Dialog>

      {/* Manual quiz title dialog */}
      <Dialog open={manualDialogOpen} onClose={() => setManualDialogOpen(false)}>
        <DialogTitle>Tạo quiz thủ công</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Nhập tiêu đề cho bài quiz:</DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Tiêu đề"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && manualTitle.trim()) void handleCreateManual(); }}
            disabled={creating}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setManualDialogOpen(false); setManualTitle(''); }} disabled={creating}>Hủy</Button>
          <Button onClick={() => void handleCreateManual()} variant="contained" disabled={creating || !manualTitle.trim()}>
            {creating ? 'Đang tạo...' : 'Tạo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
