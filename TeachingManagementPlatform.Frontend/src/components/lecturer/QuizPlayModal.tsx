import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { MiniGamePlayData } from '../../types/miniGame';
import type { ApiError } from '../../types/common';
import * as miniGameService from '../../services/miniGameService';

interface QuizPlayModalProps {
  miniGameId: number;
  onClose: () => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function extractError(err: unknown): string {
  const axiosErr = err as AxiosError<ApiError>;
  return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default function QuizPlayModal({ miniGameId, onClose }: QuizPlayModalProps) {
  const [playData, setPlayData] = useState<MiniGamePlayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadPlayData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniGameId]);

  async function loadPlayData() {
    setLoading(true);
    setError('');
    try {
      const data = await miniGameService.getMiniGamePlayData(miniGameId);
      setPlayData(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(questionIndex: number, option: string) {
    if (submitted[questionIndex]) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: option }));
    setSubmitted((prev) => ({ ...prev, [questionIndex]: true }));
  }

  function getOptionStyle(questionIndex: number, option: string): React.CSSProperties {
    const base: React.CSSProperties = {
      display: 'block',
      width: '100%',
      padding: '10px 16px',
      marginBottom: 6,
      cursor: submitted[questionIndex] ? 'default' : 'pointer',
      border: '1px solid var(--edub-border)',
      borderRadius: 4,
      textAlign: 'left',
      fontSize: 14,
      backgroundColor: 'var(--edub-input-bg)',
      color: 'var(--edub-text-primary)',
    };

    if (!submitted[questionIndex]) return base;

    const question = playData?.content.questions[questionIndex];
    if (!question) return base;

    const isCorrect = option === question.answer;
    const isSelected = answers[questionIndex] === option;

    if (isCorrect) {
      return { ...base, backgroundColor: '#e8f5e9', borderColor: '#4caf50', fontWeight: 'bold' };
    }
    if (isSelected && !isCorrect) {
      return { ...base, backgroundColor: '#ffebee', borderColor: '#f44336' };
    }
    return base;
  }

  const totalQuestions = playData?.content.questions.length ?? 0;
  const answeredCount = Object.keys(submitted).length;
  const correctCount = playData
    ? playData.content.questions.filter((q, i) => answers[i] === q.answer).length
    : 0;

  return (
    <div style={overlayStyle} role="dialog" aria-label="Chơi quiz">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>{playData?.name || 'Quiz'}</h2>
          <button type="button" onClick={onClose} className="btn btn-neutral">
            Đóng
          </button>
        </div>

        {error && (
          <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>Đang tải...</p>
        ) : playData ? (
          <>
            {answeredCount === totalQuestions && totalQuestions > 0 && (
              <div style={{ padding: 12, backgroundColor: 'var(--edub-surface-muted)', border: '1px solid var(--edub-border)', borderRadius: 4, marginBottom: 16, textAlign: 'center' }}>
                <strong>Kết quả: {correctCount}/{totalQuestions} câu đúng</strong>
              </div>
            )}

            {playData.content.questions.map((q, idx) => (
              <div key={idx} style={{ marginBottom: 20, padding: 12, border: '1px solid var(--edub-border)', borderRadius: 4, backgroundColor: 'var(--edub-surface-muted)' }}>
                <p style={{ fontWeight: 'bold', marginBottom: 10 }}>
                  Câu {idx + 1}: {q.question}
                </p>
                {q.options.map((option, optionIndex) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectAnswer(idx, option)}
                    disabled={submitted[idx]}
                    style={getOptionStyle(idx, option)}
                  >
                    <strong>{OPTION_LABELS[optionIndex] ?? String(optionIndex + 1)}.</strong> {option}
                    {submitted[idx] && option === q.answer && ' ✓'}
                    {submitted[idx] && answers[idx] === option && option !== q.answer && ' ✗'}
                  </button>
                ))}
                {submitted[idx] && answers[idx] !== q.answer && (
                  <p style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>
                    Đáp án đúng: {(() => {
                      const answerIndex = q.options.indexOf(q.answer);
                      const answerLabel = OPTION_LABELS[answerIndex] ?? (answerIndex >= 0 ? String(answerIndex + 1) : '?');
                      return `${answerLabel}. ${q.answer}`;
                    })()}
                  </p>
                )}
              </div>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--edub-surface)',
  color: 'var(--edub-text-primary)',
  border: '1px solid var(--edub-border)',
  padding: 24,
  borderRadius: 8,
  width: 'min(600px, calc(100% - 24px))',
  maxWidth: 750,
  maxHeight: 'calc(100dvh - 24px)',
  boxSizing: 'border-box',
  overflowY: 'auto',
};
