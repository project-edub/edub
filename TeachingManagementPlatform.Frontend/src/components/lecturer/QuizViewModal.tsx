import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { MiniGame } from '../../types/miniGame';
import type { ApiError } from '../../types/common';
import * as miniGameService from '../../services/miniGameService';

interface QuizViewModalProps {
  miniGameId: number;
  onClose: () => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function extractError(err: unknown): string {
  const axiosErr = err as AxiosError<ApiError>;
  return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default function QuizViewModal({ miniGameId, onClose }: QuizViewModalProps) {
  const [game, setGame] = useState<MiniGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniGameId]);

  async function loadGame() {
    setLoading(true);
    setError('');
    try {
      const data = await miniGameService.getMiniGame(miniGameId);
      setGame(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlayStyle} role="dialog" aria-label="Xem trò chơi">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>Xem mini game</h2>
          <button type="button" onClick={onClose} className="btn btn-neutral">
            Đóng
          </button>
        </div>

        {error && (
          <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>
        )}

        {loading ? (
          <p>Đang tải...</p>
        ) : game ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <p><strong>Tên:</strong> {game.name}</p>
              {game.description && <p><strong>Mô tả:</strong> {game.description}</p>}
              <p><strong>Loại:</strong> {game.type}</p>
            </div>

            {game.content && game.content.questions.length > 0 ? (
              game.content.questions.map((q, idx) => (
                <div key={idx} style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 4 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 8 }}>
                    Câu {idx + 1}: {q.question}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                    {q.options.map((opt, optionIndex) => (
                      <li key={opt} style={{ marginBottom: 4, fontWeight: opt === q.answer ? 'bold' : 'normal', color: opt === q.answer ? '#2e7d32' : 'inherit' }}>
                        <strong>{OPTION_LABELS[optionIndex] ?? String(optionIndex + 1)}.</strong> {opt} {opt === q.answer && '(Đáp án đúng)'}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--edub-text-secondary)' }}>Không có nội dung quiz</p>
            )}
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
