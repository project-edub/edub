import { useCallback, useEffect, useRef, useState } from 'react';
import { calculateEcoin } from '../../../utils/ecoinCalculator';
import type { GameConfig } from '../../../types/crossword';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EcoinEstimatorProps {
  config: GameConfig;
  /** Current ECoin balance of the user. */
  coinBalance: number;
  /** Whether the balance is still loading. */
  balanceLoading: boolean;
  /** Called when the user confirms generation. */
  onGenerate: () => void;
  /** Whether generation is in progress. */
  isGenerating: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EcoinEstimator({
  config,
  coinBalance,
  balanceLoading,
  onGenerate,
  isGenerating,
}: EcoinEstimatorProps) {
  const [displayedCost, setDisplayedCost] = useState(() => calculateEcoin(config));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce cost recalculation 300ms
  useEffect(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDisplayedCost(calculateEcoin(config));
    }, 300);

    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [config]);

  const hasEnoughCoins = !balanceLoading && coinBalance >= displayedCost;
  const canGenerate = hasEnoughCoins && !isGenerating;

  const handleGenerate = useCallback(() => {
    if (canGenerate) {
      onGenerate();
    }
  }, [canGenerate, onGenerate]);

  return (
    <div
      style={{
        ...containerStyle,
        backgroundColor: hasEnoughCoins || balanceLoading ? '#f8fafc' : '#fff1f2',
        border: `1px solid ${hasEnoughCoins || balanceLoading ? '#e2e8f0' : '#fca5a5'}`,
      }}
    >
      <div style={headerStyle}>
        <span style={headerIconStyle}>🪙</span>
        <span style={headerTitleStyle}>Chi phí ECoin</span>
      </div>

      {/* Cost breakdown */}
      <div style={costDisplayStyle}>
        <span style={costNumberStyle}>{displayedCost}</span>
        <span style={costUnitStyle}>ECoin</span>
      </div>

      {/* Balance */}
      <div style={balanceRowStyle}>
        <span style={balanceLabelStyle}>Số dư của bạn:</span>
        {balanceLoading ? (
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Đang tải...</span>
        ) : (
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: hasEnoughCoins ? '#2e7d32' : '#d32f2f',
            }}
          >
            {coinBalance.toLocaleString('vi-VN')} ECoin
          </span>
        )}
      </div>

      {/* Insufficient balance warning */}
      {!balanceLoading && !hasEnoughCoins && (
        <div role="alert" style={insufficientStyle}>
          ⚠️ Không đủ ECoin. Cần thêm {(displayedCost - coinBalance).toLocaleString('vi-VN')} ECoin.
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        className="btn btn-add"
        style={{
          width: '100%',
          marginTop: 12,
          opacity: canGenerate ? 1 : 0.5,
          cursor: canGenerate ? 'pointer' : 'not-allowed',
        }}
        disabled={!canGenerate}
        onClick={handleGenerate}
      >
        {isGenerating ? 'Đang tạo...' : `Tạo ô chữ · ${displayedCost} 🪙`}
      </button>

      {/* Hint */}
      <p style={hintStyle}>
        ECoin sẽ bị trừ sau khi AI tạo thành công.
      </p>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  transition: 'background-color 0.3s, border-color 0.3s',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
};

const headerIconStyle: React.CSSProperties = {
  fontSize: 20,
};

const headerTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 15,
};

const costDisplayStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 6,
  marginBottom: 12,
};

const costNumberStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
  color: '#1976d2',
  lineHeight: 1,
};

const costUnitStyle: React.CSSProperties = {
  fontSize: 16,
  color: '#64748b',
};

const balanceRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderTop: '1px solid #e2e8f0',
  borderBottom: '1px solid #e2e8f0',
  marginBottom: 8,
};

const balanceLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#64748b',
};

const insufficientStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  backgroundColor: '#fff1f2',
  border: '1px solid #fecdd3',
  color: '#9f1239',
  fontSize: 13,
  marginBottom: 4,
};

const hintStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 12,
  color: '#94a3b8',
  textAlign: 'center',
};
