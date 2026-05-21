import { alpha, createTheme } from '@mui/material/styles';

export const md3Theme = createTheme({
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Roboto Flex", "Segoe UI", sans-serif',
    h1: {
      fontSize: '2.4rem',
      fontWeight: 650,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.9rem',
      fontWeight: 620,
      lineHeight: 1.25,
      letterSpacing: '-0.01em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#006b5f',
      light: '#4d9c90',
      dark: '#004c42',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4d635f',
      light: '#7b928d',
      dark: '#344844',
    },
    error: {
      main: '#ba1a1a',
    },
    warning: {
      main: '#7a5900',
    },
    background: {
      default: '#f5fbf8',
      paper: '#ffffff',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(circle at 0% 0%, rgba(0, 107, 95, 0.08) 0%, rgba(0, 107, 95, 0) 45%), radial-gradient(circle at 100% 100%, rgba(77, 99, 95, 0.1) 0%, rgba(77, 99, 95, 0) 45%), #f5fbf8',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 24,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.08)}, 0 10px 24px ${alpha(theme.palette.primary.main, 0.08)}`,
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 20,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});
