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
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      await studentListService.importExcel(listId, file);
      onSuccess();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const data = axiosErr.response?.data;
      setError(data?.error?.message || 'Đã xảy ra lỗi khi nhập Excel. Vui lòng thử lại.');
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
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 'min(400px, calc(100% - 24px))', maxWidth: 500, maxHeight: 'calc(100dvh - 24px)', boxSizing: 'border-box', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>Nhập Excel</h3>

        <p style={{ color: 'var(--edub-text-secondary)', fontSize: 13, marginBottom: 16 }}>
          Chọn bất kỳ file Excel (.xlsx) nào. Các cột trong file sẽ được tự động thêm vào danh sách nếu chưa tồn tại.
        </p>

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
            }}
          />
        </div>

        {error && (
          <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-neutral"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || loading}
            className="btn btn-add"
          >
            {loading ? 'Đang nhập...' : 'Nhập'}
          </button>
        </div>
      </div>
    </div>
  );
}
