import { useCallback, useEffect, useState } from 'react';
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

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: 'Thành công', color: '#166534', bg: '#dcfce7' },
  pending: { label: 'Đang chờ', color: '#92400e', bg: '#fef3c7' },
  failed: { label: 'Thất bại', color: '#991b1b', bg: '#fee2e2' },
  cancelled: { label: 'Đã hủy', color: '#64748b', bg: '#f1f5f9' },
};

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Auto-sync any pending transactions before displaying
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
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Lịch sử giao dịch</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Danh sách các giao dịch mua ECoin qua PayOS.
      </p>

      {error && <div role="alert" style={alertStyle}>{error}</div>}

      {loading ? (
        <div style={emptyStyle}>Đang tải lịch sử giao dịch...</div>
      ) : transactions.length === 0 ? (
        <div style={emptyStyle}>Chưa có giao dịch nào.</div>
      ) : (
        <div style={tableShellStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Mã đơn hàng</th>
                <th style={thStyle}>Số tiền</th>
                <th style={thStyle}>ECoin</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={thStyle}>Ngày tạo</th>
                <th style={thStyle}>Ngày thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const statusCfg = STATUS_MAP[tx.status.toLowerCase()] ?? STATUS_MAP.pending;
                return (
                  <tr key={tx.id}>
                    <td style={tdStyle}>#{tx.orderCode}</td>
                    <td style={tdStyle}>{formatCurrency(tx.amount)}</td>
                    <td style={tdStyle}>{tx.coinAmount.toLocaleString('vi-VN')} ECoin</td>
                    <td style={tdStyle}>
                      <span style={{ ...statusBadgeStyle, color: statusCfg.color, backgroundColor: statusCfg.bg }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatDate(tx.createdAt)}</td>
                    <td style={tdStyle}>{tx.paidAt ? formatDate(tx.paidAt) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const alertStyle: React.CSSProperties = { marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' };
const emptyStyle: React.CSSProperties = { padding: 24, borderRadius: 16, border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', textAlign: 'center' };
const tableShellStyle: React.CSSProperties = { overflowX: 'auto', borderRadius: 16, border: '1px solid #e2e8f0', backgroundColor: '#fff' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '12px 14px', borderBottom: '1px solid #f1f5f9' };
const statusBadgeStyle: React.CSSProperties = { display: 'inline-flex', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 };
