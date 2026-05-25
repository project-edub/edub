import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClassDetailPage from './ClassDetailPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/classService', () => ({
  getById: vi.fn(),
}));

vi.mock('../../services/studentListService', () => ({
  getAll: vi.fn(),
}));

vi.mock('../../services/lessonPlanService', () => ({
  getAll: vi.fn(),
}));

vi.mock('../../services/classLessonPlanService', () => ({
  getAssignedPlan: vi.fn(),
  assignLessonPlan: vi.fn(),
  updateLessonSchedule: vi.fn(),
}));

import * as classService from '../../services/classService';
import * as studentListService from '../../services/studentListService';
import * as lessonPlanService from '../../services/lessonPlanService';
import * as classLessonPlanService from '../../services/classLessonPlanService';

const sampleClass = {
  id: 1, lecturerId: 1, name: 'Lớp 10A1', year: '2024-2025',
  studentCount: 35, assignedLessonPlanId: null,
  createdAt: '2024-01-01', updatedAt: '2024-01-01',
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage(classId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/lecturer/classes/${classId}`]}>
      <Routes>
        <Route path="/lecturer/classes/:id" element={<ClassDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClassDetailPage', () => {
  it('shows loading state initially', () => {
    vi.mocked(classService.getById).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Đang tải...')).toBeInTheDocument();
  });

  it('displays class detail with basic info tab by default', async () => {
    vi.mocked(classService.getById).mockResolvedValue(sampleClass);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Lớp 10A1').length).toBeGreaterThanOrEqual(1);
    });

    // Tab labels
    expect(screen.getByText('Thông tin cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Danh sách học sinh')).toBeInTheDocument();
    expect(screen.getByText('Giáo án')).toBeInTheDocument();

    // Basic info content - class name appears in h1 and in the info table
    expect(screen.getByText('Tên lớp')).toBeInTheDocument();
    expect(screen.getByText('Năm học')).toBeInTheDocument();
    expect(screen.getByText('Số học sinh')).toBeInTheDocument();
    expect(screen.getByText('2024-2025')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('switches to student list tab and shows StudentListTabs', async () => {
    const user = userEvent.setup();
    vi.mocked(classService.getById).mockResolvedValue(sampleClass);
    vi.mocked(studentListService.getAll).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Thông tin cơ bản')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Danh sách học sinh'));

    // Should show the StudentListTabs component (empty state)
    await waitFor(() => {
      expect(screen.getByText('+ Thêm danh sách')).toBeInTheDocument();
    });
  });

  it('switches to lesson plan tab and shows ClassLessonPlanTab', async () => {
    const user = userEvent.setup();
    vi.mocked(classService.getById).mockResolvedValue(sampleClass);
    vi.mocked(lessonPlanService.getAll).mockResolvedValue([]);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(null);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Thông tin cơ bản')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Giáo án'));

    await waitFor(() => {
      expect(screen.getByText('Chưa gán giáo án cho lớp này.')).toBeInTheDocument();
    });
  });

  it('shows error and back button when class not found', async () => {
    vi.mocked(classService.getById).mockRejectedValue({
      response: { data: { error: { code: 'CLASS_NOT_FOUND', message: 'Không tìm thấy lớp học' } } },
    });
    renderPage('999');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Không tìm thấy lớp học');
    });

    expect(screen.getByText('Quay lại danh sách')).toBeInTheDocument();
  });

  it('navigates back to class list when clicking back button', async () => {
    const user = userEvent.setup();
    vi.mocked(classService.getById).mockResolvedValue(sampleClass);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('← Quay lại danh sách')).toBeInTheDocument();
    });

    await user.click(screen.getByText('← Quay lại danh sách'));
    expect(mockNavigate).toHaveBeenCalledWith('/lecturer/classes');
  });
});
