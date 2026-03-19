import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import type { AccountResponse, CreateAccountRequest, UpdateAccountRequest } from '../../types/account';
import { AccountStatus, type ApiError } from '../../types/common';
import * as accountService from '../../services/accountService';

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
  const [formError, setFormError] = useState('');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await accountService.getAll();
      setAccounts(data);
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
    setFormError('');
    setModal({ type: 'create' });
  }

  function openEditModal(account: AccountResponse) {
    setFormEmail(account.email);
    setFormPassword('');
    setFormFullName(account.fullName);
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
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24, color: '#000' }}>Quản lý tài khoản giảng viên</h1>

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
        Thêm tài khoản
      </button>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Họ và tên</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 16 }}>
                  Không có tài khoản nào
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id}>
                  <td style={tdStyle}>{account.email}</td>
                  <td style={tdStyle}>{account.fullName}</td>
                  <td style={tdStyle}>
                    {account.status === AccountStatus.Active ? 'Hoạt động' : 'Vô hiệu hóa'}
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => openEditModal(account)}
                      disabled={actionLoading}
                      style={{ marginRight: 8, cursor: 'pointer' }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(account)}
                      disabled={actionLoading}
                      style={{ marginRight: 8, cursor: 'pointer' }}
                    >
                      Xóa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(account)}
                      disabled={actionLoading}
                      style={{ cursor: 'pointer' }}
                    >
                      {account.status === AccountStatus.Active ? 'Vô hiệu hóa' : 'Kích hoạt'}
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
              Bạn có chắc chắn muốn xóa tài khoản <strong>{deleteTarget.email}</strong>?
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
