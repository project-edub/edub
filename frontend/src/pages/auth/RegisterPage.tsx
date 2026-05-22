import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControlLabel,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { register } from '../../services/authService';
import type { ApiError } from '../../types/common';
import { AxiosError } from 'axios';
import WestRoundedIcon from '@mui/icons-material/WestRounded';
import { useColorMode } from '../../theme/ColorModeContext';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/?api\/?$/, '');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { mode, toggleMode } = useColorMode();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function getFirstValidationMessage(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;

    const errors = (data as { errors?: unknown }).errors;
    if (!errors || typeof errors !== 'object') return null;

    for (const value of Object.values(errors as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        return value[0];
      }
    }

    return null;
  }

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
      const responseData = axiosErr.response?.data as unknown;
      const msg = axiosErr.response?.data?.error?.message;
      const validationMsg = getFirstValidationMessage(responseData);
      setError(validationMsg || msg || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    window.location.assign(`${API_ROOT}/api/auth/google/start`);
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          backgroundImage: 'none',
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <Button component={Link} to="/" variant="text" startIcon={<WestRoundedIcon />} sx={{ mr: 'auto' }}>
            Về trang chủ
          </Button>
          <Button
            type="button"
            onClick={toggleMode}
            variant="text"
            aria-label={mode === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
            sx={{ minWidth: 0, px: 1, fontSize: 18 }}
          >
            {mode === 'light' ? '🌙' : '☀️'}
          </Button>
          <Button component={Link} to="/login" variant="outlined">Vào đăng nhập</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h4" sx={{ textAlign: 'center', mb: 3, fontWeight: 700 }}>
              Đăng ký
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  id="fullName"
                  label="Họ và tên"
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  fullWidth
                />

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
                  autoComplete="new-password"
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
                  {loading ? 'Đang xử lý...' : 'Đăng ký'}
                </Button>
              </Stack>
            </Box>

            <Button
              type="button"
              onClick={handleGoogleRegister}
              disabled={loading}
              variant="contained"
              size="large"
              fullWidth
              sx={{
                mt: 1.5,
                bgcolor: 'background.paper',
                color: 'primary.main',
                border: '1px solid',
                borderColor: 'primary.main',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              Đăng ký bằng Google
            </Button>

            <Typography sx={{ mt: 2.5, textAlign: 'center' }}>
              Đã có tài khoản?{' '}
              <Box component={Link} to="/login" sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 650 }}>
                Đăng nhập
              </Box>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
