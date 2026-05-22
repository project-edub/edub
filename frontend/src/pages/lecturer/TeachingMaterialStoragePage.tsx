import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import type { StorageItem, StorageFilter } from '../../types/storage';
import type { ApiError } from '../../types/common';
import { ItemType } from '../../types/common';
import * as storageService from '../../services/storageService';
import { formatDate } from '../../utils/formatters';

interface BreadcrumbEntry {
  id: number | null;
  name: string;
}

export default function TeachingMaterialStoragePage() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Navigation
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: null, name: 'Gốc' }]);
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  // Filters
  const [search, setSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [foldersFirst, setFoldersFirst] = useState(true);

  // Actions
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<StorageItem | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StorageItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filter: StorageFilter = {
        sortBy,
        sortDirection,
        folderPosition: foldersFirst ? 'above' : 'mixed',
      };
      if (search) filter.search = search;
      if (fileTypeFilter) filter.fileType = fileTypeFilter;
      if (dateRangeFilter) filter.dateRange = dateRangeFilter;
      const data = await storageService.listItems(currentFolderId, filter);
      setItems(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, search, fileTypeFilter, dateRangeFilter, sortBy, sortDirection, foldersFirst]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function openFolder(item: StorageItem) {
    setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setActionLoading(true);
    try {
      await storageService.createFolder({ name: newFolderName.trim(), parentFolderId: currentFolderId });
      setNewFolderName('');
      setShowCreateFolder(false);
      await loadItems();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading(true);
    try {
      await storageService.uploadFile(file, currentFolderId);
      await loadItems();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function startRename(item: StorageItem) {
    setRenameTarget(item);
    setRenameName(item.name);
  }

  async function handleRename() {
    if (!renameTarget || !renameName.trim()) return;
    setActionLoading(true);
    try {
      await storageService.renameItem(renameTarget.id, { name: renameName.trim() });
      setRenameTarget(null);
      setRenameName('');
      await loadItems();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await storageService.deleteItem(deleteTarget.id);
      setDeleteTarget(null);
      await loadItems();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  function formatFileSize(bytes?: number | null): string {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleSortChange(value: string) {
    switch (value) {
      case 'name-asc': setSortBy('name'); setSortDirection('asc'); break;
      case 'name-desc': setSortBy('name'); setSortDirection('desc'); break;
      case 'date-desc': setSortBy('date'); setSortDirection('desc'); break;
      case 'date-asc': setSortBy('date'); setSortDirection('asc'); break;
    }
  }

  function getSortValue(): string {
    return `${sortBy}-${sortDirection}`;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24, color: 'var(--edub-text-primary)' }}>Kho tài liệu giảng dạy</h1>

      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Breadcrumb navigation */}
      <nav aria-label="Điều hướng thư mục" style={{ marginBottom: 16 }}>
        {breadcrumbs.map((bc, i) => (
          <span key={bc.id ?? 'root'}>
            {i > 0 && ' / '}
            {i < breadcrumbs.length - 1 ? (
              <button
                type="button"
                onClick={() => navigateToBreadcrumb(i)}
                className="btn btn-view"
                style={{ padding: '6px 12px', marginLeft: 4, marginRight: 4 }}
              >
                {bc.name}
              </button>
            ) : (
              <span style={{ fontWeight: 'bold' }}>{bc.name}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setShowCreateFolder(true)}
          disabled={actionLoading}
          className="btn btn-add"
        >
          Tạo thư mục
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={actionLoading}
          className="btn btn-add"
        >
          Tải lên
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleUploadFile}
          style={{ display: 'none' }}
          data-testid="file-upload-input"
        />
        <input
          type="text"
          placeholder="Tìm kiếm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Tìm kiếm"
          style={{ padding: 8, width: 180 }}
        />
        <select
          value={fileTypeFilter}
          onChange={(e) => setFileTypeFilter(e.target.value)}
          aria-label="Loại tệp"
          style={{ padding: 8 }}
        >
          <option value="">Tất cả</option>
          <option value="word">Word</option>
          <option value="excel">Excel</option>
          <option value="powerpoint">PowerPoint</option>
          <option value="text">Text</option>
          <option value="pdf">PDF</option>
        </select>
        <select
          value={dateRangeFilter}
          onChange={(e) => setDateRangeFilter(e.target.value)}
          aria-label="Thời gian"
          style={{ padding: 8 }}
        >
          <option value="">Tất cả</option>
          <option value="today">Hôm nay</option>
          <option value="last3days">3 ngày qua</option>
          <option value="last7days">7 ngày qua</option>
          <option value="last30days">30 ngày qua</option>
          <option value="thisyear">Năm nay</option>
        </select>
        <select
          value={getSortValue()}
          onChange={(e) => handleSortChange(e.target.value)}
          aria-label="Sắp xếp"
          style={{ padding: 8 }}
        >
          <option value="name-asc">Tên A-Z</option>
          <option value="name-desc">Tên Z-A</option>
          <option value="date-desc">Mới nhất</option>
          <option value="date-asc">Cũ nhất</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={foldersFirst}
            onChange={(e) => setFoldersFirst(e.target.checked)}
          />
          Thư mục trước
        </label>
      </div>

      {/* Create folder inline */}
      {showCreateFolder && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Tên thư mục"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            aria-label="Tên thư mục mới"
            style={{ padding: 8, width: 240 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
          />
          <button type="button" onClick={handleCreateFolder} disabled={actionLoading} className="btn btn-update" style={{ marginRight: 4 }}>
            Tạo
          </button>
          <button type="button" onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }} className="btn btn-neutral">
            Hủy
          </button>
        </div>
      )}

      {/* File/folder table */}
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Tên</th>
              <th style={thStyle}>Ngày sửa đổi</th>
              <th style={thStyle}>Kích cỡ tệp</th>
              <th style={thStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 16 }}>
                  Không có tệp hoặc thư mục nào
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>
                    {item.itemType === ItemType.Folder ? (
                      <button
                        type="button"
                        onClick={() => openFolder(item)}
                        style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >
                        📁 {item.name}
                      </button>
                    ) : (
                      <span>📄 {item.name}</span>
                    )}
                  </td>
                  <td style={tdStyle}>{formatDate(item.modifiedAt)}</td>
                  <td style={tdStyle}>
                    {item.itemType === ItemType.Folder ? '—' : formatFileSize(item.fileSize)}
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => startRename(item)}
                      disabled={actionLoading}
                      className="btn btn-update"
                      style={{ marginRight: 8 }}
                    >
                      Đổi tên
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      disabled={actionLoading}
                      className="btn btn-delete"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Rename modal */}
      {renameTarget && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>Đổi tên</h2>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              aria-label="Tên mới"
              style={{ padding: 8, width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setRenameTarget(null); setRenameName(''); }} disabled={actionLoading} className="btn btn-neutral">
                Hủy
              </button>
              <button type="button" onClick={handleRename} disabled={actionLoading} className="btn btn-update">
                {actionLoading ? 'Đang xử lý...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>Xác nhận xóa</h2>
            <p style={{ marginBottom: 16 }}>
              Bạn có chắc chắn muốn xóa <strong>{deleteTarget.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={actionLoading} className="btn btn-neutral">
                Hủy
              </button>
              <button type="button" onClick={handleDelete} disabled={actionLoading} className="btn btn-delete">
                {actionLoading ? 'Đang xử lý...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid #ccc',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #eee',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--edub-surface)',
  color: 'var(--edub-text-primary)',
  border: '1px solid var(--edub-border)',
  padding: 24,
  borderRadius: 8,
  minWidth: 400,
  maxWidth: 500,
};
