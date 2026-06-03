import { useState } from 'react';
import type { CrosswordFileExtractResult } from '../../../types/crossword';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentPreviewProps {
  files: CrosswordFileExtractResult[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentPreview({ files }: DocumentPreviewProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (files.length === 0) {
    return (
      <div style={emptyStyle}>
        <p>Chưa có tài liệu nào được tải lên.</p>
      </div>
    );
  }

  const activeFile = files[activeTab] ?? files[0];

  return (
    <div>
      {/* Tab bar */}
      {files.length > 1 && (
        <div style={tabBarStyle} role="tablist" aria-label="Danh sách tài liệu">
          {files.map((file, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={activeTab === index}
              aria-controls={`tab-panel-${index}`}
              id={`tab-${index}`}
              style={{
                ...tabButtonStyle,
                ...(activeTab === index ? activeTabStyle : {}),
              }}
              onClick={() => setActiveTab(index)}
            >
              <span style={{ marginRight: 6 }}>{getFileIcon(file.fileName)}</span>
              <span style={tabLabelStyle}>{file.fileName}</span>
              <QualityChip quality={file.quality} compact />
            </button>
          ))}
        </div>
      )}

      {/* Panel */}
      <div
        id={`tab-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        style={panelStyle}
      >
        {/* File header */}
        <div style={panelHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{getFileIcon(activeFile.fileName)}</span>
            <div>
              <div style={fileNameStyle}>{activeFile.fileName}</div>
              <div style={charCountStyle}>
                {activeFile.extractedText.length.toLocaleString('vi-VN')} ký tự trích xuất
              </div>
            </div>
          </div>
          <QualityChip quality={activeFile.quality} />
        </div>

        {/* Quality warning for poor/empty */}
        {activeFile.quality === 'poor' && (
          <div role="alert" style={{ ...qualityBannerStyle, ...poorBannerStyle }}>
            ⚠️ Chất lượng trích xuất kém — văn bản có thể bị thiếu hoặc sai nhiều. Kết quả tạo ô chữ có thể không chính xác.
          </div>
        )}
        {activeFile.quality === 'empty' && (
          <div role="alert" style={{ ...qualityBannerStyle, ...emptyBannerStyle }}>
            🚫 Không trích xuất được nội dung từ tệp này. Vui lòng kiểm tra lại tệp hoặc thử tệp khác.
          </div>
        )}

        {/* Extracted text */}
        <div style={textAreaStyle}>
          {activeFile.quality === 'empty' ? (
            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
              (Không có nội dung)
            </span>
          ) : (
            <pre style={preStyle}>{activeFile.extractedText}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ── QualityChip ───────────────────────────────────────────────────────────────

interface QualityChipProps {
  quality: string;
  compact?: boolean;
}

function QualityChip({ quality, compact = false }: QualityChipProps) {
  if (quality === 'good') return null;

  const config = QUALITY_CONFIG[quality] ?? QUALITY_CONFIG['poor'];

  return (
    <span
      style={{
        ...chipBaseStyle,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        fontSize: compact ? 11 : 12,
        padding: compact ? '2px 6px' : '3px 8px',
      }}
      title={config.label}
    >
      {config.label}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return '📄';
    case 'docx': return '📝';
    case 'xlsx': return '📊';
    case 'pptx': return '📑';
    default: return '📎';
  }
}

const QUALITY_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  fair: {
    label: 'OCR — có thể có lỗi nhỏ',
    bg: '#fffbeb',
    color: '#92400e',
    border: '#fcd34d',
  },
  poor: {
    label: 'Chất lượng kém',
    bg: '#fff1f2',
    color: '#9f1239',
    border: '#fca5a5',
  },
  empty: {
    label: 'Không có nội dung',
    bg: '#fef2f2',
    color: '#7f1d1d',
    border: '#f87171',
  },
};

// ── Styles ────────────────────────────────────────────────────────────────────

const emptyStyle: React.CSSProperties = {
  padding: 24,
  textAlign: 'center',
  color: '#64748b',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  overflowX: 'auto',
  borderBottom: '1px solid #e2e8f0',
  marginBottom: 0,
  paddingBottom: 0,
};

const tabButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '8px 14px',
  border: 'none',
  borderBottom: '2px solid transparent',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 13,
  color: '#64748b',
  whiteSpace: 'nowrap',
  borderRadius: '8px 8px 0 0',
  transition: 'color 0.15s, border-color 0.15s',
};

const activeTabStyle: React.CSSProperties = {
  color: '#1976d2',
  borderBottom: '2px solid #1976d2',
  fontWeight: 600,
  backgroundColor: 'rgba(25,118,210,0.04)',
};

const tabLabelStyle: React.CSSProperties = {
  maxWidth: 140,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const panelStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  overflow: 'hidden',
  marginTop: 8,
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  backgroundColor: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  gap: 12,
};

const fileNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
};

const charCountStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  marginTop: 2,
};

const qualityBannerStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 13,
  borderBottom: '1px solid',
};

const poorBannerStyle: React.CSSProperties = {
  backgroundColor: '#fff1f2',
  borderColor: '#fca5a5',
  color: '#9f1239',
};

const emptyBannerStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  borderColor: '#f87171',
  color: '#7f1d1d',
};

const textAreaStyle: React.CSSProperties = {
  maxHeight: 360,
  overflowY: 'auto',
  padding: '12px 16px',
  backgroundColor: '#fff',
};

const preStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: 'inherit',
  fontSize: 13,
  lineHeight: 1.7,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: '#334155',
};

const chipBaseStyle: React.CSSProperties = {
  display: 'inline-block',
  borderRadius: 999,
  fontWeight: 600,
  lineHeight: 1,
  flexShrink: 0,
};
