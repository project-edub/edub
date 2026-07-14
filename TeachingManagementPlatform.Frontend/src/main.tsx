import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource-variable/roboto-flex/index.css';
import './index.css';
import App from './App';
import { ColorModeContext, DEFAULT_PRIMARY_COLOR } from './theme/ColorModeContext';
import { createMd3Theme, type ColorMode } from './theme/md3Theme';
import { getUserSettings } from './services/userSettingsService';

const COLOR_MODE_STORAGE_KEY = 'edub-color-mode';
const PRIMARY_COLOR_STORAGE_KEY = 'edub-primary-color';

function AppShell() {
  const [mode, setMode] = useState<ColorMode>(() => {
    const storedMode = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return storedMode === 'dark' ? 'dark' : 'light';
  });

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    const stored = localStorage.getItem(PRIMARY_COLOR_STORAGE_KEY);
    return stored ?? DEFAULT_PRIMARY_COLOR;
  });

  const setPrimaryColor = useCallback((color: string) => {
    setPrimaryColorState(color);
    localStorage.setItem(PRIMARY_COLOR_STORAGE_KEY, color);
  }, []);

  useEffect(() => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    document.documentElement.setAttribute('data-color-mode', mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  // Sync theme from server on app init (non-blocking)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    getUserSettings()
      .then((settings) => {
        if (settings.themeColor) {
          setPrimaryColor(settings.themeColor);
        }
      })
      .catch(() => {
        // Silently ignore - use whatever is in localStorage or default
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const theme = useMemo(() => createMd3Theme(mode, primaryColor), [mode, primaryColor]);

  const colorMode = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((current) => (current === 'light' ? 'dark' : 'light')),
      primaryColor,
      setPrimaryColor,
    }),
    [mode, primaryColor, setPrimaryColor],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
