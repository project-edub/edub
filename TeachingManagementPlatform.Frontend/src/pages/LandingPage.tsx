import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { GraduationCap, BookOpen, Folder, Sparkles } from 'lucide-react';
import { useColorMode } from '../theme/ColorModeContext';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types/auth';

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const FEATURES: FeatureCard[] = [
  {
    title: 'Hồ sơ giảng dạy',
    description: 'Chia sẻ hồ sơ giảng dạy công khai để học viên dễ dàng tìm thấy bạn.',
    icon: <GraduationCap size={40} />,
    path: '/lecturer/overview',
  },
  {
    title: 'Quản lý lớp học',
    description: 'Quản lý danh sách học viên, điểm số và điểm danh một cách hiệu quả.',
    icon: <BookOpen size={40} />,
    path: '/lecturer/classes',
  },
  {
    title: 'Kho tài liệu',
    description: 'Lưu trữ tài liệu giảng dạy trên đám mây, truy cập mọi lúc mọi nơi.',
    icon: <Folder size={40} />,
    path: '/lecturer/storage',
  },
  {
    title: 'Tạo Quiz & Ô chữ bằng AI',
    description: 'Tạo bài quiz trắc nghiệm và ô chữ tự động từ tài liệu bài giảng với AI.',
    icon: <Sparkles size={40} />,
    path: '/lecturer/quiz-generator',
  },
];

export default function LandingPage() {
  const { mode, toggleMode } = useColorMode();
  const { isAuthenticated, email, role } = useAuth();
  const navigate = useNavigate();

  const handleFeatureClick = (path: string) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate('/login');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Navbar */}
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
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, fontWeight: 700, textDecoration: 'none', color: 'inherit' }}
          >
            EduB
          </Typography>

          <Button component={Link} to="/" variant="text" sx={{ whiteSpace: 'nowrap' }}>
            Trang chủ
          </Button>
          <Button component={Link} to="/teachers" variant="text" sx={{ whiteSpace: 'nowrap' }}>
            Tìm giáo viên
          </Button>

          {!isAuthenticated ? (
            <>
              <IconButton
                onClick={toggleMode}
                aria-label={mode === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
                size="large"
                sx={{ p: 0.5 }}
              >
                {mode === 'light' ? '🌙' : '☀️'}
              </IconButton>
              <Button component={Link} to="/login" variant="outlined">Đăng nhập</Button>
              <Button component={Link} to="/register" variant="contained">Đăng ký</Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => navigate(role === Role.Admin ? '/admin/accounts' : '/lecturer/overview')}
                variant="text"
                sx={{ whiteSpace: 'nowrap' }}
              >
                Bảng điều khiển
              </Button>

              <IconButton
                onClick={toggleMode}
                aria-label={mode === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
                size="large"
                sx={{ p: 0.5 }}
              >
                {mode === 'light' ? '🌙' : '☀️'}
              </IconButton>

              <IconButton aria-label="Tài khoản" size="large" sx={{ p: 0.5 }}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                  {email ? email.charAt(0).toUpperCase() : 'U'}
                </Avatar>
              </IconButton>

              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </Typography>

              <Button
                onClick={() => { localStorage.removeItem('token'); navigate('/login', { replace: true }); }}
                variant="outlined"
                color="error"
                sx={{ whiteSpace: 'nowrap' }}
              >
                Đăng xuất
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 8, sm: 10, md: 12, lg: 14 },
          px: { xs: 2, sm: 3, md: 4 },
          textAlign: 'center',
          background: 'linear-gradient(140deg, #c48a10 0%, #e2b23a 100%)',
          color: '#fff',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              mb: { xs: 1.5, md: 2 },
              color: '#fff',
              fontSize: { xs: '2.25rem', sm: '2.75rem', md: '3.25rem', lg: '3.75rem' },
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            EduB
          </Typography>
          <Typography
            variant="h5"
            sx={{
              mb: { xs: 2, md: 3 },
              opacity: 0.9,
              fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
              lineHeight: 1.4,
            }}
          >
            Nền tảng quản lý giảng dạy thông minh cho giáo viên hiện đại
          </Typography>
          <Typography
            sx={{
              opacity: 0.8,
              mb: { xs: 3, md: 4 },
              maxWidth: 600,
              mx: 'auto',
              fontSize: { xs: '0.9rem', sm: '1rem' },
              lineHeight: 1.6,
            }}
          >
            Tạo hồ sơ, quản lý lớp học, lưu trữ tài liệu và tạo quiz bằng AI — tất cả trong một nền tảng duy nhất.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ justifyContent: 'center', alignItems: 'center' }}
          >
            {!isAuthenticated ? (
              <>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: '#fff',
                    color: '#c48a10',
                    '&:hover': { bgcolor: '#f5f5f5' },
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  Bắt đầu miễn phí
                </Button>
                <Button
                  component={Link}
                  to="/login"
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: '#fff',
                    color: '#fff',
                    '&:hover': { borderColor: '#f5f5f5', bgcolor: 'rgba(255,255,255,0.1)' },
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  Đăng nhập
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate(role === Role.Admin ? '/admin/accounts' : '/lecturer/overview')}
                variant="contained"
                size="large"
                sx={{
                  bgcolor: '#fff',
                  color: '#c48a10',
                  '&:hover': { bgcolor: '#f5f5f5' },
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                Vào bảng điều khiển
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, sm: 8, md: 10, lg: 12 },
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              mb: 1.5,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            Tính năng nổi bật
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              textAlign: 'center',
              mb: { xs: 4, sm: 5, md: 6 },
              lineHeight: 1.6,
              maxWidth: 520,
              mx: 'auto',
            }}
          >
            Mọi thứ bạn cần để quản lý việc giảng dạy hiệu quả hơn
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gap: { xs: 2.5, sm: 3, md: 4 },
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
            }}
          >
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: { xs: 3.5, md: 4.5 }, px: { xs: 2, md: 3 } }}>
                  <Box sx={{ color: 'primary.main', mb: 2.5 }}>{feature.icon}</Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 1.5,
                      fontSize: { xs: '1rem', md: '1.1rem' },
                      lineHeight: 1.3,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: { xs: 2.5, md: 3.5 } }}>
                  <Button variant="outlined" onClick={() => handleFeatureClick(feature.path)}>
                    Truy cập
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Find Teacher CTA */}
      <Box
        component="section"
        sx={{
          bgcolor: 'action.hover',
          py: { xs: 7, sm: 8, md: 10 },
          px: { xs: 2, sm: 3 },
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: { xs: 1.5, md: 2 },
              fontSize: { xs: '1.25rem', sm: '1.4rem', md: '1.5rem' },
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            Bạn đang tìm giáo viên?
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              mb: { xs: 3, md: 4 },
              fontSize: { xs: '0.9rem', sm: '1rem' },
              lineHeight: 1.6,
            }}
          >
            Khám phá giảng viên chất lượng với chuyên môn đúng nhu cầu học tập.
          </Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/teachers')}>
            Tìm giáo viên
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
