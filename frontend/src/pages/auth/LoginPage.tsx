import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { login } from '../../services/authService';
import { Role } from '../../types/auth';
import type { ApiError } from '../../types/common';
import { AxiosError } from 'axios';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/?api\/?$/, '');

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
    window.location.assign(`${API_ROOT}/api/auth/google/start`);
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" sx={{ textAlign: 'center', mb: 3, fontWeight: 700 }}>
            Đăng nhập
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                id="email"
                label="Email"
                type="email"
                placeholder="Nhập email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                fullWidth
              />

              <TextField
                id="password"
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                }
                label="Hiện mật khẩu"
              />

              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </Button>
            </Stack>
          </Box>

          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="contained"
            size="large"
            fullWidth
            sx={{
              mt: 1.5,
              bgcolor: '#ffffff',
              color: 'primary.main',
              border: '1px solid',
              borderColor: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(0, 107, 95, 0.08)',
              },
            }}
          >
            Đăng nhập bằng Google
          </Button>

          <Typography sx={{ mt: 2.5, textAlign: 'center' }}>
            Chưa có tài khoản?{' '}
            <Box component={Link} to="/register" sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 650 }}>
              Đăng ký
            </Box>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
