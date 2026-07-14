import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AxiosError } from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ApiError } from '../../types/common';
import type { CoinPackage, CreateCoinPackageRequest, UpdateCoinPackageRequest } from '../../types/coin';
import * as coinService from '../../services/coinService';
import { formatCurrency } from '../../utils/formatters';
import Pagination, { usePagination } from '../../components/common/Pagination';

interface ModalState {
  type: 'create' | 'edit' | null;
  pkg?: CoinPackage;
}

export default function CoinPackagePage() {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [deleteTarget, setDeleteTarget] = useState<CoinPackage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('0');
  const [formCoinAmount, setFormCoinAmount] = useState('100');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { paginatedItems, currentPage, pageSize, totalItems, setCurrentPage, setPageSize } = usePagination(packages);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await coinService.getAdminCoinPackages();
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

    if (Array.isArray(details)) {
      const messages = details.filter((item): item is string => typeof item === 'string');
      return messages.length > 0 ? { _form: messages.join(' | ') } : {};
    }

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

  function resetForm(pkg?: CoinPackage) {
    if (pkg) {
      setFormName(pkg.name);
      setFormPrice(String(pkg.price));
      setFormCoinAmount(String(pkg.coinAmount));
      setFormDescription(pkg.description ?? '');
      setFormIsActive(pkg.isActive);
    } else {
      setFormName('');
      setFormPrice('0');
      setFormCoinAmount('100');
      setFormDescription('');
      setFormIsActive(true);
    }
    setFormError('');
    setFieldErrors({});
  }

  function openCreateModal() {
    resetForm();
    setModal({ type: 'create' });
  }

  function openEditModal(pkg: CoinPackage) {
    resetForm(pkg);
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
    if (formPrice.trim() === '' || Number.isNaN(price)) {
      errors.price = 'Giá phải là một số hợp lệ';
    } else if (price < 0) {
      errors.price = 'Giá không được âm';
    }

    const coinAmount = Number(formCoinAmount);
    if (formCoinAmount.trim() === '' || Number.isNaN(coinAmount)) {
      errors.coinAmount = 'Số ECoin phải là một số hợp lệ';
    } else if (coinAmount <= 0) {
      errors.coinAmount = 'Số ECoin phải lớn hơn 0';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitPackage(mode: 'create' | 'edit', pkg?: CoinPackage) {
    if (mode === 'edit' && !pkg) return;

    setFormError('');
    setFieldErrors({});

    if (!validateForm()) return;

    const data = {
      name: formName.trim(),
      price: Number(formPrice),
      coinAmount: Number(formCoinAmount),
      description: formDescription.trim() || null,
      isActive: formIsActive,
    } satisfies CreateCoinPackageRequest | UpdateCoinPackageRequest;

    setActionLoading(true);
    try {
      if (mode === 'create') {
        await coinService.createAdminCoinPackage(data as CreateCoinPackageRequest);
      } else if (pkg) {
        await coinService.updateAdminCoinPackage(pkg.id, data as UpdateCoinPackageRequest);
      }

      closeModal();
      await loadPackages();
    } catch (err) {
      const fErrors = extractFieldErrors(err);
      if (fErrors._form) {
        setFormError(fErrors._form);
      } else if (Object.keys(fErrors).length > 0) {
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
      await coinService.removeAdminCoinPackage(deleteTarget.id);
      setDeleteTarget(null);
      await loadPackages();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  const activeCount = packages.filter((pkg) => pkg.isActive).length;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          gap: 3,
          alignItems: { xs: 'stretch', md: 'flex-start' },
          mb: 2.5,
          p: { xs: 2, md: 3 },
          borderRadius: 2.5,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
        }}
      >
        <Box>
          <Typography sx={{ m: 0, textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>
            Gói ECoin
          </Typography>
          <Typography variant="h4" sx={{ my: 1, fontWeight: 800 }}>Quản lý gói mua ECoin</Typography>
          <Typography sx={{ m: 0, color: 'rgba(255,255,255,0.75)', maxWidth: 720, lineHeight: 1.6 }}>
            Tạo và điều chỉnh các gói nạp coin cho giảng viên. Thanh toán thật sẽ được nối sau.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'stretch', md: 'flex-end' }, gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(84px, 1fr))', gap: 1.25 }}>
            <Box sx={{ minWidth: 96, p: '12px 14px', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', textAlign: 'center' }}>
              <Typography sx={{ display: 'block', fontSize: 22, fontWeight: 700 }}>{packages.length}</Typography>
              <Typography sx={{ display: 'block', mt: 0.5, fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>gói</Typography>
            </Box>
            <Box sx={{ minWidth: 96, p: '12px 14px', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', textAlign: 'center' }}>
              <Typography sx={{ display: 'block', fontSize: 22, fontWeight: 700 }}>{activeCount}</Typography>
              <Typography sx={{ display: 'block', mt: 0.5, fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>đang mở bán</Typography>
            </Box>
          </Box>

          <Button variant="contained" onClick={openCreateModal} className="btn btn-add" sx={{ minHeight: 44 }}>
            Thêm gói coin
          </Button>
        </Box>
      </Box>

      {error && (
        <div role="alert" style={alertErrorStyle}>
          {error}
        </div>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : packages.length === 0 ? (
        <Typography sx={emptyStateStyle as object}>Chưa có gói ECoin nào. Tạo gói đầu tiên để giảng viên có thể nạp coin.</Typography>
      ) : (
        <>
          <div style={tableShellStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Gói</th>
                  <th style={thStyle}>Giá</th>
                  <th style={thStyle}>ECoin</th>
                  <th style={thStyle}>Mô tả</th>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((pkg) => (
                  <tr key={pkg.id}>
                    <td style={tdStyle}>{pkg.name}</td>
                    <td style={tdStyle}>{formatCurrency(pkg.price)}</td>
                    <td style={tdStyle}>{pkg.coinAmount.toLocaleString('vi-VN')}</td>
                    <td style={tdStyle}>{pkg.description || '—'}</td>
                    <td style={tdStyle}>{pkg.isActive ? 'Đang mở bán' : 'Tạm ẩn'}</td>
                    <td style={tdStyle}>
                      <div style={actionButtonsStyle}>
                        <button type="button" onClick={() => openEditModal(pkg)} disabled={actionLoading} className="btn btn-update">
                          Sửa
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(pkg)} disabled={actionLoading} className="btn btn-delete">
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination totalItems={totalItems} currentPage={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {modal.type && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={modalTitleStyle}>{modal.type === 'create' ? 'Tạo gói coin' : 'Chỉnh sửa gói coin'}</h2>
                <p style={modalSubtitleStyle}>Cấu hình gói nạp ECoin cho giảng viên mua trước khi dùng AI.</p>
              </div>
              <button type="button" onClick={closeModal} style={closeButtonStyle} aria-label="Đóng">
                ×
              </button>
            </div>

            {formError && <div role="alert" style={alertErrorStyle}>{formError}</div>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modal.type) {
                  void submitPackage(modal.type, modal.pkg);
                }
              }}
              noValidate
            >
              <div style={formGridStyle}>
                <Field label="Tên gói" error={fieldErrors.name}>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} style={inputStyle} placeholder="Ví dụ: Gói 100 ECoin" />
                </Field>
                <Field label="Giá (VND)" error={fieldErrors.price}>
                  <input type="number" min="0" step="1000" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Số ECoin" error={fieldErrors.coinAmount}>
                  <input type="number" min="1" step="1" value={formCoinAmount} onChange={(e) => setFormCoinAmount(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Mô tả">
                  <input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} style={inputStyle} placeholder="Mô tả ngắn cho người mua" />
                </Field>
              </div>

              <section style={sectionBlockStyle}>
                <label style={defaultToggleStyle}>
                  <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
                  <span>
                    <strong style={{ display: 'block' }}>Đang mở bán</strong>
                    <span style={helperTextStyle}>Tắt trạng thái này để ẩn gói khỏi trang mua coin của lecturer.</span>
                  </span>
                </label>
              </section>

              <div style={{ ...footerActionsStyle, flexDirection: 'column' }}>
                <button type="button" onClick={closeModal} disabled={actionLoading} className="btn btn-neutral">Hủy</button>
                <button type="submit" disabled={actionLoading} className="btn btn-update">{actionLoading ? 'Đang xử lý...' : modal.type === 'create' ? 'Tạo gói' : 'Lưu thay đổi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={modalTitleStyle}>Xác nhận xóa</h2>
            <p style={{ ...modalSubtitleStyle, marginBottom: 20 }}>
              Bạn có chắc chắn muốn xóa gói {deleteTarget.name}?
            </p>
            <div style={{ ...footerActionsStyle, flexDirection: 'column' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={actionLoading} className="btn btn-neutral" style={{ minHeight: 44 }}>Hủy</button>
              <button type="button" onClick={handleDelete} disabled={actionLoading} className="btn btn-delete" style={{ minHeight: 44 }}>{actionLoading ? 'Đang xử lý...' : 'Xóa'}</button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label style={fieldWrapperStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
      {error && <span style={fieldErrorStyle}>{error}</span>}
    </label>
  );
}

const alertErrorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 12,
  backgroundColor: '#fff1f2',
  border: '1px solid #fecdd3',
  color: '#9f1239',
};

const emptyStateStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  border: '1px dashed #cbd5e1',
  backgroundColor: '#f8fafc',
  color: '#475569',
  textAlign: 'center',
  display: 'block',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: 24,
  borderRadius: 20,
  width: '100%',
  maxWidth: 720,
  boxShadow: '0 18px 50px rgba(15, 23, 42, 0.25)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 16,
};

const modalTitleStyle: React.CSSProperties = {
  margin: 0,
};

const modalSubtitleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  color: '#64748b',
};

const closeButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 28,
  lineHeight: 1,
  color: '#64748b',
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
};

const sectionBlockStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
};

const defaultToggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  cursor: 'pointer',
};

const helperTextStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 4,
  color: '#64748b',
  fontSize: 13,
};

const footerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  marginTop: 20,
};

const fieldWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const fieldLabelStyle: React.CSSProperties = {
  fontWeight: 600,
};

const fieldErrorStyle: React.CSSProperties = {
  color: '#b91c1c',
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
};
