import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material';

function redirectForRole(role: string | null, navigate: ReturnType<typeof useNavigate>) {
  if (role === 'Admin') {
    navigate('/admin/accounts', { replace: true });
    return;
  }

  navigate('/lecturer/overview', { replace: true });
}

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Đang hoàn tất đăng nhập Google...');

  useEffect(() => {
    const token = searchParams.get('token');
    const role = searchParams.get('role');
    const googleAccessToken = searchParams.get('googleAccessToken');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setMessage(errorDescription || error);
      return;
    }

    if (!token) {
      setMessage('Không nhận được thông tin đăng nhập từ Google.');
      return;
    }

    localStorage.setItem('token', token);
    if (googleAccessToken) {
      localStorage.setItem('googleAccessToken', googleAccessToken);
    }
    redirectForRole(role, navigate);
  }, [navigate, searchParams]);

  const error = searchParams.get('error');

  function handleReturn() {
    navigate('/login', { replace: true });
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          {error ? <Alert severity="error" sx={{ width: '100%' }}>{message}</Alert> : <CircularProgress />}
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {error ? 'Không thể đăng nhập bằng Google' : 'Đang xử lý'}
          </Typography>
          <Typography color="text.secondary">
            {error ? 'Bạn có thể quay lại trang đăng nhập và thử lại.' : message}
          </Typography>
          {error && (
            <Button variant="contained" onClick={handleReturn} sx={{ mt: 1 }}>
              Quay lại
            </Button>
          )}
        </Stack>
      </Box>
    </Container>
  );
}