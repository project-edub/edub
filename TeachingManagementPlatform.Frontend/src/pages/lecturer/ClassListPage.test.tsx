import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClassListPage from './ClassListPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/classService', () => ({
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import * as classService from '../../services/classService';

const sampleClasses = [
  { id: 1, lecturerId: 1, name: 'Lớp 10A1', year: '2024-2025', studentCount: 35, assignedLessonPlanId: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 2, lecturerId: 1, name: 'Lớp 11B2', year: '2024-2025', studentCount: 30, assignedLessonPlanId: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ClassListPage />
    </MemoryRouter>,
  );
}

describe('ClassListPage', () => {
  it('renders class list table with Vietnamese headers', async () => {
    vi.mocked(classService.getAll).mockResolvedValue(sampleClasses);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tên lớp')).toBeInTheDocument();
      expect(screen.getByText('Năm học')).toBeInTheDocument();
      expect(screen.getByText('Số học sinh')).toBeInTheDocument();
      expect(screen.getByText('Hành động')).toBeInTheDocument();
    });
  });

  it('displays classes from API', async () => {
    vi.mocked(classService.getAll).mockResolvedValue(sampleClasses);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lớp 10A1')).toBeInTheDocument();
      expect(screen.getByText('Lớp 11B2')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });
  });

  it('shows empty message when no classes', async () => {
    vi.mocked(classService.getAll).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Không có lớp học nào')).toBeInTheDocument();
    });
  });

  it('opens create modal and submits new class', async () => {
    const user = userEvent.setup();
    vi.mocked(classService.getAll).mockResolvedValue([]);
    vi.mocked(classService.create).mockResolvedValue({
      id: 3, lecturerId: 1, name: 'Lớp Mới', year: '2025-2026', studentCount: 0,
      assignedLessonPlanId: null, createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Thêm lớp/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Thêm lớp/));
    expect(screen.getByText('Thêm lớp học')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Tên lớp'), 'Lớp Mới');
    await user.type(screen.getByLabelText('Năm học'), '2025-2026');
    await user.click(screen.getByText('Lưu'));

    await waitFor(() => {
      expect(classService.create).toHaveBeenCalledWith({ name: 'Lớp Mới', year: '2025-2026' });
    });
  });

  it('shows validation error when form fields are empty', async () => {
    const user = userEvent.setup();
    vi.mocked(classService.getAll).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Thêm lớp/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Thêm lớp/));
    await user.click(screen.getByText('Lưu'));

    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập đầy đủ thông tin');
  });

  it('navigates to class detail when clicking class name', async () => {
    const user = userEvent.setup();
    vi.mocked(classService.getAll).mockResolvedValue(sampleClasses);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lớp 10A1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Lớp 10A1'));
    expect(mockNavigate).toHaveBeenCalledWith('/lecturer/classes/1');
  });

  it('opens delete confirmation and deletes class', async () => {
    const user = userEvent.setup();
    vi.mocked(classService.getAll).mockResolvedValue(sampleClasses);
    vi.mocked(classService.remove).mockResolvedValue(undefined);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTitle('Xóa')[0]).toBeInTheDocument();
    });

    await user.click(screen.getAllByTitle('Xóa')[0]);
    expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();

    // The confirm delete button is the one with btn-delete class inside the modal
    const deleteButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent === 'Xóa' && btn.classList.contains('btn-delete'),
    );
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(classService.remove).toHaveBeenCalledWith(1);
    });
  });

  it('opens edit modal with pre-filled data', async () => {
    const user = userEvent.setup();
    vi.mocked(classService.getAll).mockResolvedValue(sampleClasses);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTitle('Sửa')[0]).toBeInTheDocument();
    });

    await user.click(screen.getAllByTitle('Sửa')[0]);
    expect(screen.getByText('Sửa lớp học')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên lớp')).toHaveValue('Lớp 10A1');
    expect(screen.getByLabelText('Năm học')).toHaveValue('2024-2025');
  });
});
