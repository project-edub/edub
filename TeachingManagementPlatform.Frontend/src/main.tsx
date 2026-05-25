import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource-variable/roboto-flex/index.css';
import './index.css';
import App from './App';
import { ColorModeContext } from './theme/ColorModeContext';
import { createMd3Theme, type ColorMode } from './theme/md3Theme';

const COLOR_MODE_STORAGE_KEY = 'edub-color-mode';

function AppShell() {
  const [mode, setMode] = useState<ColorMode>(() => {
    const storedMode = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return storedMode === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    document.documentElement.setAttribute('data-color-mode', mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const theme = useMemo(() => createMd3Theme(mode), [mode]);

  const colorMode = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((current) => (current === 'light' ? 'dark' : 'light')),
    }),
    [mode],
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
