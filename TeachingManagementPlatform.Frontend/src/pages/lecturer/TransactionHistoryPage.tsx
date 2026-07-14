import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import * as coinService from '../../services/coinService';
import * as subscriptionService from '../../services/subscriptionService';
import { formatCurrency } from '../../utils/formatters';

interface Transaction {
  id: number;
  orderCode: number;
  amount: number;
  coinAmount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  paid: { label: 'Thành công', color: 'success' },
  pending: { label: 'Đang chờ', color: 'warning' },
  failed: { label: 'Thất bại', color: 'error' },
  cancelled: { label: 'Đã hủy', color: 'default' },
};

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await coinService.syncLatestLecturerCoinPurchase().catch(() => {});
      await subscriptionService.syncLatestSubscriptionPurchase().catch(() => {});
      const data = await coinService.getLecturerTransactions();
      setTransactions(data);
    } catch {
      setError('Không thể tải lịch sử giao dịch.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: { xs: 1.5, md: 2 } }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Lịch sử giao dịch
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Danh sách các giao dịch mua ECoin qua PayOS.
        </Typography>
      </Box>

      {error && (
        <Typography role="alert" color="error" sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
          {error}
        </Typography>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && transactions.length === 0 && (
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
          <Typography variant="body1" color="text.secondary">
            Chưa có giao dịch nào.
          </Typography>
        </Box>
      )}

      {/* Mobile Card View */}
      {!loading && transactions.length > 0 && (
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
          {transactions.map((tx) => {
            const statusCfg = STATUS_MAP[tx.status.toLowerCase()] ?? STATUS_MAP.pending;
            return (
              <Card key={tx.id} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      #{tx.orderCode}
                    </Typography>
                    <Chip label={statusCfg.label} color={statusCfg.color} size="small" variant="outlined" />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Số tiền
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatCurrency(tx.amount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        ECoin
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {tx.coinAmount.toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Ngày tạo
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatDate(tx.createdAt)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Ngày thanh toán
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {tx.paidAt ? formatDate(tx.paidAt) : '—'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Desktop Table View */}
      {!loading && transactions.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Mã đơn hàng</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Số tiền</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ECoin</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ngày thanh toán</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => {
                const statusCfg = STATUS_MAP[tx.status.toLowerCase()] ?? STATUS_MAP.pending;
                return (
                  <TableRow key={tx.id} hover>
                    <TableCell>#{tx.orderCode}</TableCell>
                    <TableCell>{formatCurrency(tx.amount)}</TableCell>
                    <TableCell>{tx.coinAmount.toLocaleString('vi-VN')} ECoin</TableCell>
                    <TableCell>
                      <Chip label={statusCfg.label} color={statusCfg.color} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{formatDate(tx.createdAt)}</TableCell>
                    <TableCell>{tx.paidAt ? formatDate(tx.paidAt) : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
