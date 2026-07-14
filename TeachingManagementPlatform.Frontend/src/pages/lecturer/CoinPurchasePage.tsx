import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Box, Button, Typography } from '@mui/material';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import type { ApiError } from '../../types/common';
import type { CoinPackage, CoinWalletResponse } from '../../types/coin';
import * as coinService from '../../services/coinService';
import { formatCurrency } from '../../utils/formatters';

export default function CoinPurchasePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [wallet, setWallet] = useState<CoinWalletResponse>({ coinBalance: 0 });
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  function wait(ms: number) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Auto-sync any pending transactions (handles case where user left before redirect)
      await coinService.syncLatestLecturerCoinPurchase().catch(() => {});
      const [walletData, packageData] = await Promise.all([
        coinService.getLecturerCoinWallet(),
        coinService.getLecturerCoinPackages(),
      ]);
      setWallet(walletData);
      setPackages(packageData);
    } catch {
      setError('Không tải được danh sách gói ECoin. Kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const paymentStatus = searchParams.get('paymentStatus');
    const orderCodeRaw = searchParams.get('orderCode');

    if (paymentStatus === 'success') {
      const orderCode = orderCodeRaw ? Number(orderCodeRaw) : NaN;

      if (Number.isNaN(orderCode)) {
        setSuccessMessage('Thanh toán đang được xác nhận.');
        void loadData();
        return;
      }

      let cancelled = false;

      const syncPurchase = async () => {
        setSuccessMessage(`Thanh toán order #${orderCode} đang được xác nhận.`);
        setError('');

        try {
          let latestStatus = '';
          let latestOrderCode = orderCode;

          for (let attempt = 1; attempt <= 6; attempt += 1) {
            const result = await coinService.syncLecturerCoinPurchase(orderCode);
            if (cancelled) return;

            latestStatus = result.status.toLowerCase();
            latestOrderCode = result.orderCode;

            if (latestStatus === 'paid') {
              setSuccessMessage(
                `Thanh toán order #${result.orderCode} thành công. Bạn đã nhận ${result.coinAmount.toLocaleString('vi-VN')} ECoin.`,
              );
              setError('');
              break;
            }

            if (latestStatus === 'failed') {
              setError(`Thanh toán order #${result.orderCode} không thành công. Vui lòng thử lại.`);
              setSuccessMessage('');
              break;
            }

            setSuccessMessage(`Order #${result.orderCode} đang chờ xác nhận từ cổng thanh toán (lần ${attempt}/6)...`);

            if (attempt < 6) {
              await wait(2000);
            }
          }

          if (latestStatus !== 'paid' && latestStatus !== 'failed') {
            setSuccessMessage(
              `Order #${latestOrderCode} vẫn đang chờ xác nhận. Bạn có thể bấm "Đồng bộ giao dịch gần nhất" sau vài giây.`,
            );
          }

          await loadData();
        } catch (err) {
          if (cancelled) return;
          setError(extractError(err));
          setSuccessMessage('');
          await loadData();
        } finally {
          if (!cancelled) {
            // done
          }
        }
      };

      void syncPurchase();

      return () => {
        cancelled = true;
      };
    }

    if (paymentStatus === 'cancel') {
      setError('Bạn đã hủy thanh toán hoặc quay lại từ cổng PayOS.');
    }
  }, [loadData, searchParams]);

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  async function purchasePackage(pkg: CoinPackage) {
    setActionLoading(pkg.id);
    setError('');
    setSuccessMessage('');

    try {
      const origin = window.location.origin;
      const result = await coinService.purchaseLecturerCoinPackage(pkg.id, {
        returnUrl: `${origin}/lecturer/coin-packages`,
        cancelUrl: `${origin}/lecturer/coin-packages`,
      });

      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <Box sx={{ ...pageStyle, p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ ...heroStyle, display: 'block', p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 1.5, md: 2 }, borderRadius: { xs: 3, md: 5 }, boxShadow: { xs: 'none', md: heroStyle.boxShadow }, overflow: 'hidden', minHeight: 0 }}>
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <p style={eyebrowStyle}>ECoin Wallet</p>
          <Box component="h1" sx={{ ...titleStyle, fontSize: { xs: 28, md: 36 }, lineHeight: { xs: 1.2, md: 1.1 }, overflowWrap: 'anywhere' }}>Mua ECoin cho tài khoản lecturer</Box>
          <Box component="p" sx={{ ...subtitleStyle, maxWidth: { xs: '100%', md: 'none' }, fontSize: { xs: 15, md: 16 }, lineHeight: { xs: 1.55, md: 1.6 } }}>
            Gói này dùng để trừ lượt khi tạo quiz bằng AI. Khi bấm mua, bạn sẽ được chuyển sang cổng thanh toán PayOS.
          </Box>
        </Box>

      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1.5, mb: 2, p: { xs: 2, md: 2.25 }, borderRadius: 3, bgcolor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)' }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>Số dư hiện tại</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{wallet.coinBalance.toLocaleString('vi-VN')} ECoin</Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate('/lecturer/quiz-generator')} sx={{ minHeight: 44, flexShrink: 0, whiteSpace: 'nowrap' }}>Tạo quiz</Button>
      </Box>

      {error && (
        <Box role="alert" sx={{ ...alertStyle, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1.5 }}>
          <Typography variant="body2">{error}</Typography>
          <Button variant="outlined" color="error" onClick={() => void loadData()} disabled={loading} sx={{ minHeight: 44, flexShrink: 0, whiteSpace: 'nowrap' }}>Thử lại</Button>
        </Box>
      )}

      {successMessage && (
        <div role="status" style={successStyle}>
          {successMessage}
        </div>
      )}

      {loading ? (
        <div style={emptyStateStyle}>Đang tải gói ECoin...</div>
      ) : packages.length === 0 ? (
        <Box sx={{ ...emptyStateStyle, py: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <AccountBalanceWalletOutlinedIcon color="action" sx={{ fontSize: 32 }} />
          <Typography sx={{ fontWeight: 600 }}>Chưa có gói ECoin nào khả dụng.</Typography>
          <Typography variant="body2" color="text.secondary">Vui lòng kiểm tra lại sau hoặc liên hệ quản trị viên.</Typography>
        </Box>
      ) : (
        <Box sx={{ ...gridStyle, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(auto-fit, minmax(250px, 1fr))' }, gap: { xs: 1.5, md: 2 } }}>
          {packages.map((pkg) => (
            <article key={pkg.id} style={cardStyle}>
              <Box sx={{ ...cardHeaderStyle, flexDirection: { xs: 'column', sm: 'row' } }}>
                <div>
                  <h2 style={cardTitleStyle}>{pkg.name}</h2>
                  <p style={cardSubtitleStyle}>{pkg.description || 'Gói nạp coin cho AI quiz.'}</p>
                </div>
                <span style={coinBadgeStyle}>{pkg.coinAmount.toLocaleString('vi-VN')} ECoin</span>
              </Box>

              <div style={priceRowStyle}>
                <strong style={priceValueStyle}>{formatCurrency(pkg.price)}</strong>
                <span style={priceHintStyle}>Thanh toán thật sẽ được bổ sung sau</span>
              </div>

              <button
                type="button"
                className="btn btn-add"
                disabled={actionLoading === pkg.id || !pkg.isActive}
                onClick={() => void purchasePackage(pkg)}
                style={{ width: '100%', marginTop: 16, minHeight: 44 }}
              >
                {actionLoading === pkg.id ? 'Đang nạp...' : pkg.isActive ? 'Mua ngay' : 'Tạm ẩn'}
              </button>
            </article>
          ))}
        </Box>
      )}

      <div style={noteStyle}>
        <strong>Lưu ý:</strong> mỗi lần tạo quiz sẽ trừ ECoin theo số câu hỏi yêu cầu. Nếu không đủ coin, hệ thống sẽ chặn trước khi gọi AI.
      </div>
    </Box>
  );
}

const pageStyle: React.CSSProperties = {
};

const heroStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 24,
  alignItems: 'flex-start',
  marginBottom: 20,
  padding: 24,
  borderRadius: 20,
  background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
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
  maxWidth: 760,
  lineHeight: 1.6,
  color: 'rgba(255,255,255,0.8)',
};

const alertStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 12,
  backgroundColor: '#fff1f2',
  border: '1px solid #fecdd3',
  color: '#9f1239',
};

const successStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 12,
  backgroundColor: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#065f46',
};

const emptyStateStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  border: '1px dashed #cbd5e1',
  backgroundColor: '#f8fafc',
  color: '#475569',
  textAlign: 'center',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 18,
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
};

const cardSubtitleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  color: '#64748b',
  lineHeight: 1.5,
};

const coinBadgeStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '6px 10px',
  borderRadius: 999,
  backgroundColor: '#e0f2fe',
  color: '#0369a1',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const priceRowStyle: React.CSSProperties = {
  marginTop: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const priceValueStyle: React.CSSProperties = {
  fontSize: 20,
};

const priceHintStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
};

const noteStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 16,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  color: '#334155',
};
