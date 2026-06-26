import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LessonDetailModal from './LessonDetailModal';

vi.mock('../../services/lessonService', () => ({
  getById: vi.fn(),
  addDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  addAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
}));

vi.mock('../../services/miniGameService', () => ({
  createMiniGame: vi.fn(),
  getMiniGame: vi.fn(),
  getMiniGamePlayData: vi.fn(),
  deleteMiniGame: vi.fn(),
}));

import * as lessonService from '../../services/lessonService';
import * as miniGameService from '../../services/miniGameService';

const sampleLesson = {
  id: 1,
  name: 'Bài 1: Giới thiệu',
  orderIndex: 1,
  suggestedPeriods: 1,
  scheduledDate: null,
  documents: [
    { id: 10, name: 'Sách giáo khoa', link: 'https://example.com/sgk', pageRange: '1-20' },
  ],
  attachments: [
    { id: 20, fileName: 'slide.pptx', fileReference: '/files/slide.pptx', fileSize: 2048000 },
  ],
  miniGames: [
    { id: 30, name: 'Quiz chương 1', type: 'Quiz' as const },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LessonDetailModal', () => {
  it('renders lesson detail with three sections', async () => {
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết bài học')).toBeInTheDocument();
      expect(screen.getByText('Bài 1: Giới thiệu')).toBeInTheDocument();
      expect(screen.getByText('Tài liệu')).toBeInTheDocument();
      expect(screen.getByText('Tệp đính kèm')).toBeInTheDocument();
      expect(screen.getByText('Mini game')).toBeInTheDocument();
    });
  });

  it('displays documents with name, link, and page range', async () => {
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sách giáo khoa')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/sgk')).toBeInTheDocument();
      expect(screen.getByText('1-20')).toBeInTheDocument();
    });
  });

  it('displays attachments with file name and size', async () => {
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('slide.pptx')).toBeInTheDocument();
      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    });
  });

  it('displays mini games (read-only)', async () => {
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Quiz chương 1')).toBeInTheDocument();
      expect(screen.getByText('Quiz')).toBeInTheDocument();
    });
  });

  it('shows empty messages when no items', async () => {
    vi.mocked(lessonService.getById).mockResolvedValue({
      ...sampleLesson,
      documents: [],
      attachments: [],
      miniGames: [],
    });
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Chưa có tài liệu nào')).toBeInTheDocument();
      expect(screen.getByText('Chưa có tệp đính kèm nào')).toBeInTheDocument();
      expect(screen.getByText('Chưa có mini game nào')).toBeInTheDocument();
    });
  });

  it('opens add document form and submits', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonService.getById).mockResolvedValue({ ...sampleLesson, documents: [] });
    vi.mocked(lessonService.addDocument).mockResolvedValue({
      id: 11, name: 'Tài liệu mới', link: 'https://example.com/new', pageRange: '5-10',
    });
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Thêm tài liệu')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Thêm tài liệu'));
    expect(screen.getByLabelText('Tên tài liệu')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Tên tài liệu'), 'Tài liệu mới');
    await user.type(screen.getByLabelText('Link tài liệu'), 'https://example.com/new');
    await user.type(screen.getByLabelText('Trang'), '5-10');
    await user.click(screen.getByText('Lưu'));

    await waitFor(() => {
      expect(lessonService.addDocument).toHaveBeenCalledWith(1, {
        name: 'Tài liệu mới',
        link: 'https://example.com/new',
        pageRange: '5-10',
      });
    });
  });

  it('opens edit document form with pre-filled data', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    vi.mocked(lessonService.updateDocument).mockResolvedValue({
      id: 10, name: 'Updated', link: 'https://example.com/updated', pageRange: '1-30',
    });
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sửa')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Sửa'));

    expect(screen.getByLabelText('Tên tài liệu')).toHaveValue('Sách giáo khoa');
    expect(screen.getByLabelText('Link tài liệu')).toHaveValue('https://example.com/sgk');
    expect(screen.getByLabelText('Trang')).toHaveValue('1-20');
  });

  it('deletes a document', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    vi.mocked(lessonService.deleteDocument).mockResolvedValue(undefined);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sách giáo khoa')).toBeInTheDocument();
    });

    // Click the red Xóa button in the documents table
    const deleteButtons = screen.getAllByText('Xóa');
    const docDeleteBtn = deleteButtons.find(
      (btn) => (btn as HTMLElement).style?.color === 'rgb(211, 47, 47)'
    );
    await user.click(docDeleteBtn!);

    await waitFor(() => {
      expect(lessonService.deleteDocument).toHaveBeenCalledWith(10);
    });
  });

  it('deletes an attachment', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    vi.mocked(lessonService.deleteAttachment).mockResolvedValue(undefined);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('slide.pptx')).toBeInTheDocument();
    });

    // Find the delete button in the attachments section
    const deleteButtons = screen.getAllByText('Xóa');
    // The last red delete button should be for the attachment
    const attDeleteBtns = deleteButtons.filter(
      (btn) => (btn as HTMLElement).style?.color === 'rgb(211, 47, 47)'
    );
    // Second red delete button is for attachment (first is for document)
    await user.click(attDeleteBtns[1]);

    await waitFor(() => {
      expect(lessonService.deleteAttachment).toHaveBeenCalledWith(20);
    });
  });

  it('calls onClose when Đóng button is clicked', async () => {
    const onClose = vi.fn();
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    render(<LessonDetailModal lessonId={1} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Đóng')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Đóng'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error when API fails', async () => {
    vi.mocked(lessonService.getById).mockRejectedValue({
      response: { data: { error: { message: 'Không tìm thấy bài học' } } },
    });
    render(<LessonDetailModal lessonId={999} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Không tìm thấy bài học');
    });
  });

  it('displays mini games with Chơi, Xem, Xóa actions', async () => {
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Quiz chương 1')).toBeInTheDocument();
      expect(screen.getByText('Chơi')).toBeInTheDocument();
      expect(screen.getByText('Xem')).toBeInTheDocument();
    });
  });

  it('shows Tạo mini game button', async () => {
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tạo mini game')).toBeInTheDocument();
    });
  });

  it('opens MiniGameCreateModal when Tạo mini game is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tạo mini game')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Tạo mini game'));

    expect(screen.getByLabelText('Tên mini game')).toBeInTheDocument();
    expect(screen.getByLabelText('Mô tả')).toBeInTheDocument();
    expect(screen.getByLabelText('Loại')).toBeInTheDocument();
  });

  it('shows delete confirmation when Xóa mini game is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Quiz chương 1')).toBeInTheDocument();
    });

    // Find the mini game Xóa button (red colored, in the mini games table)
    const deleteButtons = screen.getAllByText('Xóa');
    const miniGameDeleteBtn = deleteButtons[deleteButtons.length - 1];
    await user.click(miniGameDeleteBtn);

    expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
    expect(screen.getByText(/Bạn có chắc chắn muốn xóa mini game/)).toBeInTheDocument();
  });

  it('deletes mini game after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(lessonService.getById).mockResolvedValue(sampleLesson);
    vi.mocked(miniGameService.deleteMiniGame).mockResolvedValue(undefined);
    render(<LessonDetailModal lessonId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Quiz chương 1')).toBeInTheDocument();
    });

    // Click the mini game Xóa button (last red delete button)
    const deleteButtons = screen.getAllByText('Xóa');
    const miniGameDeleteBtn = deleteButtons[deleteButtons.length - 1];
    await user.click(miniGameDeleteBtn);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
    });

    // Find the confirm delete button inside the confirmation dialog
    // It's the red-colored Xóa button within the confirmation overlay
    const allDeleteBtns = screen.getAllByText('Xóa');
    const confirmBtn = allDeleteBtns.find(
      (btn) => {
        const style = (btn as HTMLElement).style;
        const parent = btn.closest('[style*="z-index: 1100"]');
        return style?.color === 'rgb(211, 47, 47)' && parent != null;
      }
    );
    await user.click(confirmBtn!);

    await waitFor(() => {
      expect(miniGameService.deleteMiniGame).toHaveBeenCalledWith(30);
    });
  });
});
