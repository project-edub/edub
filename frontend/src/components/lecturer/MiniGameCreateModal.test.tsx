import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MiniGameCreateModal from './MiniGameCreateModal';

vi.mock('../../services/miniGameService', () => ({
  createMiniGame: vi.fn(),
  getMiniGame: vi.fn(),
  getMiniGamePlayData: vi.fn(),
  deleteMiniGame: vi.fn(),
}));

import * as miniGameService from '../../services/miniGameService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MiniGameCreateModal', () => {
  it('renders modal with Vietnamese labels', () => {
    render(<MiniGameCreateModal lessonId={1} onClose={vi.fn()} onCreated={vi.fn()} />);

    expect(screen.getByText('Tạo mini game')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên mini game')).toBeInTheDocument();
    expect(screen.getByLabelText('Mô tả')).toBeInTheDocument();
    expect(screen.getByLabelText('Loại')).toBeInTheDocument();
    expect(screen.getByText('Hủy')).toBeInTheDocument();
    expect(screen.getByText('Tạo')).toBeInTheDocument();
  });

  it('has Quiz as the type dropdown option', () => {
    render(<MiniGameCreateModal lessonId={1} onClose={vi.fn()} onCreated={vi.fn()} />);

    const select = screen.getByLabelText('Loại') as HTMLSelectElement;
    expect(select.value).toBe('Quiz');
  });

  it('submits form and calls createMiniGame', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreated = vi.fn();
    vi.mocked(miniGameService.createMiniGame).mockResolvedValue({
      id: 1, lessonId: 1, name: 'Test Quiz', type: 'Quiz', content: null, createdAt: '2024-01-01',
    });

    render(<MiniGameCreateModal lessonId={5} onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByLabelText('Tên mini game'), 'Test Quiz');
    await user.type(screen.getByLabelText('Mô tả'), 'Mô tả quiz');
    await user.click(screen.getByText('Tạo'));

    await waitFor(() => {
      expect(miniGameService.createMiniGame).toHaveBeenCalledWith(5, {
        name: 'Test Quiz',
        description: 'Mô tả quiz',
        type: 'Quiz',
      });
      expect(onCreated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error message with retry button on AI failure', async () => {
    const user = userEvent.setup();
    vi.mocked(miniGameService.createMiniGame).mockRejectedValue({
      response: { data: { error: { message: 'Không thể tạo mini game. Vui lòng thử lại sau.' } } },
    });

    render(<MiniGameCreateModal lessonId={1} onClose={vi.fn()} onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText('Tên mini game'), 'Quiz test');
    await user.click(screen.getByText('Tạo'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Không thể tạo mini game. Vui lòng thử lại sau.');
      expect(screen.getByText('Thử lại')).toBeInTheDocument();
    });
  });

  it('retries on clicking Thử lại', async () => {
    const user = userEvent.setup();
    vi.mocked(miniGameService.createMiniGame)
      .mockRejectedValueOnce({
        response: { data: { error: { message: 'Lỗi AI' } } },
      })
      .mockResolvedValueOnce({
        id: 1, lessonId: 1, name: 'Quiz', type: 'Quiz', content: null, createdAt: '2024-01-01',
      });

    const onCreated = vi.fn();
    render(<MiniGameCreateModal lessonId={1} onClose={vi.fn()} onCreated={onCreated} />);

    await user.type(screen.getByLabelText('Tên mini game'), 'Quiz');
    await user.click(screen.getByText('Tạo'));

    await waitFor(() => {
      expect(screen.getByText('Thử lại')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Thử lại'));

    await waitFor(() => {
      expect(miniGameService.createMiniGame).toHaveBeenCalledTimes(2);
      expect(onCreated).toHaveBeenCalled();
    });
  });

  it('calls onClose when Hủy is clicked', async () => {
    const onClose = vi.fn();
    render(<MiniGameCreateModal lessonId={1} onClose={onClose} onCreated={vi.fn()} />);

    await userEvent.click(screen.getByText('Hủy'));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables Tạo button when name is empty', () => {
    render(<MiniGameCreateModal lessonId={1} onClose={vi.fn()} onCreated={vi.fn()} />);

    const createBtn = screen.getByText('Tạo');
    expect(createBtn).toBeDisabled();
  });
});
