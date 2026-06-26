import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import type { StorageItem, StorageFilter, StorageQuota } from '../../types/storage';
import type { ApiError } from '../../types/common';
import { ItemType } from '../../types/common';
import * as storageService from '../../services/storageService';
import { formatDate } from '../../utils/formatters';
import ActionButton from '../../components/common/ActionButton';

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
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<StorageItem | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StorageItem | null>(null);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

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

  const loadQuota = useCallback(async () => {
    try {
      const data = await storageService.getQuota();
      setQuota(data);
    } catch (err) {
      setError(extractError(err));
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    loadQuota();
  }, [loadQuota]);

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
      setShowCreateFolderModal(false);
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
      await Promise.all([loadItems(), loadQuota()]);
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
      await Promise.all([loadItems(), loadQuota()]);
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
      await Promise.all([loadItems(), loadQuota()]);
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDownload(item: StorageItem) {
    if (item.itemType === ItemType.Folder) return;
    setActionLoading(true);
    try {
      const { blob, fileName } = await storageService.downloadItem(item.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || item.name;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDownloadFolder(item: StorageItem) {
    if (item.itemType !== ItemType.Folder) return;
    setActionLoading(true);
    try {
      const blob = await storageService.downloadFolder(item.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${item.name}.zip`;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  function handleOpen(item: StorageItem) {
    if (item.itemType === ItemType.Folder) return;
    const url = storageService.resolveStorageFileUrl(item.fileUrl || null);
    if (!url) return;

    const ext = item.name.split('.').pop()?.toLowerCase() ?? '';
    if (['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'].includes(ext)) {
      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
      window.open(googleViewerUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function formatFileSize(bytes?: number | null): string {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function formatQuotaPercent(value: number): string {
    return `${Math.round(value)}%`;
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

      {quota && (
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(25,118,210,0.08), rgba(46,125,50,0.08))', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Gói hiện tại</div>
              <div style={{ fontWeight: 700 }}>{quota.subscriptionPackageName}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Đã dùng</div>
              <div style={{ fontWeight: 700 }}>{formatFileSize(quota.storageUsedBytes)} / {formatFileSize(quota.storageLimitBytes)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Còn lại</div>
              <div style={{ fontWeight: 700 }}>{formatFileSize(quota.remainingBytes)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Mức sử dụng</div>
              <div style={{ fontWeight: 700 }}>{formatQuotaPercent(quota.usagePercent)}</div>
            </div>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Math.max(0, quota.usagePercent))}%`, height: '100%', background: quota.usagePercent >= 90 ? '#d32f2f' : '#1976d2', transition: 'width 200ms ease' }} />
          </div>
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
          onClick={() => setShowCreateFolderModal(true)}
          disabled={actionLoading}
          className="btn btn-add"
        >
          + Tạo thư mục
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={actionLoading}
          className="btn btn-neutral"
        >
          ⬆ Tải lên
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
          style={{ padding: 8, width: 180, borderRadius: 8 }}
        />
        <select
          value={fileTypeFilter}
          onChange={(e) => setFileTypeFilter(e.target.value)}
          aria-label="Loại tệp"
          style={{ padding: 8, borderRadius: 8 }}
        >
          <option value="">Tất cả file</option>
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
          style={{ padding: 8, borderRadius: 8 }}
        >
          <option value="">Tất cả ngày</option>
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
          style={{ padding: 8, borderRadius: 8 }}
        >
          <option value="name-asc">Tên A-Z</option>
          <option value="name-desc">Tên Z-A</option>
          <option value="date-desc">Mới nhất</option>
          <option value="date-asc">Cũ nhất</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', borderRadius: 8, padding: '6px 10px', border: '1px solid #ccc' }}>
          <input
            type="checkbox"
            checked={foldersFirst}
            onChange={(e) => setFoldersFirst(e.target.checked)}
          />
          Thư mục trước
        </label>
      </div>

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
              <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
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
                <tr
                  key={item.id}
                  style={{ cursor: 'pointer', backgroundColor: hoveredRowId === item.id ? '#f5f5f5' : undefined, transition: 'background-color 0.15s' }}
                  onMouseEnter={() => setHoveredRowId(item.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  onClick={item.itemType === ItemType.Folder ? () => openFolder(item) : item.itemType === ItemType.File ? () => handleOpen(item) : undefined}
                >
                  <td style={tdStyle}>
                    {item.itemType === ItemType.Folder ? (
                      <button
                        type="button"
                        onClick={() => openFolder(item)}
                        style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', padding: 0}}
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
                  <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <ActionButton icon="edit" label="Đổi tên" color="primary" onClick={() => startRename(item)} disabled={actionLoading} />
                      {item.itemType === ItemType.File && (
                        <ActionButton icon="download" label="Tải" color="default" onClick={() => handleDownload(item)} disabled={actionLoading} />
                      )}
                      {item.itemType === ItemType.Folder && (
                        <ActionButton icon="download" label="Tải" color="default" onClick={() => handleDownloadFolder(item)} disabled={actionLoading} />
                      )}
                      <ActionButton icon="delete" label="Xóa" color="error" onClick={() => setDeleteTarget(item)} disabled={actionLoading} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Create folder modal */}
      {showCreateFolderModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>Tạo thư mục mới</h2>
            <input
              type="text"
              placeholder="Tên thư mục"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              aria-label="Tên thư mục mới"
              style={{ padding: 8, width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowCreateFolderModal(false); setNewFolderName(''); }} disabled={actionLoading} className="btn btn-neutral">
                Hủy
              </button>
              <button type="button" onClick={handleCreateFolder} disabled={actionLoading} className="btn btn-update">
                {actionLoading ? 'Đang xử lý...' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
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
