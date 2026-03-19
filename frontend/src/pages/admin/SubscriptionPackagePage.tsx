import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import type {
  SubscriptionPackage,
  CreateSubscriptionPackageRequest,
  UpdateSubscriptionPackageRequest,
} from '../../types/subscription';
import type { ApiError } from '../../types/common';
import * as subscriptionService from '../../services/subscriptionService';
import { formatCurrency } from '../../utils/formatters';

interface ModalState {
  type: 'create' | 'edit' | null;
  pkg?: SubscriptionPackage;
}

export default function SubscriptionPackagePage() {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPackage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStorageLimit, setFormStorageLimit] = useState('');
  const [formFeatures, setFormFeatures] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await subscriptionService.getAll();
      setPackages(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  function extractFieldErrors(err: unknown): Record<string, string> {
    const axiosErr = err as AxiosError<ApiError>;
    const details = axiosErr.response?.data?.error?.details;
    if (details && typeof details === 'object') {
      const errors: Record<string, string> = {};
      for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'string') {
          errors[key] = value;
        }
      }
      return errors;
    }
    return {};
  }

  function openCreateModal() {
    setFormName('');
    setFormPrice('');
    setFormStorageLimit('');
    setFormFeatures('');
    setFormError('');
    setFieldErrors({});
    setModal({ type: 'create' });
  }

  function openEditModal(pkg: SubscriptionPackage) {
    setFormName(pkg.name);
    setFormPrice(String(pkg.price));
    setFormStorageLimit(String(pkg.storageLimitBytes));
    setFormFeatures(pkg.unlockedFeatures.join(', '));
    setFormError('');
    setFieldErrors({});
    setModal({ type: 'edit', pkg });
  }

  function closeModal() {
    setModal({ type: null });
    setFormError('');
    setFieldErrors({});
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formName.trim()) {
      errors.name = 'Tên gói không được để trống';
    }

    const price = Number(formPrice);
    if (formPrice === '' || isNaN(price)) {
      errors.price = 'Giá phải là một số hợp lệ';
    } else if (price < 0) {
      errors.price = 'Giá không được âm';
    }

    const storage = Number(formStorageLimit);
    if (formStorageLimit === '' || isNaN(storage)) {
      errors.storageLimitBytes = 'Giới hạn lưu trữ phải là một số hợp lệ';
    } else if (storage <= 0) {
      errors.storageLimitBytes = 'Giới hạn lưu trữ phải lớn hơn 0';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildFeaturesList(): string[] {
    return formFeatures
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!validateForm()) return;

    setActionLoading(true);
    try {
      const data: CreateSubscriptionPackageRequest = {
        name: formName.trim(),
        price: Number(formPrice),
        storageLimitBytes: Number(formStorageLimit),
        unlockedFeatures: buildFeaturesList(),
      };
      await subscriptionService.create(data);
      closeModal();
      await loadPackages();
    } catch (err) {
      const fErrors = extractFieldErrors(err);
      if (Object.keys(fErrors).length > 0) {
        setFieldErrors(fErrors);
      } else {
        setFormError(extractError(err));
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!modal.pkg) return;
    setFormError('');
    setFieldErrors({});

    if (!validateForm()) return;

    setActionLoading(true);
    try {
      const data: UpdateSubscriptionPackageRequest = {
        name: formName.trim(),
        price: Number(formPrice),
        storageLimitBytes: Number(formStorageLimit),
        unlockedFeatures: buildFeaturesList(),
      };
      await subscriptionService.update(modal.pkg.id, data);
      closeModal();
      await loadPackages();
    } catch (err) {
      const fErrors = extractFieldErrors(err);
      if (Object.keys(fErrors).length > 0) {
        setFieldErrors(fErrors);
      } else {
        setFormError(extractError(err));
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await subscriptionService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadPackages();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  function formatStorageSize(bytes: number): string {
    if (bytes >= 1_073_741_824) {
      return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
    }
    if (bytes >= 1_048_576) {
      return `${(bytes / 1_048_576).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24, color: '#000' }}>Quản lý gói đăng ký</h1>

      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={openCreateModal}
        style={{ marginBottom: 16, padding: '8px 16px', cursor: 'pointer' }}
      >
        Thêm gói
      </button>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Tên gói</th>
              <th style={thStyle}>Giá</th>
              <th style={thStyle}>Giới hạn lưu trữ</th>
              <th style={thStyle}>Tính năng</th>
              <th style={thStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 16 }}>
                  Không có gói đăng ký nào
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td style={tdStyle}>{pkg.name}</td>
                  <td style={tdStyle}>{formatCurrency(pkg.price)}</td>
                  <td style={tdStyle}>{formatStorageSize(pkg.storageLimitBytes)}</td>
                  <td style={tdStyle}>{pkg.unlockedFeatures.join(', ') || '—'}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => openEditModal(pkg)}
                      disabled={actionLoading}
                      style={{ marginRight: 8, cursor: 'pointer' }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(pkg)}
                      disabled={actionLoading}
                      style={{ cursor: 'pointer' }}
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

      {/* Create / Edit Modal */}
      {modal.type && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>
              {modal.type === 'create' ? 'Thêm gói đăng ký' : 'Sửa gói đăng ký'}
            </h2>

            {formError && (
              <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
                {formError}
              </div>
            )}

            <form onSubmit={modal.type === 'create' ? handleCreateSubmit : handleEditSubmit} noValidate>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="modal-name" style={{ display: 'block', marginBottom: 4 }}>Tên gói</label>
                <input
                  id="modal-name"
                  type="text"
                  placeholder="Nhập tên gói"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={inputStyle}
                />
                {fieldErrors.name && (
                  <span style={fieldErrorStyle}>{fieldErrors.name}</span>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="modal-price" style={{ display: 'block', marginBottom: 4 }}>Giá (đ)</label>
                <input
                  id="modal-price"
                  type="number"
                  min="0"
                  placeholder="Nhập giá"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  style={inputStyle}
                />
                {fieldErrors.price && (
                  <span style={fieldErrorStyle}>{fieldErrors.price}</span>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="modal-storage" style={{ display: 'block', marginBottom: 4 }}>
                  Giới hạn lưu trữ (bytes)
                </label>
                <input
                  id="modal-storage"
                  type="number"
                  min="1"
                  placeholder="Nhập giới hạn lưu trữ"
                  value={formStorageLimit}
                  onChange={(e) => setFormStorageLimit(e.target.value)}
                  style={inputStyle}
                />
                {fieldErrors.storageLimitBytes && (
                  <span style={fieldErrorStyle}>{fieldErrors.storageLimitBytes}</span>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="modal-features" style={{ display: 'block', marginBottom: 4 }}>
                  Tính năng (phân cách bằng dấu phẩy)
                </label>
                <input
                  id="modal-features"
                  type="text"
                  placeholder="vd: ai_mini_games, excel_export, storage_50gb"
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Đang xử lý...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>Xác nhận xóa</h2>
            <p style={{ marginBottom: 16 }}>
              Bạn có chắc chắn muốn xóa gói <strong>{deleteTarget.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
                style={{ padding: '8px 16px', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                style={{ padding: '8px 16px', cursor: 'pointer', color: '#d32f2f' }}
              >
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
  backgroundColor: '#fff',
  padding: 24,
  borderRadius: 8,
  minWidth: 400,
  maxWidth: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  boxSizing: 'border-box',
};

const fieldErrorStyle: React.CSSProperties = {
  color: '#d32f2f',
  fontSize: '0.85em',
  display: 'block',
  marginTop: 4,
};
