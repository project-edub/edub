import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
  Typography,
} from '@mui/material';
import { Plus, Pencil, Trash2, Play, Copy } from 'lucide-react';
import type { CrosswordListItemDto, GameStatus } from '../../types/crossword';
import { GameStatus as GameStatusEnum } from '../../types/crossword';
import * as crosswordService from '../../services/crosswordService';
import Pagination, { usePagination } from '../../components/common/Pagination';

// ── Status badge config ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<GameStatus, { label: string; color: 'default' | 'success' | 'warning' | 'info' }> = {
  [GameStatusEnum.Draft]: { label: 'Nháp', color: 'default' },
  [GameStatusEnum.Published]: { label: 'Đã xuất bản', color: 'success' },
  [GameStatusEnum.Archived]: { label: 'Lưu trữ', color: 'warning' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CrosswordListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CrosswordListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CrosswordListItemDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { paginatedItems, currentPage, pageSize, totalItems, setCurrentPage, setPageSize } = usePagination(items);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await crosswordService.getCrosswordList();
      setItems(data);
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi khi tải danh sách ô chữ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await crosswordService.deleteCrossword(deleteTarget.id);
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: { xs: 1.5, md: 2 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Ô chữ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý danh sách trò chơi ô chữ của bạn.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => navigate('/lecturer/crossword/new')}
          sx={{ minHeight: 44, minWidth: 44, whiteSpace: 'nowrap' }}
        >
          Tạo ô chữ mới
        </Button>
      </Box>

      {/* Error */}
      {error && (
        <Typography role="alert" color="error" sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
          {error}
        </Typography>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 3,
            p: { xs: 2, md: 4 },
            textAlign: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Chưa có ô chữ nào
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Hãy tạo trò chơi ô chữ đầu tiên để sử dụng trong lớp học.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => navigate('/lecturer/crossword/new')}
            sx={{ minHeight: 44 }}
          >
            Tạo ô chữ mới
          </Button>
        </Box>
      )}

      {/* Mobile Card View */}
      {!loading && items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Tiêu đề</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Số từ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">ECoin</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedItems.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG[GameStatusEnum.Draft];
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusCfg.label}
                          color={statusCfg.color}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(item.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{item.wordCount}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{item.ecoinsSpent} 🪙</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          {item.status === 'published' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<Play size={18} />}
                              onClick={() => window.open(`/play/${item.slug}`, '_blank')}
                            >
                              Chơi
                            </Button>
                          )}
                          {item.status === 'published' && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Copy size={18} />}
                              onClick={async () => {
                                await navigator.clipboard.writeText(`${window.location.origin}/play/${item.slug}`);
                                setCopiedId(item.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                            >
                              {copiedId === item.id ? 'Đã copy!' : 'Copy link'}
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Pencil size={18} />}
                            onClick={() => navigate(`/lecturer/crossword/${item.id}/edit`)}
                          >
                            Chỉnh sửa
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Trash2 size={18} />}
                            onClick={() => setDeleteTarget(item)}
                          >
                            Xóa
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination totalItems={totalItems} currentPage={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        aria-labelledby="delete-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="delete-dialog-title">Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa ô chữ "{deleteTarget?.title || 'Không có tên'}"? Hành động này không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit" disabled={deleting}>
            Hủy
          </Button>
          <Button onClick={() => void handleDelete()} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
