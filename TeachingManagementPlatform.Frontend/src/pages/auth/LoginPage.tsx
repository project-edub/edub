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
import { login } from '../../services/authService';
import { getUserSettings } from '../../services/userSettingsService';
import { Role } from '../../types/auth';
import type { ApiError } from '../../types/common';
import { AxiosError } from 'axios';
import { ArrowLeft } from 'lucide-react';
import { getApiRootUrl } from '../../services/apiConfig';
import { useColorMode, DEFAULT_PRIMARY_COLOR } from '../../theme/ColorModeContext';

const API_ROOT = getApiRootUrl();

function redirectForRole(role: string, navigate: ReturnType<typeof useNavigate>) {
  if (role === Role.Admin) {
    navigate('/admin/accounts', { replace: true });
  } else {
    navigate('/lecturer/overview', { replace: true });
  }
}

type AlertSeverity = 'error' | 'warning' | 'info';

function getAlertSeverity(code: string | null): AlertSeverity {
  switch (code) {
    case 'ACCOUNT_PENDING_VERIFICATION':
      return 'warning';
    case 'GOOGLE_ONLY_ACCOUNT':
      return 'info';
    default:
      return 'error';
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { mode, toggleMode } = useColorMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setErrorCode(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem('token', res.token);

      // Load theme color from user profile; fallback to default if not set or on error
      try {
        const settings = await getUserSettings();
        if (settings.themeColor) {
          localStorage.setItem('edub-primary-color', settings.themeColor);
        } else {
          localStorage.removeItem('edub-primary-color');
        }
      } catch {
        localStorage.setItem('edub-primary-color', DEFAULT_PRIMARY_COLOR);
      }

      redirectForRole(res.role, navigate);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const code = axiosErr.response?.data?.error?.code ?? null;
      const msg = axiosErr.response?.data?.error?.message;
      setErrorCode(code);
      setErrorMessage(msg || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    localStorage.removeItem('googleAccessToken');
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
          <Button component={Link} to="/" variant="text" startIcon={<ArrowLeft size={20} />} sx={{ mr: 'auto' }}>
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
          <Button component={Link} to="/register" variant="outlined">Tạo tài khoản</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h4" sx={{ textAlign: 'center', mb: 3, fontWeight: 700 }}>
              Đăng nhập
            </Typography>

            {errorMessage && (
              <Alert severity={getAlertSeverity(errorCode)} sx={{ mb: 2 }}>
                {errorCode === 'ACCOUNT_PENDING_VERIFICATION' ? (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Tài khoản chưa xác thực
                    </Typography>
                    <Typography variant="body2">
                      Vui lòng kiểm tra email (bao gồm thư mục spam) để hoàn tất đăng ký trước khi đăng nhập.
                    </Typography>
                    {/* Placeholder: Gửi lại email xác thực button - enable when resend endpoint is available */}
                    <Button size="small" disabled sx={{ mt: 1, p: 0, minWidth: 0, textTransform: 'none' }}>
                      Gửi lại email xác thực
                    </Button>
                  </>
                ) : (
                  errorMessage
                )}
              </Alert>
            )}

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
                bgcolor: errorCode === 'GOOGLE_ONLY_ACCOUNT' ? 'primary.main' : 'background.paper',
                color: errorCode === 'GOOGLE_ONLY_ACCOUNT' ? 'primary.contrastText' : 'primary.main',
                border: '1px solid',
                borderColor: 'primary.main',
                '&:hover': {
                  bgcolor: errorCode === 'GOOGLE_ONLY_ACCOUNT' ? 'primary.dark' : 'action.hover',
                },
                ...(errorCode === 'GOOGLE_ONLY_ACCOUNT' && {
                  animation: 'pulse 1.5s ease-in-out 2',
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.02)' },
                  },
                }),
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
    </Box>
  );
}
