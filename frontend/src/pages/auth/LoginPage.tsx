import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, googleLogin } from '../../services/authService';
import { Role } from '../../types/auth';
import type { ApiError } from '../../types/common';
import { AxiosError } from 'axios';

function redirectForRole(role: string, navigate: ReturnType<typeof useNavigate>) {
  if (role === Role.Admin) {
    navigate('/admin/accounts', { replace: true });
  } else {
    navigate('/lecturer/overview', { replace: true });
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem('token', res.token);
      redirectForRole(res.role, navigate);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.error?.message;
      setError(msg || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      // Basic Google login — sends a placeholder token for now.
      // Full Google SDK integration can be added later.
      const idToken = (window as unknown as Record<string, string>).__googleIdToken ?? '';
      if (!idToken) {
        setError('Không thể kết nối với Google. Vui lòng thử lại.');
        setLoading(false);
        return;
      }
      const res = await googleLogin(idToken);
      localStorage.setItem('token', res.token);
      redirectForRole(res.role, navigate);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.error?.message;
      setError(msg || 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Đăng nhập</h1>

      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 16, textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
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
            autoComplete="current-password"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            Hiện mật khẩu
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-update"
          style={{ width: '100%', marginBottom: 12 }}
        >
          {loading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </form>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="btn btn-neutral"
        style={{ width: '100%', marginBottom: 16 }}
      >
        Đăng nhập bằng Google
      </button>

      <p style={{ textAlign: 'center' }}>
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
      </p>
    </div>
  );
}
