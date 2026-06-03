import type { GameConfig } from '../../../types/crossword';
import { calculateEcoin } from '../../../utils/ecoinCalculator';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GenerateConfirmModalProps {
  config: GameConfig;
  coinBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GenerateConfirmModal({
  config,
  coinBalance,
  onConfirm,
  onCancel,
}: GenerateConfirmModalProps) {
  const cost = calculateEcoin(config);
  const remaining = coinBalance - cost;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div style={modalStyle}>
        <h2 id="confirm-modal-title" style={titleStyle}>
          Xác nhận tạo ô chữ
        </h2>

        <p style={descStyle}>
          Hệ thống sẽ gọi AI để tạo ô chữ theo cấu hình của bạn. ECoin sẽ bị trừ sau khi tạo thành công.
        </p>

        {/* Cost summary */}
        <div style={summaryBoxStyle}>
          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Chi phí:</span>
            <span style={costValueStyle}>{cost} 🪙 ECoin</span>
          </div>
          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Số dư hiện tại:</span>
            <span style={{ fontWeight: 600 }}>{coinBalance.toLocaleString('vi-VN')} ECoin</span>
          </div>
          <div style={{ ...summaryRowStyle, borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
            <span style={summaryLabelStyle}>Số dư sau khi tạo:</span>
            <span
              style={{
                fontWeight: 700,
                color: remaining >= 0 ? '#2e7d32' : '#d32f2f',
              }}
            >
              {remaining.toLocaleString('vi-VN')} ECoin
            </span>
          </div>
        </div>

        {/* Config summary */}
        <div style={configSummaryStyle}>
          <div style={configRowStyle}>
            <span style={configLabelStyle}>Số từ:</span>
            <span>{config.wordCount}</span>
          </div>
          <div style={configRowStyle}>
            <span style={configLabelStyle}>Độ khó:</span>
            <span>{DIFFICULTY_LABELS[config.difficulty] ?? config.difficulty}</span>
          </div>
          <div style={configRowStyle}>
            <span style={configLabelStyle}>Ngôn ngữ:</span>
            <span>{config.language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}</span>
          </div>
          <div style={configRowStyle}>
            <span style={configLabelStyle}>Kiểu gợi ý:</span>
            <span>{CLUE_STYLE_LABELS[config.clueStyle] ?? config.clueStyle}</span>
          </div>
          {config.topic && (
            <div style={configRowStyle}>
              <span style={configLabelStyle}>Chủ đề:</span>
              <span>{config.topic}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={actionsStyle}>
          <button type="button" className="btn btn-neutral" onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="btn btn-add" onClick={onConfirm}>
            Xác nhận · {cost} 🪙
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
};

const CLUE_STYLE_LABELS: Record<string, string> = {
  definition: 'Định nghĩa',
  'fill-in-blank': 'Điền vào chỗ trống',
  'multiple-choice': 'Trắc nghiệm',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 28,
  width: '100%',
  maxWidth: 480,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 20,
};

const descStyle: React.CSSProperties = {
  margin: '0 0 16px',
  color: '#475569',
  fontSize: 14,
  lineHeight: 1.6,
};

const summaryBoxStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 12,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  marginBottom: 16,
};

const summaryRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 0',
};

const summaryLabelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 14,
};

const costValueStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 16,
  color: '#1976d2',
};

const configSummaryStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 12,
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  marginBottom: 20,
};

const configRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '3px 0',
  fontSize: 13,
};

const configLabelStyle: React.CSSProperties = {
  color: '#64748b',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end',
};
