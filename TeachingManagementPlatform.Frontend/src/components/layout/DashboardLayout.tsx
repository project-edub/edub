import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Drawer,
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
import * as coinService from '../../services/coinService';
import * as subscriptionService from '../../services/subscriptionService';

const lecturerMenuItems = [
  { to: '/lecturer/overview', label: 'Thông tin cá nhân' },
  { to: '/lecturer/classes', label: 'Danh sách lớp' },
  { to: '/lecturer/lesson-plans', label: 'Giáo án' },
  { to: '/lecturer/storage', label: 'Kho tài liệu' },
  { to: '/lecturer/quiz-generator', label: 'Quiz' },
  { to: '/lecturer/crossword', label: 'Tạo Crossword' },
  { to: '/lecturer/subscription', label: 'Gói đăng ký' },
  { to: '/lecturer/coin-packages', label: 'Mua ECoin' },
  { to: '/lecturer/transactions', label: 'Lịch sử giao dịch' },
];

const adminMenuItems = [
  { to: '/admin/accounts', label: 'Quản lý tài khoản' },
  { to: '/admin/subscriptions', label: 'Gói đăng ký' },
  { to: '/admin/coin-packages', label: 'Gói ECoin' },
  { to: '/admin/game-ecoin-config', label: 'Cấu hình ECoin trò chơi' },
  { to: '/admin/score-templates', label: 'Template điểm' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, email } = useAuth();
  const navigate = useNavigate();
  const { mode, toggleMode } = useColorMode();
  const menuItems = role === Role.Admin ? adminMenuItems : lecturerMenuItems;

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Subscription status
  const [subName, setSubName] = useState<string | null>(null);
  const [subExpires, setSubExpires] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [sessionStartedAt] = useState(() => Date.now());

  useEffect(() => {
    if (role !== Role.Admin) {
      // Auto-sync pending payments and load wallet with subscription info
      (async () => {
        try {
          await coinService.syncLatestLecturerCoinPurchase().catch(() => {});
          await subscriptionService.syncLatestSubscriptionPurchase().catch(() => {});
          const wallet = await coinService.getLecturerCoinWallet();
          setSubName(wallet.subscriptionPackageName ?? null);
          setSubExpires(wallet.subscriptionExpiresAt ?? null);
          setCoinBalance(wallet.coinBalance);
        } catch {
          // Subscription status is supplementary to navigation.
        }
      })();
    }
  }, [role]);

  // Calculate days remaining
  const daysRemaining = subExpires
    ? Math.max(0, Math.ceil((new Date(subExpires).getTime() - sessionStartedAt) / (1000 * 60 * 60 * 24)))
    : null;

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }

  function handleDrawerClose() {
    setDrawerOpen(false);
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', p: { xs: 1.5, md: 2 }, gap: 2 }}>
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
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1, minHeight: { xs: 64, md: 72 }, px: { xs: 0, sm: 1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            {/* Mobile hamburger menu button */}
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { xs: 'flex', md: 'none' }, p: 0.5 }}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>

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

          <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1.5 }, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              component={Link}
              to="/"
              variant="text"
              sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' }, minWidth: 0, px: 1 }}
            >
              Trang chủ
            </Button>

            <IconButton
              onClick={toggleMode}
              aria-label={mode === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
              size="large"
              sx={{ p: 0.5, width: 44, height: 44, border: '1px solid', borderColor: 'divider', borderRadius: '50%' }}
            >
              {mode === 'light' ? '🌙' : '☀️'}
            </IconButton>

            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'primary.contrastText', display: { xs: 'none', sm: 'flex' } }}>
              <AccountCircleRoundedIcon />
            </Avatar>

            <Typography
              variant="body2"
              sx={{ fontWeight: 600, maxWidth: { xs: 0, sm: 240 }, wordBreak: 'break-word', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
            >
              {email || 'Chưa có email'}
            </Typography>

            <Button
              onClick={handleLogout}
              variant="outlined"
              color="error"
              startIcon={<LogoutRoundedIcon />}
              sx={{ whiteSpace: 'nowrap', fontSize: { xs: 0.75, sm: 1 }, px: { xs: 1, sm: 1.5 }, minHeight: 44, minWidth: 'auto', flexShrink: 0 }}
            >
              <Box component="span">Đăng xuất</Box>
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerClose}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            p: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Menu
          </Typography>
          <IconButton onClick={handleDrawerClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <List sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 0, mb: 2 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              onClick={handleDrawerClose}
              sx={{
                borderRadius: 2,
                px: 1.5,
                justifyContent: 'flex-start',
                color: 'text.secondary',
                minHeight: 44,
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

        {/* Subscription & ECoin status in drawer */}
        {role !== Role.Admin && (
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
            {coinBalance !== null && (
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                🪙 {coinBalance.toLocaleString('vi-VN')} ECoin
              </Typography>
            )}
            {subName ? (
              <>
                <Chip
                  label={subName}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 600, mb: 0.5 }}
                />
                {daysRemaining !== null && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: daysRemaining <= 5 ? 'error.main' : 'text.secondary' }}>
                    {daysRemaining > 0 ? `Còn ${daysRemaining} ngày` : 'Đã hết hạn'}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Gói: Miễn phí
              </Typography>
            )}
          </Box>
        )}
      </Drawer>

      <Box
        component="main"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
          gap: 2,
          alignItems: 'start',
          minWidth: 0,
        }}
      >
        {/* Desktop Sidebar - Hidden on mobile */}
        <Paper
          component="aside"
          elevation={0}
          sx={{
            display: { xs: 'none', md: 'block' },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 1, sm: 2 },
            position: 'sticky',
            top: 16,
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
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
                  minHeight: 44,
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

          {/* Subscription & ECoin status */}
          {role !== Role.Admin && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              {coinBalance !== null && (
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                  🪙 {coinBalance.toLocaleString('vi-VN')} ECoin
                </Typography>
              )}
              {subName ? (
                <>
                  <Chip
                    label={subName}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  />
                  {daysRemaining !== null && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: daysRemaining <= 5 ? 'error.main' : 'text.secondary' }}>
                      {daysRemaining > 0 ? `Còn ${daysRemaining} ngày` : 'Đã hết hạn'}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Gói: Miễn phí
                </Typography>
              )}
            </Box>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 1.5, sm: 2 },
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
