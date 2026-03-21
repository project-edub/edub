import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClassLessonPlanTab from './ClassLessonPlanTab';

vi.mock('../../services/lessonPlanService', () => ({
  getAll: vi.fn(),
}));

vi.mock('../../services/classLessonPlanService', () => ({
  getAssignedPlan: vi.fn(),
  assignLessonPlan: vi.fn(),
  updateLessonSchedule: vi.fn(),
}));

vi.mock('./QuizPlayModal', () => ({
  default: ({ miniGameId, onClose }: { miniGameId: number; onClose: () => void }) => (
    <div data-testid="quiz-play-modal">
      Quiz Play {miniGameId}
      <button onClick={onClose}>Đóng</button>
    </div>
  ),
}));

import * as lessonPlanService from '../../services/lessonPlanService';
import * as classLessonPlanService from '../../services/classLessonPlanService';

const samplePlans = [
  { id: 1, subject: 'Toán', grade: '10', schoolYearStart: '2024', schoolYearEnd: '2025', createdAt: '', updatedAt: '' },
  { id: 2, subject: 'Lý', grade: '11', schoolYearStart: '2024', schoolYearEnd: '2025', createdAt: '', updatedAt: '' },
];

const sampleAssignedPlan = {
  lessonPlanId: 1,
  subject: 'Toán',
  grade: '10',
  schoolYearStart: '2024',
  schoolYearEnd: '2025',
  lessons: [
    {
      id: 10,
      name: 'Bài 1: Hàm số',
      orderIndex: 0,
      scheduledDate: '2025-03-15T00:00:00',
      lessonStatus: 'pending' as const,
      documents: [
        { id: 100, name: 'Sách giáo khoa', link: 'https://example.com/sgk', pageRange: '1-20' },
      ],
      attachments: [
        { id: 200, fileName: 'slide.pptx', fileReference: '/files/slide.pptx', fileSize: 2048000 },
      ],
      miniGames: [
        { id: 300, name: 'Quiz Hàm số', description: null, type: 'Quiz', createdAt: '2025-01-01' },
      ],
    },
    {
      id: 11,
      name: 'Bài 2: Phương trình',
      orderIndex: 1,
      scheduledDate: null,
      lessonStatus: 'unfinish' as const,
      documents: [],
      attachments: [],
      miniGames: [],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ClassLessonPlanTab', () => {
  it('shows loading state initially', () => {
    vi.mocked(lessonPlanService.getAll).mockReturnValue(new Promise(() => {}));
    vi.mocked(classLessonPlanService.getAssignedPlan).mockReturnValue(new Promise(() => {}));
    render(<ClassLessonPlanTab classId={1} />);
    expect(screen.getByText('Đang tải...')).toBeInTheDocument();
  });

  it('shows empty state when no plan assigned', async () => {
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(null);
    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Chưa gán giáo án cho lớp này.')).toBeInTheDocument();
    });
    expect(screen.getByText('Chọn giáo án')).toBeInTheDocument();
    expect(screen.getByText('Gán giáo án')).toBeInTheDocument();
  });

  it('displays lesson plan dropdown with available plans', async () => {
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(null);
    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Toán - 10 (2024-2025)')).toBeInTheDocument();
    });
    expect(screen.getByText('Lý - 11 (2024-2025)')).toBeInTheDocument();
  });

  it('assigns a lesson plan when clicking assign button', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(null);
    vi.mocked(classLessonPlanService.assignLessonPlan).mockResolvedValue(sampleAssignedPlan);

    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Gán giáo án')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Chọn giáo án'), '1');
    await user.click(screen.getByText('Gán giáo án'));

    await waitFor(() => {
      expect(classLessonPlanService.assignLessonPlan).toHaveBeenCalledWith(1, 1);
    });

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Hàm số')).toBeInTheDocument();
    });
  });

  it('displays assigned plan with lesson list', async () => {
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(sampleAssignedPlan);
    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Hàm số')).toBeInTheDocument();
    });
    expect(screen.getByText('Bài 2: Phương trình')).toBeInTheDocument();
  });

  it('filters lessons by search term', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(sampleAssignedPlan);
    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Hàm số')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Tìm kiếm bài học'), 'Phương trình');

    expect(screen.queryByText('Bài 1: Hàm số')).not.toBeInTheDocument();
    expect(screen.getByText('Bài 2: Phương trình')).toBeInTheDocument();
  });

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(sampleAssignedPlan);
    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Hàm số')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Tìm kiếm bài học'), 'xyz không tồn tại');

    expect(screen.getByText('Không tìm thấy bài học nào')).toBeInTheDocument();
  });

  it('expands lesson to show documents, attachments, and mini games', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(sampleAssignedPlan);
    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Hàm số')).toBeInTheDocument();
    });

    // Click to expand
    await user.click(screen.getByText('Bài 1: Hàm số'));

    // Documents section
    expect(screen.getByText('Tài liệu')).toBeInTheDocument();
    expect(screen.getByText('Sách giáo khoa')).toBeInTheDocument();
    expect(screen.getByText('1-20')).toBeInTheDocument();

    // Attachments section
    expect(screen.getByText('Tệp đính kèm')).toBeInTheDocument();
    expect(screen.getByText('slide.pptx')).toBeInTheDocument();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();

    // Mini games section
    expect(screen.getByText('Mini game')).toBeInTheDocument();
    expect(screen.getByText('Quiz Hàm số')).toBeInTheDocument();
    expect(screen.getByText('Chơi')).toBeInTheDocument();
  });

  it('opens QuizPlayModal when clicking play button', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(sampleAssignedPlan);
    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Hàm số')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Bài 1: Hàm số'));
    await user.click(screen.getByText('Chơi'));

    expect(screen.getByTestId('quiz-play-modal')).toBeInTheDocument();
    expect(screen.getByText('Quiz Play 300')).toBeInTheDocument();
  });

  it('updates lesson schedule date', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(sampleAssignedPlan);
    vi.mocked(classLessonPlanService.updateLessonSchedule).mockResolvedValue({
      ...sampleAssignedPlan.lessons[1],
      scheduledDate: '2025-04-01T00:00:00',
      lessonStatus: 'unfinish',
    });
    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Bài 2: Phương trình')).toBeInTheDocument();
    });

    const dateInputs = screen.getAllByLabelText(/Ngày dạy/);
    // Second lesson's date input
    await user.type(dateInputs[1], '2025-04-01');

    await waitFor(() => {
      expect(classLessonPlanService.updateLessonSchedule).toHaveBeenCalled();
    });
  });

  it('shows error when API call fails', async () => {
    vi.mocked(lessonPlanService.getAll).mockRejectedValue({
      response: { data: { error: { code: 'ERROR', message: 'Lỗi tải dữ liệu' } } },
    });
    vi.mocked(classLessonPlanService.getAssignedPlan).mockRejectedValue({
      response: { data: { error: { code: 'ERROR', message: 'Lỗi tải dữ liệu' } } },
    });
    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Lỗi tải dữ liệu');
    });
  });

  it('updates lesson status', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonPlanService.getAll).mockResolvedValue(samplePlans);
    vi.mocked(classLessonPlanService.getAssignedPlan).mockResolvedValue(sampleAssignedPlan);
    vi.mocked(classLessonPlanService.updateLessonSchedule).mockResolvedValue({
      ...sampleAssignedPlan.lessons[0],
      lessonStatus: 'finish',
    });

    render(<ClassLessonPlanTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Hàm số')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Trạng thái Bài 1: Hàm số'), 'finish');

    await waitFor(() => {
      expect(classLessonPlanService.updateLessonSchedule).toHaveBeenCalledWith(
        1,
        10,
        '2025-03-15T00:00:00',
        'finish',
      );
    });
  });
});
