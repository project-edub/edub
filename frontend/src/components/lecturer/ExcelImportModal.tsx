import { useState, useRef } from 'react';
import { AxiosError } from 'axios';
import type { ApiError } from '../../types/common';
import * as studentListService from '../../services/studentListService';

interface Props {
  listId: number;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ExcelImportModal({ listId, onSuccess, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mismatchedHeaders, setMismatchedHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError('');
    setMismatchedHeaders([]);
    try {
      await studentListService.importExcel(listId, file);
      onSuccess();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError & { mismatchedHeaders?: string[] }>;
      const data = axiosErr.response?.data;
      if (data?.mismatchedHeaders && data.mismatchedHeaders.length > 0) {
        setMismatchedHeaders(data.mismatchedHeaders);
        setError('Tiêu đề cột không khớp');
      } else {
        setError(data?.error?.message || 'Đã xảy ra lỗi khi nhập Excel. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Nhập Excel"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 400, maxWidth: 500 }}>
        <h3 style={{ marginTop: 0 }}>Nhập Excel</h3>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="excel-file-input" style={{ display: 'block', marginBottom: 8 }}>
            Chọn tệp Excel (.xlsx)
          </label>
          <input
            id="excel-file-input"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError('');
              setMismatchedHeaders([]);
            }}
          />
        </div>

        {error && (
          <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {mismatchedHeaders.length > 0 && (
          <div style={{ marginBottom: 12, padding: 12, background: '#fff3e0', borderRadius: 4 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Các tiêu đề không khớp:</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {mismatchedHeaders.map((header) => (
                <li key={header}>{header}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ cursor: 'pointer', padding: '8px 16px' }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || loading}
            style={{ cursor: 'pointer', padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            {loading ? 'Đang nhập...' : 'Nhập'}
          </button>
        </div>
      </div>
    </div>
  );
}
