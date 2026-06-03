import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Alert,
  Button,
  CircularProgress,
  LinearProgress,
  Typography,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  IconButton,
  Paper,
  Modal,
  Backdrop,
  Fade,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TimerIcon from '@mui/icons-material/Timer';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import * as crosswordService from '../services/crosswordService';
import { PlayerGrid } from '../components/crossword';
import { normalize } from '../utils/viNormalizer';
import type {
  CrosswordPlayerDto,
  CrosswordPlayerWordDto,
  Direction,
  CellState,
  CrosswordGrid,
} from '../types/crossword';

// ── Player game status ────────────────────────────────────────────────────────

export type PlayerGameStatus = 'playing' | 'checking' | 'completed' | 'expired';

// ── Helper: build player grid from words (empty cells for student input) ──────

function buildPlayerGrid(words: CrosswordPlayerWordDto[]): CrosswordGrid {
  if (words.length === 0) return [];

  // Determine grid bounds
  let maxRow = 0;
  let maxCol = 0;

  for (const word of words) {
    if (word.direction === 'across') {
      maxRow = Math.max(maxRow, word.startRow);
      maxCol = Math.max(maxCol, word.startCol + word.wordLength - 1);
    } else {
      maxRow = Math.max(maxRow, word.startRow + word.wordLength - 1);
      maxCol = Math.max(maxCol, word.startCol);
    }
  }

  const rows = maxRow + 1;
  const cols = maxCol + 1;

  // Initialize grid with black cells
  const grid: CrosswordGrid = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      letter: '',
      isBlack: true,
      state: 'empty' as CellState,
    })),
  );

  // Mark word cells as non-black (playable)
  for (const word of words) {
    for (let i = 0; i < word.wordLength; i++) {
      const r = word.direction === 'across' ? word.startRow : word.startRow + i;
      const c = word.direction === 'across' ? word.startCol + i : word.startCol;

      if (r < rows && c < cols) {
        grid[r][c].isBlack = false;
        grid[r][c].state = 'empty';
      }
    }
  }

  // Assign cell numbers (reading order: top→bottom, left→right)
  const numberPositions = new Map<string, number>();
  let cellNumber = 1;

  for (const word of [...words].sort((a, b) => {
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  })) {
    const key = `${word.startRow}-${word.startCol}`;
    if (!numberPositions.has(key)) {
      numberPositions.set(key, cellNumber++);
    }
  }

  numberPositions.forEach((num, key) => {
    const [row, col] = key.split('-').map(Number);
    if (row < rows && col < cols) {
      grid[row][col].cellNumber = num;
    }
  });

  return grid;
}

// ── Helper: format timer ──────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ── Confetti CSS keyframes (inline style) ─────────────────────────────────────

const confettiKeyframes = `
@keyframes confetti-fall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes confetti-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}
`;

// ── Celebration Overlay ───────────────────────────────────────────────────────

interface CelebrationOverlayProps {
  open: boolean;
  elapsedTime: number;
  attemptCount: number;
  onClose: () => void;
}

function CelebrationOverlay({ open, elapsedTime, attemptCount, onClose }: CelebrationOverlayProps) {
  const confettiColors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4'];

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { timeout: 500 } }}
      aria-labelledby="celebration-title"
    >
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 400 },
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 24,
            p: 4,
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Confetti animation */}
          <style>{confettiKeyframes}</style>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
            {confettiColors.map((color, i) =>
              Array.from({ length: 4 }, (_, j) => (
                <Box
                  key={`${i}-${j}`}
                  sx={{
                    position: 'absolute',
                    top: -20,
                    left: `${(i * 4 + j) * (100 / (confettiColors.length * 4))}%`,
                    width: { xs: 6, sm: 8 },
                    height: { xs: 12, sm: 16 },
                    backgroundColor: color,
                    borderRadius: '2px',
                    animation: `confetti-fall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s infinite, confetti-shake ${0.5 + Math.random()}s ease-in-out infinite`,
                  }}
                />
              )),
            )}
          </Box>

          {/* Content */}
          <Typography id="celebration-title" variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Chúc mừng! 🎉
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Bạn đã hoàn thành ô chữ!
          </Typography>

          {/* Stats */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {formatTime(elapsedTime)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Thời gian
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {attemptCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lần kiểm tra
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            onClick={onClose}
            sx={{ mt: 1 }}
            aria-label="Đóng thông báo chúc mừng"
          >
            Đóng
          </Button>
        </Box>
      </Fade>
    </Modal>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CrosswordPlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // ── Core state ──────────────────────────────────────────────────────────
  const [game, setGame] = useState<CrosswordPlayerDto | null>(null);
  const [playerGrid, setPlayerGrid] = useState<CrosswordGrid>([]);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [direction, setDirection] = useState<Direction>('across');
  const [gameStatus, setGameStatus] = useState<PlayerGameStatus>('playing');
  const [timer, setTimer] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  // ── Loading & error ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Check & completion state ────────────────────────────────────────────
  const [correctCount, setCorrectCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [checkResultMessage, setCheckResultMessage] = useState<string | null>(null);

  // ── Mobile bottom sheet ─────────────────────────────────────────────────
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  // ── Selected cell ───────────────────────────────────────────────────────
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // ── Timer ref ───────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch game data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) {
      setError('Đường dẫn không hợp lệ.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchGame() {
      try {
        const data = await crosswordService.getPlayerGame(slug!);

        if (cancelled) return;

        setGame(data);

        // Check if game is expired (deadline passed or server says isExpired)
        const isExpired = checkExpired(data);
        if (isExpired) {
          setGameStatus('expired');
        }

        // Build the player grid from word positions
        const grid = buildPlayerGrid(data.words);
        setPlayerGrid(grid);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không thể tải trò chơi.';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchGame();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ── Timer logic ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStatus]);

  // ── Check deadline expiry ───────────────────────────────────────────────

  function checkExpired(data: CrosswordPlayerDto): boolean {
    // Server already flagged as expired
    if (data.isExpired) return true;

    // Check deadline client-side
    if (data.deadline) {
      const deadlineDate = new Date(data.deadline);
      if (deadlineDate.getTime() < Date.now()) return true;
    }

    return false;
  }

  // ── Cell selection ──────────────────────────────────────────────────────

  const handleCellSelect = useCallback(
    (row: number, col: number) => {
      if (gameStatus !== 'playing') return;

      const cell = playerGrid[row]?.[col];
      if (!cell || cell.isBlack) return;

      // Find words that pass through this cell
      const wordsAtCell = (game?.words ?? []).filter((w) => {
        if (w.direction === 'across') {
          return w.startRow === row && col >= w.startCol && col < w.startCol + w.wordLength;
        } else {
          return w.startCol === col && row >= w.startRow && row < w.startRow + w.wordLength;
        }
      });

      if (wordsAtCell.length === 0) return;

      // Toggle direction if clicking same cell with multiple words
      if (selectedCell?.row === row && selectedCell?.col === col && wordsAtCell.length > 1) {
        const newDirection: Direction = direction === 'across' ? 'down' : 'across';
        setDirection(newDirection);
        const matchingWord = wordsAtCell.find((w) => w.direction === newDirection);
        if (matchingWord) setSelectedWordId(matchingWord.id);
      } else {
        setSelectedCell({ row, col });
        const matchingWord =
          wordsAtCell.find((w) => w.direction === direction) ?? wordsAtCell[0];
        if (matchingWord) {
          setSelectedWordId(matchingWord.id);
          setDirection(matchingWord.direction);
        }
      }
    },
    [gameStatus, playerGrid, game?.words, selectedCell, direction],
  );

  // ── Word selection from clue panel ──────────────────────────────────────

  const handleWordSelect = useCallback(
    (wordId: number) => {
      setSelectedWordId(wordId);
      const word = game?.words.find((w) => w.id === wordId);
      if (word) {
        setSelectedCell({ row: word.startRow, col: word.startCol });
        setDirection(word.direction);
      }
    },
    [game?.words],
  );

  // ── Letter input ─────────────────────────────────────────────────────────

  const handleLetterInput = useCallback(
    (row: number, col: number, letter: string) => {
      if (gameStatus !== 'playing') return;

      setPlayerGrid((prev) => {
        const newGrid = prev.map((r) => r.map((c) => ({ ...c })));
        if (newGrid[row]?.[col]) {
          newGrid[row][col].letter = letter;
          newGrid[row][col].state = letter ? 'filled' : 'empty';
        }
        return newGrid;
      });
    },
    [gameStatus],
  );

  // ── Check answers handler ───────────────────────────────────────────────

  const totalWords = game?.words.length ?? 0;

  const handleCheckAnswers = useCallback(async () => {
    if (!game || !slug || gameStatus !== 'playing') return;

    setIsChecking(true);
    setCheckResultMessage(null);

    try {
      // Collect answers from grid for each word
      const answers: Record<number, string> = {};

      for (const word of game.words) {
        let wordAnswer = '';
        for (let i = 0; i < word.wordLength; i++) {
          const r = word.direction === 'across' ? word.startRow : word.startRow + i;
          const c = word.direction === 'across' ? word.startCol + i : word.startCol;
          const cell = playerGrid[r]?.[c];
          wordAnswer += cell?.letter ?? '';
        }
        // Normalize the student's answer before submitting
        answers[word.id] = normalize(wordAnswer);
      }

      // Call service
      const response = await crosswordService.submitAnswers(slug, { answers });

      // Increment attempt count
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      // Update cell states based on results
      setPlayerGrid((prev) => {
        const newGrid = prev.map((r) => r.map((c) => ({ ...c })));

        for (const result of response.results) {
          const word: CrosswordPlayerWordDto | undefined = game.words.find((w) => w.id === result.wordId);
          if (!word) continue;

          for (let i = 0; i < word.wordLength; i++) {
            const r = word.direction === 'across' ? word.startRow : word.startRow + i;
            const c = word.direction === 'across' ? word.startCol + i : word.startCol;

            if (newGrid[r]?.[c]) {
              // Keep correct cells as 'correct' (don't reset them)
              if (newGrid[r][c].state === 'correct') continue;

              newGrid[r][c].state = result.isCorrect ? 'correct' : 'incorrect';
            }
          }
        }

        return newGrid;
      });

      // Update correct count
      setCorrectCount(response.correctCount);

      // Check completion
      if (response.allCorrect) {
        setGameStatus('completed');
        setShowCelebration(true);
      } else {
        // Check max attempts
        if (game.maxAttempts != null && newAttemptCount >= game.maxAttempts) {
          setMaxAttemptsReached(true);
          setGameStatus('expired');
          setCheckResultMessage('Bạn đã hết lượt kiểm tra');
        }
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Không thể kiểm tra đáp án. Vui lòng thử lại.';
      setCheckResultMessage(message);
    } finally {
      setIsChecking(false);
    }
  }, [game, slug, gameStatus, playerGrid, attemptCount]);

  // ── Sorted words for clue panel ─────────────────────────────────────────

  const acrossWords = useMemo(
    () =>
      (game?.words ?? [])
        .filter((w) => w.direction === 'across')
        .sort((a, b) => a.number - b.number),
    [game?.words],
  );

  const downWords = useMemo(
    () =>
      (game?.words ?? [])
        .filter((w) => w.direction === 'down')
        .sort((a, b) => a.number - b.number),
    [game?.words],
  );

  // ── Render: Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Render: Error ───────────────────────────────────────────────────────

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // ── Render: Expired page ────────────────────────────────────────────────

  if (gameStatus === 'expired') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3,
          textAlign: 'center',
        }}
      >
        <BlockIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Trò chơi đã kết thúc
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
          {game?.deadline
            ? `Thời hạn đã hết vào ${new Date(game.deadline).toLocaleString('vi-VN')}.`
            : 'Trò chơi này không còn khả dụng.'}
        </Typography>
        {game?.showAnswerAfterExpiry && (
          <Typography variant="body2" color="text.secondary">
            Đáp án sẽ được hiển thị bởi giáo viên.
          </Typography>
        )}
      </Box>
    );
  }

  // ── Render: Grid ────────────────────────────────────────────────────────

  const isCheckDisabled =
    gameStatus !== 'playing' ||
    isChecking ||
    maxAttemptsReached;

  const progressValue = totalWords > 0 ? (correctCount / totalWords) * 100 : 0;

  // ── Render: Progress bar + Check button ─────────────────────────────────

  const progressAndCheckContent = (
    <Box sx={{ mt: 2 }}>
      {/* Progress bar */}
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Tiến độ
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {correctCount}/{totalWords} từ đúng
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: '#e0e0e0',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: progressValue === 100 ? '#4caf50' : '#1976d2',
            },
          }}
          aria-label={`Tiến độ: ${correctCount} trên ${totalWords} từ đúng`}
        />
      </Box>

      {/* Check button */}
      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        onClick={handleCheckAnswers}
        disabled={isCheckDisabled}
        startIcon={isChecking ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
        aria-label="Kiểm tra đáp án"
        sx={{ py: 1.5, fontWeight: 600, fontSize: '1rem' }}
      >
        {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra'}
      </Button>

      {/* Max attempts message */}
      {maxAttemptsReached && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          Bạn đã hết lượt kiểm tra
        </Alert>
      )}

      {/* Error message from check */}
      {checkResultMessage && !maxAttemptsReached && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {checkResultMessage}
        </Alert>
      )}

      {/* ARIA live region for check results */}
      <Box
        aria-live="assertive"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {gameStatus === 'completed' && 'Chúc mừng! Bạn đã hoàn thành ô chữ!'}
        {maxAttemptsReached && 'Bạn đã hết lượt kiểm tra.'}
      </Box>
    </Box>
  );

  const gridContent = (
    <PlayerGrid
      grid={playerGrid}
      words={game?.words ?? []}
      selectedCell={selectedCell}
      selectedWordId={selectedWordId}
      direction={direction}
      gameStatus={gameStatus}
      onCellSelect={handleCellSelect}
      onLetterInput={handleLetterInput}
      onDirectionChange={setDirection}
      onSelectedWordChange={setSelectedWordId}
      onSelectedCellChange={setSelectedCell}
    />
  );

  // ── Render: Timer header ────────────────────────────────────────────────

  const timerHeader = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {game?.title ?? 'Ô chữ'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TimerIcon fontSize="small" color="action" />
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {formatTime(timer)}
          </Typography>
        </Box>
        {game?.maxAttempts != null && (
          <Typography variant="body2" color="text.secondary">
            Lượt kiểm tra: {attemptCount}/{game.maxAttempts}
          </Typography>
        )}
      </Box>
    </Box>
  );

  // ── Render: Clue panel content ──────────────────────────────────────────

  const cluePanelContent = (
    <Box sx={{ p: 2 }}>
      {/* Across clues */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        NGANG
      </Typography>
      {acrossWords.map((word) => {
        const isActive = selectedWordId === word.id;
        return (
          <Box
            key={word.id}
            onClick={() => handleWordSelect(word.id)}
            sx={{
              p: 1,
              mb: 0.5,
              borderRadius: 1,
              cursor: 'pointer',
              backgroundColor: isActive ? 'primary.light' : 'transparent',
              color: isActive ? 'primary.contrastText' : 'text.primary',
              '&:hover': { backgroundColor: isActive ? 'primary.light' : 'action.hover' },
              transition: 'background-color 0.2s',
            }}
          >
            <Typography variant="body2">
              <strong>{word.number}.</strong> {word.clue}
            </Typography>
          </Box>
        );
      })}

      {/* Down clues */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
        DỌC
      </Typography>
      {downWords.map((word) => {
        const isActive = selectedWordId === word.id;
        return (
          <Box
            key={word.id}
            onClick={() => handleWordSelect(word.id)}
            sx={{
              p: 1,
              mb: 0.5,
              borderRadius: 1,
              cursor: 'pointer',
              backgroundColor: isActive ? 'primary.light' : 'transparent',
              color: isActive ? 'primary.contrastText' : 'text.primary',
              '&:hover': { backgroundColor: isActive ? 'primary.light' : 'action.hover' },
              transition: 'background-color 0.2s',
            }}
          >
            <Typography variant="body2">
              <strong>{word.number}.</strong> {word.clue}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );

  // ── Render: Desktop layout ──────────────────────────────────────────────

  if (isDesktop) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {timerHeader}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 3, alignItems: 'start' }}>
          {/* Grid column */}
          <Paper variant="outlined" sx={{ p: 2, overflow: 'auto' }}>
            {gridContent}
            {progressAndCheckContent}
          </Paper>

          {/* Clue panel column */}
          <Paper
            variant="outlined"
            sx={{
              maxHeight: 'calc(100vh - 200px)',
              overflow: 'auto',
              position: 'sticky',
              top: 24,
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Câu gợi ý
              </Typography>
            </Box>
            {cluePanelContent}
          </Paper>
        </Box>

        {/* Celebration overlay */}
        <CelebrationOverlay
          open={showCelebration}
          elapsedTime={timer}
          attemptCount={attemptCount}
          onClose={() => setShowCelebration(false)}
        />
      </Box>
    );
  }

  // ── Render: Mobile layout (bottom sheet for clues) ──────────────────────

  return (
    <Box sx={{ p: 1.5, pb: 10 }}>
      {timerHeader}

      {/* Grid */}
      <Paper variant="outlined" sx={{ p: 1, overflow: 'auto', mb: 2 }}>
        {gridContent}
        {progressAndCheckContent}
      </Paper>

      {/* Bottom sheet toggle */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <IconButton onClick={() => setBottomSheetOpen(true)} aria-label="Mở câu gợi ý">
          <ExpandLessIcon />
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
          Xem gợi ý ({(game?.words ?? []).length} từ)
        </Typography>
      </Box>

      {/* Bottom sheet drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        onOpen={() => setBottomSheetOpen(true)}
        swipeAreaWidth={20}
        disableSwipeToOpen={false}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '70vh',
            },
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              backgroundColor: '#cbd5e1',
              borderRadius: 2,
              mx: 'auto',
              mb: 1,
            }}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Câu gợi ý
          </Typography>
        </Box>
        <Box sx={{ overflow: 'auto', maxHeight: 'calc(70vh - 60px)' }}>
          {cluePanelContent}
        </Box>
      </SwipeableDrawer>

      {/* Celebration overlay */}
      <CelebrationOverlay
        open={showCelebration}
        elapsedTime={timer}
        attemptCount={attemptCount}
        onClose={() => setShowCelebration(false)}
      />
    </Box>
  );
}
