import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SubscriptionPackage } from '../../types/subscription';
import type { CoinWalletResponse } from '../../types/coin';
import * as subscriptionService from '../../services/subscriptionService';
import * as coinService from '../../services/coinService';
import { formatCurrency } from '../../utils/formatters';
import api from '../../services/api';

export default function SubscriptionPage() {
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [wallet, setWallet] = useState<CoinWalletResponse | null>(null);
  const [upgradeDiscount, setUpgradeDiscount] = useState(20); // default 20%

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await subscriptionService.syncLatestSubscriptionPurchase().catch(() => {});
      const [data, walletData] = await Promise.all([
        subscriptionService.getActiveForLecturer(),
        coinService.getLecturerCoinWallet(),
      ]);
      setPackages(data);
      setWallet(walletData);

      // Load discount config
      try {
        const configRes = await api.get('/lecturer/pricing-config');
        if (configRes.data?.upgradeDiscountPercent != null) {
          setUpgradeDiscount(configRes.data.upgradeDiscountPercent);
        }
      } catch { /* use default */ }
    } catch {
      setError('Không thể tải danh sách gói đăng ký.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  // Handle payment return from PayOS
  useEffect(() => {
    const paymentStatus = searchParams.get('paymentStatus');
    const orderCodeRaw = searchParams.get('orderCode');

    if (paymentStatus === 'success' && orderCodeRaw) {
      const orderCode = Number(orderCodeRaw);
      if (!Number.isNaN(orderCode)) {
        setSyncing(true);
        setSuccessMessage('Đang xác nhận thanh toán...');

        const sync = async () => {
          try {
            for (let attempt = 1; attempt <= 5; attempt++) {
              const result = await subscriptionService.syncSubscriptionPurchase(orderCode);
              if (result.status.toLowerCase() === 'paid') {
                setSuccessMessage('Mua gói đăng ký thành công! Gói của bạn đã được cập nhật.');
                break;
              }
              if (result.status.toLowerCase() === 'failed') {
                setError('Thanh toán không thành công. Vui lòng thử lại.');
                setSuccessMessage('');
                break;
              }
              if (attempt < 5) {
                await new Promise(r => setTimeout(r, 2000));
              }
            }
          } catch {
            setError('Không thể xác nhận giao dịch. Vui lòng liên hệ hỗ trợ.');
            setSuccessMessage('');
          } finally {
            setSyncing(false);
          }
        };

        void sync();
      }
    }

    if (paymentStatus === 'cancel') {
      setError('Bạn đã hủy thanh toán.');
    }
  }, [searchParams]);

  async function handlePurchase(pkg: SubscriptionPackage) {
    if (pkg.price === 0) return; // Free package, no payment needed
    setActionLoading(pkg.id);
    setError('');
    setSuccessMessage('');

    try {
      const origin = window.location.origin;
      const result = await subscriptionService.purchaseSubscription(pkg.id, {
        returnUrl: `${origin}/lecturer/subscription`,
        cancelUrl: `${origin}/lecturer/subscription`,
      });
      window.location.assign(result.checkoutUrl);
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo liên kết thanh toán.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Gói đăng ký</p>
          <h1 style={titleStyle}>Nâng cấp tài khoản</h1>
          <p style={subtitleStyle}>
            Chọn gói phù hợp để mở khóa thêm tính năng tạo quiz, ô chữ và tăng hạn mức sử dụng.
          </p>
        </div>
      </div>

      {error && <div role="alert" style={alertStyle}>{error}</div>}
      {successMessage && <div role="status" style={successStyle}>{successMessage}</div>}

      {loading || syncing ? (
        <div style={emptyStateStyle}>{syncing ? 'Đang xác nhận giao dịch...' : 'Đang tải gói đăng ký...'}</div>
      ) : packages.length === 0 ? (
        <div style={emptyStateStyle}>Chưa có gói đăng ký nào khả dụng.</div>
      ) : (
        <div style={gridStyle}>
          {packages.map((pkg) => {
            const currentPrice = wallet?.subscriptionPackagePrice ?? 0;
            const isCurrentPlan = wallet?.subscriptionPackageName === pkg.name;
            const isDowngrade = pkg.price > 0 && pkg.price <= currentPrice && !isCurrentPlan;
            const isUpgradeFromPaid = pkg.price > currentPrice && currentPrice > 0;
            const discountedPrice = isUpgradeFromPaid
              ? Math.round(pkg.price * (1 - upgradeDiscount / 100))
              : pkg.price;

            return (
            <article key={pkg.id} style={{ ...cardStyle, ...(isCurrentPlan ? { border: '2px solid #1976d2' } : {}) }}>
              <div style={cardHeaderStyle}>
                <h2 style={cardTitleStyle}>{pkg.name}</h2>
                {pkg.isDefault && <span style={defaultBadge}>Mặc định</span>}
                {isCurrentPlan && <span style={{ ...defaultBadge, backgroundColor: '#e8f5e9', color: '#2e7d32' }}>Gói hiện tại</span>}
              </div>

              <div style={priceRowStyle}>
                {isUpgradeFromPaid && discountedPrice !== pkg.price ? (
                  <>
                    <strong style={priceValueStyle}>{formatCurrency(discountedPrice)}</strong>
                    <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginLeft: 8, fontSize: 14 }}>{formatCurrency(pkg.price)}</span>
                    <span style={{ marginLeft: 8, color: '#16a34a', fontSize: 13, fontWeight: 600 }}>-{upgradeDiscount}%</span>
                  </>
                ) : (
                  <strong style={priceValueStyle}>
                    {pkg.price === 0 ? 'Miễn phí' : formatCurrency(pkg.price)}
                  </strong>
                )}
              </div>

              <ul style={featureListStyle}>
                {pkg.unlockedFeatures.includes('quiz_generator') && (
                  <>
                    <li>✅ Tạo câu hỏi từ tài liệu</li>
                    <li style={limitStyle}>• {pkg.maxFilesPerQuizGeneration} file / lần tạo quiz</li>
                    <li style={limitStyle}>• {pkg.maxQuestionsPerQuiz} câu hỏi tối đa</li>
                  </>
                )}
                {pkg.unlockedFeatures.includes('crossword_generator') && (
                  <>
                    <li>✅ Tạo ô chữ từ tài liệu</li>
                    <li style={limitStyle}>• {pkg.maxCrosswordFilesPerGeneration} file / lần tạo ô chữ</li>
                    <li style={limitStyle}>• {pkg.maxCrosswordWordsPerGeneration} từ / ô chữ</li>
                    <li style={limitStyle}>• {pkg.maxCrosswordGenerationsPerDay} lần tạo / ngày</li>
                  </>
                )}
                {pkg.unlockedFeatures.length === 0 && (
                  <li style={{ color: '#64748b' }}>Không có chức năng mở khóa</li>
                )}
              </ul>

              {isCurrentPlan ? (
                <p style={freeNote}>Đang sử dụng gói này</p>
              ) : isDowngrade ? (
                <button
                  type="button"
                  className="btn btn-neutral"
                  style={{ width: '100%', marginTop: 12, opacity: 0.6, cursor: 'not-allowed' }}
                  disabled
                >
                  Không thể hạ gói
                </button>
              ) : pkg.price > 0 ? (
                <button
                  type="button"
                  className="btn btn-add"
                  style={{ width: '100%', marginTop: 12 }}
                  disabled={actionLoading === pkg.id}
                  onClick={() => void handlePurchase(pkg)}
                >
                  {actionLoading === pkg.id ? 'Đang xử lý...' : isUpgradeFromPaid ? 'Nâng cấp gói' : 'Mua gói này'}
                </button>
              ) : (
                <p style={freeNote}></p>
              )}
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: 24 };
const heroStyle: React.CSSProperties = { marginBottom: 24, padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', color: '#fff' };
const eyebrowStyle: React.CSSProperties = { margin: 0, textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12, color: 'rgba(255,255,255,0.72)' };
const titleStyle: React.CSSProperties = { margin: '8px 0 8px' };
const subtitleStyle: React.CSSProperties = { margin: 0, maxWidth: 760, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' };
const alertStyle: React.CSSProperties = { marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' };
const successStyle: React.CSSProperties = { marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' };
const emptyStateStyle: React.CSSProperties = { padding: 24, borderRadius: 16, border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', textAlign: 'center' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 };
const cardStyle: React.CSSProperties = { padding: 24, borderRadius: 18, backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)' };
const cardHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 };
const cardTitleStyle: React.CSSProperties = { margin: 0, fontSize: 20 };
const defaultBadge: React.CSSProperties = { padding: '4px 10px', borderRadius: 999, backgroundColor: '#e3f2fd', color: '#1565c0', fontSize: 12, fontWeight: 600 };
const priceRowStyle: React.CSSProperties = { marginBottom: 16 };
const priceValueStyle: React.CSSProperties = { fontSize: 24, color: '#0f172a' };
const featureListStyle: React.CSSProperties = { listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 };
const limitStyle: React.CSSProperties = { color: '#64748b', paddingLeft: 16 };
const freeNote: React.CSSProperties = { margin: '12px 0 0', fontSize: 13, color: '#94a3b8', fontStyle: 'italic' };
