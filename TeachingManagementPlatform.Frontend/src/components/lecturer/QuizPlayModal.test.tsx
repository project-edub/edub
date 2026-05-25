import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuizPlayModal from './QuizPlayModal';

vi.mock('../../services/miniGameService', () => ({
  createMiniGame: vi.fn(),
  getMiniGame: vi.fn(),
  getMiniGamePlayData: vi.fn(),
  deleteMiniGame: vi.fn(),
}));

import * as miniGameService from '../../services/miniGameService';

const samplePlayData = {
  id: 1,
  name: 'Quiz chương 1',
  type: 'Quiz' as const,
  content: {
    questions: [
      {
        question: 'Thủ đô của Việt Nam là gì?',
        options: ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Huế'],
        answer: 'Hà Nội',
      },
      {
        question: '1 + 1 = ?',
        options: ['1', '2', '3', '4'],
        answer: '2',
      },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('QuizPlayModal', () => {
  it('renders quiz questions after loading', async () => {
    vi.mocked(miniGameService.getMiniGamePlayData).mockResolvedValue(samplePlayData);
    render(<QuizPlayModal miniGameId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Quiz chương 1')).toBeInTheDocument();
      expect(screen.getByText(/Thủ đô của Việt Nam là gì/)).toBeInTheDocument();
      expect(screen.getByText(/1 \+ 1 = \?/)).toBeInTheDocument();
    });
  });

  it('shows correct/incorrect feedback after selecting an answer', async () => {
    const user = userEvent.setup();
    vi.mocked(miniGameService.getMiniGamePlayData).mockResolvedValue(samplePlayData);
    render(<QuizPlayModal miniGameId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Hà Nội')).toBeInTheDocument();
    });

    // Select correct answer
    await user.click(screen.getByText('Hà Nội'));

    // The correct answer should show a checkmark
    await waitFor(() => {
      expect(screen.getByText(/Hà Nội/)).toBeInTheDocument();
    });
  });

  it('shows wrong answer feedback when incorrect option selected', async () => {
    const user = userEvent.setup();
    vi.mocked(miniGameService.getMiniGamePlayData).mockResolvedValue(samplePlayData);
    render(<QuizPlayModal miniGameId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TP.HCM')).toBeInTheDocument();
    });

    // Select wrong answer
    await user.click(screen.getByText('TP.HCM'));

    await waitFor(() => {
      expect(screen.getByText(/Đáp án đúng: Hà Nội/)).toBeInTheDocument();
    });
  });

  it('shows result after all questions answered', async () => {
    const user = userEvent.setup();
    vi.mocked(miniGameService.getMiniGamePlayData).mockResolvedValue(samplePlayData);
    render(<QuizPlayModal miniGameId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Hà Nội')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Hà Nội'));
    await user.click(screen.getByText('2'));

    await waitFor(() => {
      expect(screen.getByText(/Kết quả: 2\/2 câu đúng/)).toBeInTheDocument();
    });
  });

  it('shows error when API fails', async () => {
    vi.mocked(miniGameService.getMiniGamePlayData).mockRejectedValue({
      response: { data: { error: { message: 'Không tìm thấy mini game' } } },
    });
    render(<QuizPlayModal miniGameId={999} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Không tìm thấy mini game');
    });
  });

  it('calls onClose when Đóng is clicked', async () => {
    const onClose = vi.fn();
    vi.mocked(miniGameService.getMiniGamePlayData).mockResolvedValue(samplePlayData);
    render(<QuizPlayModal miniGameId={1} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Đóng')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Đóng'));
    expect(onClose).toHaveBeenCalled();
  });
});
