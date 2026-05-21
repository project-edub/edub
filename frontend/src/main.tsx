import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource-variable/roboto-flex/index.css';
import './index.css';
import App from './App';
import { md3Theme } from './theme/md3Theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={md3Theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
