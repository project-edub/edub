import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
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
  const [syncingPayment, setSyncingPayment] = useState(false);
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
      const [walletData, packageData] = await Promise.all([
        coinService.getLecturerCoinWallet(),
        coinService.getLecturerCoinPackages(),
      ]);
      setWallet(walletData);
      setPackages(packageData);
    } catch (err) {
      setError(extractError(err));
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
        setSyncingPayment(true);

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
            setSyncingPayment(false);
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

  async function syncLatestPurchase() {
    setSyncingPayment(true);
    setError('');

    try {
      const result = await coinService.syncLatestLecturerCoinPurchase();
      const normalizedStatus = result.status.toLowerCase();

      if (normalizedStatus === 'paid') {
        setSuccessMessage(
          `Đã đồng bộ order #${result.orderCode}: +${result.coinAmount.toLocaleString('vi-VN')} ECoin thành công.`,
        );
      } else if (normalizedStatus === 'failed') {
        setError(`Order #${result.orderCode} đã thất bại. Vui lòng tạo giao dịch mới.`);
        setSuccessMessage('');
      } else {
        setSuccessMessage(`Order #${result.orderCode} hiện ở trạng thái ${result.status}. Vui lòng thử đồng bộ lại sau.`);
      }

      await loadData();
    } catch (err) {
      setError(extractError(err));
      setSuccessMessage('');
    } finally {
      setSyncingPayment(false);
    }
  }

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
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>ECoin Wallet</p>
          <h1 style={titleStyle}>Mua ECoin cho tài khoản lecturer</h1>
          <p style={subtitleStyle}>
            Gói này dùng để trừ lượt khi tạo quiz bằng AI. Khi bấm mua, bạn sẽ được chuyển sang cổng thanh toán PayOS.
          </p>
        </div>

        <div style={walletCardStyle}>
          <span style={walletLabelStyle}>Số dư hiện tại</span>
          <span style={walletValueStyle}>{wallet.coinBalance.toLocaleString('vi-VN')} ECoin</span>
          <button type="button" className="btn btn-neutral" onClick={() => navigate('/lecturer/quiz-generator')}>
            Quay lại tạo quiz
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={alertStyle}>
          {error}
        </div>
      )}

      {successMessage && (
        <div role="status" style={successStyle}>
          {successMessage}
        </div>
      )}

      {loading ? (
        <div style={emptyStateStyle}>Đang tải gói ECoin...</div>
      ) : packages.length === 0 ? (
        <div style={emptyStateStyle}>Chưa có gói ECoin nào khả dụng.</div>
      ) : (
        <div style={gridStyle}>
          {packages.map((pkg) => (
            <article key={pkg.id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h2 style={cardTitleStyle}>{pkg.name}</h2>
                  <p style={cardSubtitleStyle}>{pkg.description || 'Gói nạp coin cho AI quiz.'}</p>
                </div>
                <span style={coinBadgeStyle}>{pkg.coinAmount.toLocaleString('vi-VN')} ECoin</span>
              </div>

              <div style={priceRowStyle}>
                <strong style={priceValueStyle}>{formatCurrency(pkg.price)}</strong>
                <span style={priceHintStyle}>Thanh toán thật sẽ được bổ sung sau</span>
              </div>

              <button
                type="button"
                className="btn btn-add"
                disabled={actionLoading === pkg.id || !pkg.isActive}
                onClick={() => void purchasePackage(pkg)}
                style={{ width: '100%', marginTop: 16 }}
              >
                {actionLoading === pkg.id ? 'Đang nạp...' : pkg.isActive ? 'Mua ngay' : 'Tạm ẩn'}
              </button>
            </article>
          ))}
        </div>
      )}

      <div style={noteStyle}>
        <strong>Lưu ý:</strong> mỗi lần tạo quiz sẽ trừ ECoin theo số câu hỏi yêu cầu. Nếu không đủ coin, hệ thống sẽ chặn trước khi gọi AI.
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: 24,
};

const heroStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 24,
  alignItems: 'stretch',
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

const walletCardStyle: React.CSSProperties = {
  minWidth: 240,
  padding: 20,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  justifyContent: 'center',
};

const walletLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.72)',
};

const walletValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
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