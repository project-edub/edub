import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CircleUser, LogOut, GraduationCap } from 'lucide-react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
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
  { to: '/lecturer/quiz-generator', label: 'Quiz', tourId: 'tour-quiz' },
  { to: '/lecturer/crossword', label: 'Tạo Crossword' },
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

  // Subscription status
  const [subName, setSubName] = useState<string | null>(null);
  const [subExpires, setSubExpires] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [freeEcoinBalance, setFreeEcoinBalance] = useState<number | null>(null);
  const [freeEcoinMax, setFreeEcoinMax] = useState<number>(50);

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
    ? Math.max(0, Math.ceil((new Date(subExpires).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

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
              <CircleUser size={24} />
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
              startIcon={<LogOut size={18} />}
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
                {...('tourId' in item && item.tourId ? { 'data-tour-id': item.tourId } : {})}
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
            p: { xs: 1, sm: 2 },
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
