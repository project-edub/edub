import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LessonPlanPage from './LessonPlanPage';

vi.mock('../../services/lessonPlanService', () => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import * as lessonPlanService from '../../services/lessonPlanService';

const samplePlans = [
  { id: 1, subject: 'Toán', grade: 'Lớp 10', schoolYearStart: '2024', schoolYearEnd: '2025', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 2, subject: 'Văn', grade: 'Lớp 11', schoolYearStart: '2024', schoolYearEnd: '2025', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

const sampleFullPlan = {
  id: 1,
  lecturerId: 1,
  subject: 'Toán',
  grade: 'Lớp 10',
  schoolYearStart: '2024',
  schoolYearEnd: '2025',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  lessons: [
    { id: 1, lessonPlanId: 1, name: 'Bài 1', orderIndex: 1, scheduledDate: null, documents: [], attachments: [], miniGames: [] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LessonPlanPage />
    </MemoryRouter>,
  );
}

describe('LessonPlanPage', () => {
  it('renders table with Vietnamese headers', async () => {
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Môn')).toBeInTheDocument();
      expect(screen.getByText('Khối')).toBeInTheDocument();
      expect(screen.getByText('Niên khóa')).toBeInTheDocument();
      expect(screen.getByText('Hành động')).toBeInTheDocument();
    });
  });

  it('displays lesson plans from API', async () => {
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Toán')).toBeInTheDocument();
      expect(screen.getByText('Văn')).toBeInTheDocument();
      expect(screen.getByText('Lớp 10')).toBeInTheDocument();
      expect(screen.getByText('Lớp 11')).toBeInTheDocument();
    });
  });

  it('shows empty message when no plans', async () => {
    vi.mocked(lessonPlanService.getAll).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Không có giáo án nào')).toBeInTheDocument();
    });
  });

  it('opens create modal and submits new lesson plan', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue([]);
    vi.mocked(lessonPlanService.create).mockResolvedValue(sampleFullPlan);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Thêm giáo án')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Thêm giáo án'));
    expect(screen.getByText('Thêm giáo án', { selector: 'h2' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Nhập môn học'), 'Toán');
    await user.type(screen.getByPlaceholderText('VD: 2024'), '2024');
    await user.type(screen.getByPlaceholderText('VD: 2025'), '2025');
    await user.click(screen.getByText('Lưu'));

    await waitFor(() => {
      expect(lessonPlanService.create).toHaveBeenCalledWith({
        subject: 'Toán',
        grade: 'Lớp 1',
        schoolYearStart: '2024',
        schoolYearEnd: '2025',
        lessons: [],
      });
    });
  });

  it('shows validation error when required fields are empty', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Thêm giáo án')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Thêm giáo án'));
    await user.click(screen.getByText('Lưu'));

    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập đầy đủ thông tin');
  });

  it('adds and removes lessons in the modal', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Thêm giáo án')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Thêm giáo án'));

    // Add a lesson
    await user.click(screen.getByText('Thêm bài học'));
    expect(screen.getByLabelText('Bài học 1')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Bài học 1'), 'Bài mở đầu');

    // Add another lesson
    await user.click(screen.getByText('Thêm bài học'));
    expect(screen.getByLabelText('Bài học 2')).toBeInTheDocument();

    // Remove first lesson
    const removeButtons = screen.getAllByText('Xóa bài học');
    await user.click(removeButtons[0]);

    // Only one lesson should remain
    expect(screen.queryByLabelText('Bài học 2')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bài học 1')).toBeInTheDocument();
  });

  it('opens edit modal with pre-filled data', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(lessonPlanService.getById).mockResolvedValue(sampleFullPlan);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Sửa')[0]).toBeInTheDocument();
    });

    await user.click(screen.getAllByText('Sửa')[0]);

    await waitFor(() => {
      expect(screen.getByText('Sửa giáo án')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Nhập môn học')).toHaveValue('Toán');
    expect(screen.getByPlaceholderText('VD: 2024')).toHaveValue('2024');
    expect(screen.getByPlaceholderText('VD: 2025')).toHaveValue('2025');
  });

  it('opens delete confirmation and deletes plan', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(lessonPlanService.remove).mockResolvedValue(undefined);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Xóa')[0]).toBeInTheDocument();
    });

    await user.click(screen.getAllByText('Xóa')[0]);
    expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();

    const deleteButtons = screen.getAllByText('Xóa');
    const confirmDeleteBtn = deleteButtons.find(
      (btn) => (btn as HTMLElement).style?.color === 'rgb(211, 47, 47)'
    );
    await user.click(confirmDeleteBtn!);

    await waitFor(() => {
      expect(lessonPlanService.remove).toHaveBeenCalledWith(1);
    });
  });

  it('calls getAll with filter params when filter button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lọc')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Môn học'), 'Toán');
    await user.type(screen.getByLabelText('Khối lớp'), 'Lớp 10');
    await user.click(screen.getByText('Lọc'));

    await waitFor(() => {
      expect(lessonPlanService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Toán', grade: 'Lớp 10' })
      );
    });
  });
});
