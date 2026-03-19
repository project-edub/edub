import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../services/authService';
import type { ApiError } from '../../types/common';
import { AxiosError } from 'axios';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!fullName.trim()) return 'Vui lòng nhập họ và tên';
    if (!email.trim()) return 'Vui lòng nhập email';
    if (!EMAIL_REGEX.test(email)) return 'Email không hợp lệ';
    if (!password) return 'Vui lòng nhập mật khẩu';
    if (password.length < MIN_PASSWORD_LENGTH)
      return `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`;
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await register(email, password, fullName);
      localStorage.setItem('token', res.token);
      navigate('/lecturer/overview', { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.error?.message;
      setError(msg || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Đăng ký</h1>

      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 16, textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="fullName" style={{ display: 'block', marginBottom: 4 }}>Họ và tên</label>
          <input
            id="fullName"
            type="text"
            placeholder="Nhập họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            autoComplete="name"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input
            id="email"
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            autoComplete="email"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4 }}>Mật khẩu</label>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            autoComplete="new-password"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            Hiện mật khẩu
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 10, marginBottom: 16, cursor: 'pointer' }}
        >
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </form>

      <p style={{ textAlign: 'center' }}>
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </div>
  );
}
