import { alpha, createTheme } from '@mui/material/styles';
import { suggestTextColor } from '../utils/colorContrast';

export type ColorMode = 'light' | 'dark';

/**
 * Derive a lighter tint from a hex color.
 * Blends with white by the given factor (0–1).
 */
function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const blend = (c: number) => Math.round(c + (255 - c) * factor);
  return `#${[blend(r), blend(g), blend(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Derive a darker shade from a hex color.
 * Blends with black by the given factor (0–1).
 */
function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const blend = (c: number) => Math.round(c * (1 - factor));
  return `#${[blend(r), blend(g), blend(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export function createMd3Theme(mode: ColorMode, primaryColor: string = '#c48a10') {
  const isDark = mode === 'dark';

  // Derive palette shades from the dynamic primary color
  const primaryMain = isDark ? lighten(primaryColor, 0.2) : primaryColor;
  const primaryLight = isDark ? lighten(primaryColor, 0.45) : lighten(primaryColor, 0.3);
  const primaryDark = isDark ? darken(primaryColor, 0.15) : darken(primaryColor, 0.3);

  return createTheme({
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
      mode,
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: suggestTextColor(primaryMain),
      },
      secondary: {
        main: isDark ? '#9a8455' : '#9b7941',
        light: isDark ? '#b59f74' : '#c49f64',
        dark: isDark ? '#75633f' : '#6b5228',
      },
      info: {
        main: isDark ? '#c7a15a' : '#cf8d24',
      },
      success: {
        main: isDark ? '#9ca35f' : '#8a8130',
      },
      error: {
        main: isDark ? '#f08282' : '#ba1a1a',
      },
      warning: {
        main: isDark ? '#d9b15f' : '#d89a1f',
      },
      background: {
        default: isDark ? '#2f2a23' : '#fcf7ef',
        paper: isDark ? '#3a342d' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f4ebdb' : '#201a11',
        secondary: isDark ? 'rgba(244, 235, 219, 0.76)' : 'rgba(32, 26, 17, 0.72)',
      },
      divider: isDark
        ? `rgba(232, 216, 186, 0.2)`
        : alpha(primaryColor, 0.16),
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            color: isDark ? '#f4ebdb' : '#201a11',
            background: isDark
              ? 'linear-gradient(180deg, #343027 0%, #2f2a23 100%)'
              : `radial-gradient(circle at 0% 0%, ${alpha(primaryColor, 0.14)} 0%, ${alpha(primaryColor, 0)} 42%), radial-gradient(circle at 100% 100%, ${alpha(primaryLight, 0.12)} 0%, ${alpha(primaryLight, 0)} 42%), linear-gradient(180deg, #fff9e8 0%, #fdf2cf 100%)`,
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
            border: `1px solid ${alpha(theme.palette.primary.main, isDark ? 0.2 : 0.16)}`,
            boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.08)}, 0 10px 24px ${alpha(theme.palette.primary.main, isDark ? 0.07 : 0.11)}`,
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
}
