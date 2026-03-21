import { useState } from 'react';
import { AxiosError } from 'axios';
import type { CreateMiniGameRequest } from '../../types/miniGame';
import { GameType, type ApiError } from '../../types/common';
import * as miniGameService from '../../services/miniGameService';

interface MiniGameCreateModalProps {
  lessonId: number;
  onClose: () => void;
  onCreated: () => void;
}

function extractError(err: unknown): string {
  const axiosErr = err as AxiosError<ApiError>;
  return axiosErr.response?.data?.error?.message || 'Không thể tạo mini game. Vui lòng thử lại sau.';
}

export default function MiniGameCreateModal({ lessonId, onClose, onCreated }: MiniGameCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>(GameType.Quiz);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data: CreateMiniGameRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        type: type as typeof GameType.Quiz,
      };
      await miniGameService.createMiniGame(lessonId, data);
      onCreated();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry() {
    await handleSubmit();
  }

  return (
    <div style={overlayStyle} role="dialog" aria-label="Tạo mini game">
      <div style={modalStyle}>
        <h2 style={{ marginBottom: 16 }}>Tạo mini game</h2>

        {error && (
          <div role="alert" style={{ color: '#d32f2f', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{error}</span>
            <button type="button" onClick={handleRetry} disabled={loading} className="btn btn-update" style={{ padding: '4px 12px' }}>
              Thử lại
            </button>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="mg-name" style={labelStyle}>Tên mini game</label>
          <input
            id="mg-name"
            type="text"
            placeholder="Nhập tên mini game"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="mg-description" style={labelStyle}>Mô tả</label>
          <textarea
            id="mg-description"
            placeholder="Nhập mô tả (không bắt buộc)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="mg-type" style={labelStyle}>Loại</label>
          <select
            id="mg-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={loading}
            style={inputStyle}
          >
            <option value={GameType.Quiz}>Quiz</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-neutral">
            Hủy
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading || !name.trim()} className="btn btn-add">
            {loading ? 'Đang tạo...' : 'Tạo'}
          </button>
        </div>
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
  backgroundColor: '#fff',
  padding: 24,
  borderRadius: 8,
  minWidth: 450,
  maxWidth: 550,
};

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: 8, boxSizing: 'border-box' };
