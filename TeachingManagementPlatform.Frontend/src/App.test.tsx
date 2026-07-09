import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from './pages/auth/LoginPage';

vi.mock('./theme/ColorModeContext', () => ({
  useColorMode: () => ({
    mode: 'light',
    setMode: () => {},
    toggleMode: () => {},
    primaryColor: '#c48a10',
    setPrimaryColor: () => {},
  }),
}));

describe('App smoke test', () => {
  it('renders login page heading', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  });
});
