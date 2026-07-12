import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
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
import type { AccountResponse, CreateAccountRequest, UpdateAccountRequest } from '../../types/account';
import type { SubscriptionPackage } from '../../types/subscription';
import { AccountStatus, type ApiError } from '../../types/common';
import * as accountService from '../../services/accountService';
import * as subscriptionService from '../../services/subscriptionService';

interface ModalState {
  type: 'create' | 'edit' | null;
  account?: AccountResponse;
}

export default function AccountManagementPage() {
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [deleteTarget, setDeleteTarget] = useState<AccountResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form fields
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formCoinBalance, setFormCoinBalance] = useState('0');
  const [formSubscriptionPackageId, setFormSubscriptionPackageId] = useState<string>('');
  const [formError, setFormError] = useState('');
  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackage[]>([]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, packages] = await Promise.all([
        accountService.getAll(),
        subscriptionService.getAll(),
      ]);
      setAccounts(data);
      setSubscriptionPackages(packages);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  function openCreateModal() {
    setFormEmail('');
    setFormPassword('');
    setFormFullName('');
    setFormCoinBalance('0');
    setFormError('');
    setModal({ type: 'create' });
  }

  function openEditModal(account: AccountResponse) {
    setFormEmail(account.email);
    setFormPassword('');
    setFormFullName(account.fullName);
    setFormCoinBalance(String(account.coinBalance));
    setFormSubscriptionPackageId(account.subscriptionPackageId != null ? String(account.subscriptionPackageId) : '');
    setFormError('');
    setModal({ type: 'edit', account });
  }

  function closeModal() {
    setModal({ type: null });
    setFormError('');
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!formEmail.trim() || !formPassword.trim() || !formFullName.trim()) {
      setFormError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setActionLoading(true);
    try {
      const data: CreateAccountRequest = {
        email: formEmail.trim(),
        password: formPassword,
        fullName: formFullName.trim(),
      };
      await accountService.create(data);
      closeModal();
      await loadAccounts();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!modal.account) return;
    setFormError('');

    if (!formEmail.trim() || !formFullName.trim()) {
      setFormError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setActionLoading(true);
    try {
      const data: UpdateAccountRequest = {
        email: formEmail.trim(),
        fullName: formFullName.trim(),
      };
      if (formPassword.trim()) {
        data.password = formPassword;
      }
      const coinBalance = Number(formCoinBalance);
      if (!Number.isNaN(coinBalance)) {
        data.coinBalance = coinBalance;
      }
      data.subscriptionPackageId = formSubscriptionPackageId ? Number(formSubscriptionPackageId) : null;
      await accountService.update(modal.account.id, data);
      closeModal();
      await loadAccounts();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await accountService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadAccounts();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(account: AccountResponse) {
    const newStatus = account.status === AccountStatus.Active
      ? AccountStatus.Inactive
      : AccountStatus.Active;
    setActionLoading(true);
    try {
      await accountService.updateStatus(account.id, { status: newStatus });
      await loadAccounts();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3, color: '#000' }}>
        Quản lý tài khoản giáo viên
      </Typography>

      {error && (
        <Typography role="alert" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Button
        variant="contained"
        onClick={openCreateModal}
        className="btn btn-add"
        sx={{ mb: 2, minHeight: 44 }}
      >
        Thêm tài khoản
      </Button>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : accounts.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4 }} color="text.secondary">
          Không có tài khoản nào
        </Typography>
      ) : (
        <>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {accounts.map((account) => (
              <Card key={account.id} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, wordBreak: 'break-word' }}>
                    {account.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, wordBreak: 'break-all' }}>
                    {account.email}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>ECoin</Typography>
                      <Typography variant="body2">{account.coinBalance.toLocaleString('vi-VN')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Trạng thái</Typography>
                      <Typography variant="body2">
                        {account.status === AccountStatus.Active ? 'Hoạt động' : 'Vô hiệu hóa'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => openEditModal(account)} disabled={actionLoading} sx={{ minHeight: 44 }}>Sửa</Button>
                    <Button fullWidth variant="outlined" color="error" onClick={() => setDeleteTarget(account)} disabled={actionLoading} sx={{ minHeight: 44 }}>Xóa</Button>
                    <Button fullWidth variant="outlined" onClick={() => handleToggleStatus(account)} disabled={actionLoading} sx={{ minHeight: 44 }}>
                      {account.status === AccountStatus.Active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Họ và tên</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ECoin</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id} hover>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>{account.fullName}</TableCell>
                    <TableCell>{account.coinBalance.toLocaleString('vi-VN')}</TableCell>
                    <TableCell>
                      {account.status === AccountStatus.Active ? 'Hoạt động' : 'Vô hiệu hóa'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => openEditModal(account)} disabled={actionLoading} className="btn btn-update" style={{ marginRight: 8, minHeight: 44 }}>Sửa</button>
                        <button type="button" onClick={() => setDeleteTarget(account)} disabled={actionLoading} className="btn btn-delete" style={{ marginRight: 8, minHeight: 44 }}>Xóa</button>
                        <button type="button" onClick={() => handleToggleStatus(account)} disabled={actionLoading} className="btn btn-view" style={{ minHeight: 44 }}>
                          {account.status === AccountStatus.Active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Create / Edit Modal */}
      {modal.type && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>
              {modal.type === 'create' ? 'Thêm tài khoản' : 'Sửa tài khoản'}
            </h2>

            {formError && (
              <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
                {formError}
              </div>
            )}

            <form onSubmit={modal.type === 'create' ? handleCreateSubmit : handleEditSubmit} noValidate>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="modal-email" style={{ display: 'block', marginBottom: 4 }}>Email</label>
                <input
                  id="modal-email"
                  type="email"
                  placeholder="Nhập email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="modal-password" style={{ display: 'block', marginBottom: 4 }}>
                  Mật khẩu{modal.type === 'edit' ? ' (để trống nếu không đổi)' : ''}
                </label>
                <input
                  id="modal-password"
                  type="password"
                  placeholder={modal.type === 'edit' ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="modal-fullname" style={{ display: 'block', marginBottom: 4 }}>Họ và tên</label>
                <input
                  id="modal-fullname"
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {modal.type === 'edit' && (
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="modal-coin-balance" style={{ display: 'block', marginBottom: 4 }}>ECoin</label>
                  <input
                    id="modal-coin-balance"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={formCoinBalance}
                    onChange={(e) => setFormCoinBalance(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              {modal.type === 'edit' && (
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="modal-subscription" style={{ display: 'block', marginBottom: 4 }}>Gói đăng ký</label>
                  <select
                    id="modal-subscription"
                    value={formSubscriptionPackageId}
                    onChange={(e) => setFormSubscriptionPackageId(e.target.value)}
                    style={inputStyle}
                  >
                    {subscriptionPackages.map((pkg) => (
                      <option key={pkg.id} value={String(pkg.id)}>
                        {pkg.name} {pkg.isDefault ? '(mặc định)' : ''} — {pkg.price === 0 ? 'Miễn phí' : `${pkg.price.toLocaleString('vi-VN')} VND`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={actionLoading}
                  className="btn btn-neutral"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-update"
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
              Bạn có chắc chắn muốn xóa tài khoản <strong>{deleteTarget.email}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
                className="btn btn-neutral"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="btn btn-delete"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
}

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
  width: '100%',
  maxWidth: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  boxSizing: 'border-box',
};
