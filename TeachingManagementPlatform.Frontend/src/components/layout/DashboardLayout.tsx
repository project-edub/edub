import { NavLink, useNavigate } from 'react-router-dom';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import {
  Avatar,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types/auth';
import { useColorMode } from '../../theme/ColorModeContext';

const lecturerMenuItems = [
  { to: '/lecturer/overview', label: 'Thông tin cá nhân' },
  { to: '/lecturer/classes', label: 'Danh sách lớp' },
  { to: '/lecturer/lesson-plans', label: 'Giáo án' },
  { to: '/lecturer/storage', label: 'Kho tài liệu' },
];

const adminMenuItems = [
  { to: '/admin/accounts', label: 'Quản lý tài khoản' },
  { to: '/admin/subscriptions', label: 'Gói đăng ký' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { mode, toggleMode } = useColorMode();
  const menuItems = role === Role.Admin ? adminMenuItems : lecturerMenuItems;

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', p: { xs: 1.5, md: 2 }, gap: 2 }}>
      <Paper
        component="nav"
        aria-label="Menu chính"
        elevation={0}
        sx={{
          width: { xs: 86, sm: 260 },
          borderRadius: 6,
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 1, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 16,
          height: 'calc(100vh - 32px)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.2, px: 1, pb: 1.5, minHeight: 56 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
            <SchoolOutlinedIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 700 }}>
            EduB
          </Typography>
        </Box>

        <Divider sx={{ mb: 1 }} />

        <List sx={{ flex: 1, pt: 0.5, overflowY: 'auto', minHeight: 0 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              sx={{
                borderRadius: 4,
                mb: 0.5,
                px: { xs: 1.25, sm: 1.5 },
                justifyContent: { xs: 'center', sm: 'flex-start' },
                color: 'text.secondary',
                '&.active': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
                '&:hover': {
                  bgcolor: 'rgba(196, 138, 16, 0.12)',
                },
              }}
            >
              <ListItemText
                primary={
                  <Typography sx={{ fontSize: 14, fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                    {item.label}
                  </Typography>
                }
              />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Button
            onClick={toggleMode}
            variant="text"
            fullWidth
            aria-label={mode === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
            sx={{ minWidth: 0, mb: 0.75, py: 0.6, fontSize: 18 }}
          >
            {mode === 'light' ? '🌙' : '☀️'}
          </Button>
          <Divider sx={{ mb: 1 }} />
          <Button
            onClick={handleLogout}
            variant="contained"
            color="error"
            fullWidth
            startIcon={<LogoutRoundedIcon />}
            sx={{ minWidth: 0, px: { xs: 1, sm: 2 }, justifyContent: 'center' }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Đăng xuất
            </Box>
          </Button>
        </Box>
      </Paper>

      <Box component="main" sx={{ flex: 1, minWidth: 0, pb: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
