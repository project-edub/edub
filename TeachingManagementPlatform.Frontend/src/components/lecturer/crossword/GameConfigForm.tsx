import { useCallback, useState } from 'react';
import type { GameConfig } from '../../../types/crossword';

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Dễ' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'hard', label: 'Khó' },
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'Tiếng Anh' },
] as const;

const CLUE_STYLE_OPTIONS = [
  { value: 'definition', label: 'Định nghĩa', proOnly: false },
  { value: 'fill-in-blank', label: 'Điền vào chỗ trống', proOnly: true },
  { value: 'multiple-choice', label: 'Trắc nghiệm', proOnly: true },
] as const;

const GRID_SIZE_OPTIONS = [
  { value: 10, label: '10×10' },
  { value: 15, label: '15×15' },
  { value: 20, label: '20×20' },
] as const;

const MIN_WORD_COUNT = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GameConfigFormProps {
  config: GameConfig;
  onChange: (config: GameConfig) => void;
  /** Max word count from subscription. */
  maxWordCount: number;
  /** Whether the user has Pro subscription (unlocks fill-in-blank, multiple-choice). */
  isPro: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GameConfigForm({
  config,
  onChange,
  maxWordCount,
  isPro,
}: GameConfigFormProps) {
  const [excludeInput, setExcludeInput] = useState('');

  const update = useCallback(
    (partial: Partial<GameConfig>) => {
      onChange({ ...config, ...partial });
    },
    [config, onChange],
  );

  function handleExcludeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && excludeInput.trim()) {
      e.preventDefault();
      const tag = excludeInput.trim().toUpperCase();
      if (!config.excludeWords.includes(tag)) {
        update({ excludeWords: [...config.excludeWords, tag] });
      }
      setExcludeInput('');
    }
    if (e.key === 'Backspace' && excludeInput === '' && config.excludeWords.length > 0) {
      update({ excludeWords: config.excludeWords.slice(0, -1) });
    }
  }

  function removeExcludeWord(word: string) {
    update({ excludeWords: config.excludeWords.filter((w) => w !== word) });
  }

  return (
    <div style={formStyle}>
      {/* Difficulty */}
      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>Độ khó</label>
        <div style={pillGroupStyle} role="radiogroup" aria-label="Độ khó">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={config.difficulty === opt.value}
              style={{
                ...pillStyle,
                ...(config.difficulty === opt.value ? activePillStyle : {}),
              }}
              onClick={() => update({ difficulty: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Word count */}
      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>
          Số từ: <strong>{config.wordCount}</strong>
          <span style={fieldHintStyle}> (tối đa {maxWordCount})</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={MIN_WORD_COUNT}
            max={maxWordCount}
            value={config.wordCount}
            onChange={(e) => update({ wordCount: Number(e.target.value) })}
            style={{ flex: 1 }}
            aria-label="Số từ"
          />
          <input
            type="number"
            min={MIN_WORD_COUNT}
            max={maxWordCount}
            value={config.wordCount}
            onChange={(e) => {
              const val = Math.min(maxWordCount, Math.max(MIN_WORD_COUNT, Number(e.target.value)));
              update({ wordCount: val });
            }}
            style={{ ...numberInputStyle }}
            aria-label="Nhập số từ"
          />
        </div>
      </div>

      {/* Language */}
      <div style={fieldGroupStyle}>
        <label htmlFor="language-select" style={fieldLabelStyle}>Ngôn ngữ</label>
        <select
          id="language-select"
          value={config.language}
          onChange={(e) => update({ language: e.target.value })}
          style={selectStyle}
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clue style */}
      <div style={fieldGroupStyle}>
        <label htmlFor="clue-style-select" style={fieldLabelStyle}>Kiểu gợi ý</label>
        <select
          id="clue-style-select"
          value={config.clueStyle}
          onChange={(e) => update({ clueStyle: e.target.value })}
          style={selectStyle}
        >
          {CLUE_STYLE_OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.proOnly && !isPro}
            >
              {opt.proOnly && !isPro ? `🔒 ${opt.label}` : opt.label}
            </option>
          ))}
        </select>
        {!isPro && (
          <p style={proHintStyle}>
            🔒 Điền vào chỗ trống và Trắc nghiệm chỉ dành cho gói Pro.
          </p>
        )}
      </div>

      {/* Topic */}
      <div style={fieldGroupStyle}>
        <label htmlFor="topic-input" style={fieldLabelStyle}>
          Chủ đề <span style={optionalStyle}>(không bắt buộc)</span>
        </label>
        <input
          id="topic-input"
          type="text"
          value={config.topic ?? ''}
          onChange={(e) => update({ topic: e.target.value })}
          placeholder="Ví dụ: Lịch sử Việt Nam, Hóa học hữu cơ..."
          style={inputStyle}
          maxLength={200}
        />
      </div>

      {/* Exclude words */}
      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>
          Từ loại trừ <span style={optionalStyle}>(không bắt buộc)</span>
        </label>
        <div style={tagInputContainerStyle}>
          {config.excludeWords.map((word) => (
            <span key={word} style={tagStyle}>
              {word}
              <button
                type="button"
                aria-label={`Xóa từ ${word}`}
                style={tagRemoveStyle}
                onClick={() => removeExcludeWord(word)}
              >
                ✕
              </button>
            </span>
          ))}
          <input
            type="text"
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            onKeyDown={handleExcludeKeyDown}
            placeholder={config.excludeWords.length === 0 ? 'Nhập từ rồi nhấn Enter...' : ''}
            style={tagInputStyle}
            aria-label="Thêm từ loại trừ"
          />
        </div>
        <p style={fieldHintStyle}>Nhấn Enter hoặc dấu phẩy để thêm từ.</p>
      </div>

      {/* Grid size */}
      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>Kích thước lưới</label>
        <div style={pillGroupStyle} role="radiogroup" aria-label="Kích thước lưới">
          {GRID_SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={(config.gridSize ?? 15) === opt.value}
              style={{
                ...pillStyle,
                ...((config.gridSize ?? 15) === opt.value ? activePillStyle : {}),
              }}
              onClick={() => update({ gridSize: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const fieldLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
};

const fieldHintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  margin: 0,
};

const optionalStyle: React.CSSProperties = {
  fontWeight: 400,
  color: '#94a3b8',
  fontSize: 12,
};

const pillGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const pillStyle: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: 999,
  border: '1.5px solid #e2e8f0',
  background: '#f8fafc',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  color: '#475569',
  transition: 'all 0.15s',
};

const activePillStyle: React.CSSProperties = {
  border: '1.5px solid #1976d2',
  background: '#e3f2fd',
  color: '#1565c0',
  fontWeight: 700,
};

const selectStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  color: '#334155',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
};

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  color: '#334155',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
};

const numberInputStyle: React.CSSProperties = {
  width: 72,
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  color: '#334155',
  fontSize: 14,
  textAlign: 'center',
  boxSizing: 'border-box',
};

const tagInputContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  minHeight: 42,
  alignItems: 'center',
};

const tagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  borderRadius: 999,
  backgroundColor: '#e3f2fd',
  color: '#1565c0',
  fontSize: 12,
  fontWeight: 600,
};

const tagRemoveStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#1565c0',
  fontSize: 11,
  padding: 0,
  lineHeight: 1,
};

const tagInputStyle: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  fontSize: 13,
  flex: 1,
  minWidth: 120,
  backgroundColor: 'transparent',
  color: '#334155',
};

const proHintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#92400e',
  backgroundColor: '#fffbeb',
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #fcd34d',
};
