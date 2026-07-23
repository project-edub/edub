import type { ReactNode } from 'react';
import { Box } from '@mui/material';

interface AdminPanelBannerProps {
  children: ReactNode;
}

/** Shared header surface for internal admin pages. */
export default function AdminPanelBanner({ children }: AdminPanelBannerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'flex-start' },
        gap: { xs: 2, md: 3 },
        p: { xs: 2, md: 3 },
        mb: { xs: 2, md: 2.5 },
        borderRadius: { xs: 2, md: 2.5 },
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
        overflow: 'hidden',
        '& > :first-of-type': { minWidth: 0, flex: '1 1 auto' },
        '& > :last-of-type': { width: { xs: '100%', md: 'auto' }, minWidth: { md: 240 }, flex: '0 0 auto' },
      }}
    >
      {children}
    </Box>
  );
}
