import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterPage from './RegisterPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/authService', () => ({
  register: vi.fn(),
}));

import { register } from '../../services/authService';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  it('renders all fields with Vietnamese labels', () => {
    renderRegister();
    expect(screen.getByLabelText('Họ và tên')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
  });

  it('renders submit button and link to login', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Đăng nhập' });
    expect(link).toHaveAttribute('href', '/login');
  });

  it('shows error when full name is empty', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập họ và tên');
  });

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Mật khẩu'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Email không hợp lệ');
  });

  it('shows error for short password', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Mật khẩu'), '123');
    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Mật khẩu phải có ít nhất 6 ký tự');
  });

  it('stores JWT and redirects to lecturer overview on success', async () => {
    const user = userEvent.setup();
    vi.mocked(register).mockResolvedValue({ token: 'jwt-new', role: 'Lecturer' });
    renderRegister();

    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    await user.type(screen.getByLabelText('Email'), 'new@test.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt-new');
      expect(mockNavigate).toHaveBeenCalledWith('/lecturer/overview', { replace: true });
    });
  });

  it('displays Vietnamese error message from API on failure', async () => {
    const user = userEvent.setup();
    const apiError = {
      response: { data: { error: { code: 'EMAIL_EXISTS', message: 'Email đã được sử dụng' } }, status: 409 },
      isAxiosError: true,
    };
    vi.mocked(register).mockRejectedValue(apiError);
    renderRegister();

    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    await user.type(screen.getByLabelText('Email'), 'exists@test.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Đăng ký' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email đã được sử dụng');
    });
  });
});
