import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import * as quizService from '../../services/quizService';
import type { QuizListItem } from '../../services/quizService';

export default function QuizListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<QuizListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Quiz</Typography>
          <Typography variant="body2" color="text.secondary">Quản lý bài quiz trắc nghiệm của bạn.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/lecturer/quiz/new')}>
          Tạo quiz mới
        </Button>
      </Box>

      {error && <Typography role="alert" color="error">{error}</Typography>}

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

      {!loading && items.length === 0 && (
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 3, p: 4, textAlign: 'center', bgcolor: 'action.hover' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Chưa có quiz nào</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/lecturer/quiz/new')}>Tạo quiz mới</Button>
        </Box>
      )}

      {!loading && items.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Tiêu đề</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Câu hỏi</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Bài nộp</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title || 'Chưa đặt tên'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={item.status === 'published' ? 'Đã xuất bản' : 'Nháp'} color={item.status === 'published' ? 'success' : 'default'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">{item.questionCount}</TableCell>
                  <TableCell align="center">{item.submissionCount}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      {item.status === 'published' && (
                        <Button size="small" variant="outlined" color="success" startIcon={<PlayArrowIcon />} onClick={() => window.open(`/quiz/${item.slug}`, '_blank')}>
                          Chơi
                        </Button>
                      )}
                      <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/lecturer/quiz/${item.id}/edit`)}>
                        Quản lý
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
      )}

      <Dialog open={deleteTarget != null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent><DialogContentText>Bạn có chắc chắn muốn xóa quiz "{deleteTarget?.title}"?</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Hủy</Button>
          <Button onClick={() => void handleDelete()} color="error" variant="contained" disabled={deleting}>{deleting ? 'Đang xóa...' : 'Xóa'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
