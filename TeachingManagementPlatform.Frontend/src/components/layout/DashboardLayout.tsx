import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CircleUser, LogOut, GraduationCap, Menu, X } from 'lucide-react';
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
import { useOnboarding } from '../../hooks/useOnboarding';
import { Role } from '../../types/auth';
import { useColorMode } from '../../theme/ColorModeContext';
import * as coinService from '../../services/coinService';
import * as subscriptionService from '../../services/subscriptionService';
import OnboardingTour from '../common/OnboardingTour';

const lecturerMenuItems = [
  { to: '/lecturer/overview', label: 'Thông tin cá nhân' },
  { to: '/lecturer/classes', label: 'Danh sách lớp' },
  { to: '/lecturer/lesson-plans', label: 'Giáo án' },
  { to: '/lecturer/shared-plans', label: 'Giáo án cộng đồng', tourId: 'tour-shared-plans' },
  { to: '/lecturer/storage', label: 'Kho tài liệu', tourId: 'tour-storage' },
  { to: '/lecturer/quiz-generator', label: 'Trắc nghiệm', tourId: 'tour-quiz' },
  { to: '/lecturer/crossword', label: 'Tạo ô chữ' },
  { to: '/lecturer/subscription', label: 'Gói đăng ký' },
  { to: '/lecturer/coin-packages', label: 'Mua ECoin' },
  { to: '/lecturer/transactions', label: 'Lịch sử giao dịch' },
  { to: '/lecturer/settings', label: 'Cài đặt giao diện' },
];

const adminMenuItems = [
  { to: '/admin/dashboard', label: 'Bảng quản lí' },
  { to: '/admin/accounts', label: 'Quản lý tài khoản' },
  { to: '/admin/subscriptions', label: 'Gói đăng ký' },
  { to: '/admin/coin-packages', label: 'Gói ECoin' },
  { to: '/admin/transactions', label: 'Giao dịch' },
  { to: '/admin/game-ecoin-config', label: 'Cấu hình chung' },
  { to: '/admin/score-templates', label: 'Template điểm' },
  { to: '/admin/curriculum-templates', label: 'Mẫu giáo án' },
  { to: '/admin/settings', label: 'Cài đặt giao diện' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, email } = useAuth();
  const navigate = useNavigate();
  const { mode, toggleMode } = useColorMode();
  const { showTour, completeTour } = useOnboarding();
  const menuItems = role === Role.Admin ? adminMenuItems : lecturerMenuItems;

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Subscription status
  const [subName, setSubName] = useState<string | null>(null);
  const [subExpires, setSubExpires] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [freeEcoinBalance, setFreeEcoinBalance] = useState<number | null>(null);
  const [freeEcoinMax, setFreeEcoinMax] = useState<number>(50);
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
          setFreeEcoinBalance(wallet.freeEcoinBalance ?? 0);
          setFreeEcoinMax(wallet.freeEcoinMax ?? 50);
        } catch {}
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
              <Menu size={24} />
            </IconButton>

            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <GraduationCap size={18} />
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

          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, alignItems: 'center', flexWrap: 'nowrap', justifyContent: 'flex-end', minWidth: 0 }}>
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

            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <CircleUser size={24} />
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
              startIcon={<LogOut size={18} />}
              sx={{ whiteSpace: 'nowrap' }}
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
            <X size={20} />
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
                {...('tourId' in item && item.tourId ? { 'data-tour-id': item.tourId } : {})}
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
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    🪙 ECoin
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Miễn phí: {(freeEcoinBalance ?? 0).toLocaleString('vi-VN')}/{freeEcoinMax.toLocaleString('vi-VN')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Trả phí: {coinBalance.toLocaleString('vi-VN')}
                  </Typography>
                </Box>
              )}
              {subName ? (
                <>
                  <Chip
                    label={subName}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: daysRemaining !== null && daysRemaining <= 5 ? 'error.main' : 'text.secondary' }}>
                    {daysRemaining !== null
                      ? (daysRemaining > 0 ? `Còn ${daysRemaining} ngày` : 'Đã hết hạn')
                      : 'Chưa xác định thời hạn'}
                  </Typography>
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

      {/* Onboarding tour for non-admin users */}
      {role !== Role.Admin && (
        <OnboardingTour
          open={showTour}
          onComplete={completeTour}
          onSkip={completeTour}
        />
      )}
    </Box>
  );
}
