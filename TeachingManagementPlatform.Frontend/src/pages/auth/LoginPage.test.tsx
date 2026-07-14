import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from './LoginPage';

vi.mock('../../theme/ColorModeContext', () => ({
  useColorMode: () => ({
    mode: 'light',
    setMode: () => {},
    toggleMode: () => {},
    primaryColor: '#c48a10',
    setPrimaryColor: () => {},
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/authService', () => ({
  login: vi.fn(),
  googleLogin: vi.fn(),
}));

import { login } from '../../services/authService';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('renders email and password fields with Vietnamese labels', () => {
    renderLogin();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
  });

  it('renders submit and Google login buttons', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập bằng Google' })).toBeInTheDocument();
  });

  it('renders link to register page', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: 'Đăng ký' });
    expect(link).toHaveAttribute('href', '/register');
  });

  it('shows validation error when fields are empty', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập đầy đủ email và mật khẩu');
  });

  it('stores JWT and redirects Admin to /admin/accounts on success', async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockResolvedValue({ token: 'jwt-admin', role: 'Admin' });
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'admin@test.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt-admin');
      expect(mockNavigate).toHaveBeenCalledWith('/admin/accounts', { replace: true });
    });
  });

  it('stores JWT and redirects Lecturer to /lecturer/overview on success', async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockResolvedValue({ token: 'jwt-lecturer', role: 'Lecturer' });
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'lecturer@test.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt-lecturer');
      expect(mockNavigate).toHaveBeenCalledWith('/lecturer/overview', { replace: true });
    });
  });

  it('displays Vietnamese error message from API on failure', async () => {
    const user = userEvent.setup();
    const apiError = {
      response: { data: { error: { code: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng' } }, status: 401 },
      isAxiosError: true,
    };
    vi.mocked(login).mockRejectedValue(apiError);
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'bad@test.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Tên đăng nhập hoặc mật khẩu không đúng');
    });
  });
});
