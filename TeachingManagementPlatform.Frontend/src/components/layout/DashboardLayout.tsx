import { Link, NavLink, useNavigate } from 'react-router-dom';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Toolbar,
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
  const { role, email } = useAuth();
  const navigate = useNavigate();
  const { mode, toggleMode } = useColorMode();
  const menuItems = role === Role.Admin ? adminMenuItems : lecturerMenuItems;

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', p: { xs: 1.5, md: 2 }, gap: 2 }}>
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          backgroundImage: 'none',
          px: 1.5,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2, minHeight: 72, px: { xs: 0, sm: 1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <SchoolOutlinedIcon fontSize="small" />
            </Avatar>
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{ fontWeight: 700, textDecoration: 'none', color: 'inherit' }}
            >
              EduB
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              component={Link}
              to="/"
              variant="text"
              sx={{ whiteSpace: 'nowrap' }}
            >
              Trang chủ
            </Button>

            <IconButton
              onClick={toggleMode}
              aria-label={mode === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
              size="large"
              sx={{ p: 0.5 }}
            >
              {mode === 'light' ? '🌙' : '☀️'}
            </IconButton>

            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <AccountCircleRoundedIcon />
            </Avatar>

            <Typography
              variant="body2"
              sx={{ fontWeight: 600, maxWidth: 240, wordBreak: 'break-word', color: 'text.secondary' }}
            >
              {email || 'Chưa có email'}
            </Typography>

            <Button
              onClick={handleLogout}
              variant="outlined"
              color="error"
              startIcon={<LogoutRoundedIcon />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Đăng xuất
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper
          component="aside"
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 1, sm: 2 },
            position: { md: 'sticky' },
            top: { md: 16 },
          }}
        >
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 0 }}>
            {menuItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                sx={{
                  borderRadius: 2,
                  px: { xs: 1.25, sm: 1.5 },
                  justifyContent: 'flex-start',
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
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{item.label}</Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 1, sm: 2 },
            minWidth: 0,
          }}
        >
          <Box component="section" sx={{ minWidth: 0 }}>
            {children}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
