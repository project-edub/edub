import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  IconButton,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import * as crosswordService from '../../services/crosswordService';
import * as coinService from '../../services/coinService';
import { buildGrid } from '../../utils/gridBuilder';
import { calculateRegenerateEcoin } from '../../utils/ecoinCalculator';
import type { PlacedWordInput, GridResult } from '../../utils/gridBuilder';
import type {
  CrosswordGameDto,
  CrosswordWordDetailDto,
  Direction,
  GameConfig,
} from '../../types/crossword';
import CrosswordGrid from '../../components/lecturer/crossword/CrosswordGrid';
import EditorToolbar from '../../components/lecturer/crossword/EditorToolbar';
import PublishModal from '../../components/lecturer/crossword/PublishModal';
import type { PublishConfig } from '../../components/lecturer/crossword/PublishModal';
import WordEditModal from '../../components/lecturer/crossword/WordEditModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelectedCell {
  row: number;
  col: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CrosswordEditorPage() {
  const { id: gameIdParam } = useParams<{ id: string }>();
  const gameId = Number(gameIdParam);
  const navigate = useNavigate();
  const theme = useTheme();

  // Responsive breakpoints
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // ── Core state ──────────────────────────────────────────────────────────
  const [game, setGame] = useState<CrosswordGameDto | null>(null);
  const [words, setWords] = useState<CrosswordWordDetailDto[]>([]);
  const [title, setTitle] = useState('');
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [direction, setDirection] = useState<Direction>('across');

  // ── Saving state ────────────────────────────────────────────────────────
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Loading & error ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Word edit modal ──────────────────────────────────────────────────────
  const [editingWordId, setEditingWordId] = useState<number | null>(null);

  // ── Publish modal ────────────────────────────────────────────────────────
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // ── ECoin balance ───────────────────────────────────────────────────────
  const [ecoinBalance, setEcoinBalance] = useState(0);

  // ── Mobile bottom sheet ─────────────────────────────────────────────────
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  // ── Grid computation ────────────────────────────────────────────────────
  const gridResult: GridResult = useMemo(() => {
    if (words.length === 0) {
      return { grid: [], placedWords: [], unplacedWords: [] };
    }

    const wordInputs: PlacedWordInput[] = words.map((w) => ({
      word: w.word,
      id: w.id,
    }));

    const configJson = game?.configJson;
    let gridSize = 15;
    if (configJson) {
      try {
        const config = JSON.parse(configJson);
        if (typeof config.gridSize === 'number') {
          gridSize = config.gridSize;
        }
      } catch {
        // fallback to default
      }
    }

    return buildGrid(wordInputs, gridSize);
  }, [words, game?.configJson]);

  const unplacedWords = gridResult.unplacedWords;

  // ── Fetch game data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || isNaN(gameId)) {
      setError('Game ID không hợp lệ.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      try {
        const [gameData, wallet] = await Promise.all([
          crosswordService.getCrossword(gameId),
          coinService.getLecturerCoinWallet().catch(() => null),
        ]);

        if (cancelled) return;

        setGame(gameData);
        setWords(gameData.words);
        setTitle(gameData.title);
        setMaxAttempts(gameData.maxAttempts ?? null);

        // Set ecoin balance from wallet
        if (wallet) {
          setEcoinBalance(wallet.coinBalance);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không thể tải dữ liệu ô chữ.';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();
    return () => { cancelled = true; };
  }, [gameId]);

  // ── Update words ────────────────────────────────────────────────────────

  const updateWords = useCallback((newWords: CrosswordWordDetailDto[]) => {
    setWords(newWords);
  }, []);

  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  // ── Regenerate cost calculation ─────────────────────────────────────────

  const regenerateCost = useMemo(() => {
    if (!game?.configJson) return 0;
    try {
      const config: GameConfig = JSON.parse(game.configJson);
      return calculateRegenerateEcoin(config);
    } catch {
      return 0;
    }
  }, [game?.configJson]);

  // ── Regenerate handler ──────────────────────────────────────────────────

  const handleRegenerate = useCallback(async () => {
    if (!game) return;

    try {
      let config: GameConfig;
      try {
        config = JSON.parse(game.configJson);
      } catch {
        return;
      }

      await crosswordService.regenerateCrossword(game.id, { gameId: game.id, config });

      // Refresh the game data after regeneration
      const updatedGame = await crosswordService.getCrossword(game.id);
      setGame(updatedGame);
      setWords(updatedGame.words);
      setTitle(updatedGame.title);

      // Update ecoin balance
      const wallet = await coinService.getLecturerCoinWallet().catch(() => null);
      if (wallet) setEcoinBalance(wallet.coinBalance);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Tạo lại thất bại.';
      setSaveError(message);
    }
  }, [game]);

  // ── Publish handler ─────────────────────────────────────────────────────

  const handlePublish = useCallback(async (config: PublishConfig) => {
    if (!game) return;

    setIsPublishing(true);

    try {
      // Save word positions before publishing
      await crosswordService.updateCrossword(game.id, {
        title,
        gridJson: JSON.stringify(gridResult.grid),
        words: gridResult.placedWords
          .filter((pw) => pw.id != null)
          .map((pw) => ({
            id: pw.id!,
            direction: pw.direction,
            startRow: pw.startRow,
            startCol: pw.startCol,
            number: pw.number,
          })),
      });

      const updatedGame = await crosswordService.publishCrossword(game.id, {
        maxAttempts: config.maxAttempts,
        gridJson: JSON.stringify(gridResult.grid),
      });
      setGame(updatedGame);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Xuất bản thất bại.';
      setSaveError(message);
      setShowPublishModal(false);
    } finally {
      setIsPublishing(false);
    }
  }, [game, title, gridResult]);

  // ── Word selection ──────────────────────────────────────────────────────

  const handleWordSelect = useCallback((wordId: number) => {
    setSelectedWordId(wordId);
    const word = words.find((w) => w.id === wordId);
    if (word) {
      setSelectedCell({ row: word.startRow, col: word.startCol });
      setDirection(word.direction);
    }
  }, [words]);

  const handleCellSelect = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });

    // Find words that pass through this cell
    const wordsAtCell = words.filter((w) => {
      if (w.direction === 'across') {
        return w.startRow === row && col >= w.startCol && col < w.startCol + w.word.length;
      } else {
        return w.startCol === col && row >= w.startRow && row < w.startRow + w.word.length;
      }
    });

    if (wordsAtCell.length === 0) return;

    // If clicking the same cell again, toggle direction
    if (selectedCell?.row === row && selectedCell?.col === col && wordsAtCell.length > 1) {
      const newDirection: Direction = direction === 'across' ? 'down' : 'across';
      setDirection(newDirection);
      const matchingWord = wordsAtCell.find((w) => w.direction === newDirection);
      if (matchingWord) setSelectedWordId(matchingWord.id);
    } else {
      // Select the first word matching current direction, or fallback to any
      const matchingWord =
        wordsAtCell.find((w) => w.direction === direction) ?? wordsAtCell[0];
      if (matchingWord) {
        setSelectedWordId(matchingWord.id);
        setDirection(matchingWord.direction);
      }
    }
  }, [words, selectedCell, direction]);

  // ── Word edit handlers ──────────────────────────────────────────────────

  const handleEditWordSave = useCallback(
    (updatedWord: CrosswordWordDetailDto) => {
      const newWords = words.map((w) =>
        w.id === updatedWord.id ? updatedWord : w,
      );
      updateWords(newWords);
      setEditingWordId(null);
    },
    [words, updateWords],
  );

  const editingWord = editingWordId != null
    ? words.find((w) => w.id === editingWordId) ?? null
    : null;

  // ── Render helpers ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <button className="btn btn-neutral" onClick={() => navigate('/lecturer/crossword')}>
          ← Quay lại danh sách
        </button>
      </Box>
    );
  }

  // ── Clue panel content ──────────────────────────────────────────────────

  const cluePanelContent = (
    <Box sx={{ p: 2 }}>
      {/* Across clues */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        NGANG
      </Typography>
      {gridResult.placedWords
        .filter((pw) => pw.direction === 'across')
        .sort((a, b) => a.number - b.number)
        .map((pw) => {
          const wordDetail = words.find((w) => w.id === pw.id);
          if (!wordDetail) return null;
          const isActive = selectedWordId === pw.id;
          return (
            <Box
              key={pw.id}
              onClick={() => handleWordSelect(pw.id!)}
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
                <strong>{pw.number}.</strong> {wordDetail.clue}
              </Typography>
            </Box>
          );
        })}

      {/* Down clues */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
        DỌC
      </Typography>
      {gridResult.placedWords
        .filter((pw) => pw.direction === 'down')
        .sort((a, b) => a.number - b.number)
        .map((pw) => {
          const wordDetail = words.find((w) => w.id === pw.id);
          if (!wordDetail) return null;
          const isActive = selectedWordId === pw.id;
          return (
            <Box
              key={pw.id}
              onClick={() => handleWordSelect(pw.id!)}
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
                <strong>{pw.number}.</strong> {wordDetail.clue}
              </Typography>
            </Box>
          );
        })}
    </Box>
  );

  // ── Grid rendering ──────────────────────────────────────────────────────

  const gridContent = (
    <CrosswordGrid
      grid={gridResult.grid}
      placedWords={gridResult.placedWords}
      selectedWordId={selectedWordId}
      selectedCell={selectedCell}
      direction={direction}
      words={words}
      onCellSelect={handleCellSelect}
      onWordSelect={handleWordSelect}
    />
  );

  // ── Toolbar ─────────────────────────────────────────────────────────────

  const toolbar = (
    <EditorToolbar
      title={title}
      onTitleChange={updateTitle}
      onRegenerate={() => void handleRegenerate()}
      onPublish={() => setShowPublishModal(true)}
      regenerateCost={regenerateCost}
      ecoinBalance={ecoinBalance}
      maxAttempts={maxAttempts}
      onMaxAttemptsChange={setMaxAttempts}
      isPublished={game?.status === 'published'}
    />
  );

  // ── Publish modal ───────────────────────────────────────────────────────

  const publishModal = (
    <PublishModal
      open={showPublishModal}
      onClose={() => setShowPublishModal(false)}
      onPublish={(config) => void handlePublish(config)}
      slug={game?.slug ?? ''}
      isPublished={game?.status === 'published'}
      isPublishing={isPublishing}
      maxAttempts={maxAttempts}
    />
  );

  // ── Unplaced words banner ───────────────────────────────────────────────

  const unplacedBanner = unplacedWords.length > 0 && (
    <Alert severity="warning" sx={{ mb: 2 }}>
      ⚠️ {unplacedWords.length} từ không xếp được vào lưới: {unplacedWords.join(', ')}
    </Alert>
  );

  // ── Save error banner ───────────────────────────────────────────────────

  const saveErrorBanner = saveError && (
    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
      {saveError}
    </Alert>
  );

  // ── Layout ──────────────────────────────────────────────────────────────

  // Desktop: 2 columns (grid left, clues right)
  if (isDesktop) {
    return (
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        {toolbar}
        {saveErrorBanner}
        {unplacedBanner}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 3, alignItems: 'start' }}>
          {/* Grid column */}
          <Box
            sx={{
              backgroundColor: '#fff',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              p: 2,
              overflow: 'auto',
            }}
          >
            {gridResult.grid.length > 0 ? gridContent : (
              <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
                Không có từ nào để hiển thị lưới.
              </Typography>
            )}
          </Box>

          {/* Clue panel column */}
          <Box
            sx={{
              backgroundColor: '#fff',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              maxHeight: 'calc(100vh - 200px)',
              overflow: 'auto',
              position: 'sticky',
              top: 24,
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Danh sách gợi ý
              </Typography>
            </Box>
            {cluePanelContent}
          </Box>
        </Box>

        {/* Word edit modal */}
        <WordEditModal
          open={editingWordId != null}
          word={editingWord}
          gameId={gameId}
          onClose={() => setEditingWordId(null)}
          onSave={handleEditWordSave}
        />
        {publishModal}
      </Box>
    );
  }

  // Tablet: 1 column (grid on top, clues below)
  if (isTablet) {
    return (
      <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
        {toolbar}
        {saveErrorBanner}
        {unplacedBanner}

        {/* Grid */}
        <Box
          sx={{
            backgroundColor: '#fff',
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            p: 2,
            mb: 2,
            overflow: 'auto',
          }}
        >
          {gridResult.grid.length > 0 ? gridContent : (
            <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
              Không có từ nào để hiển thị lưới.
            </Typography>
          )}
        </Box>

        {/* Clue panel */}
        <Box
          sx={{
            backgroundColor: '#fff',
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Danh sách gợi ý
            </Typography>
          </Box>
          {cluePanelContent}
        </Box>

        {/* Word edit modal */}
        <WordEditModal
          open={editingWordId != null}
          word={editingWord}
          gameId={gameId}
          onClose={() => setEditingWordId(null)}
          onSave={handleEditWordSave}
        />
        {publishModal}
      </Box>
    );
  }

  // Mobile: grid on top, bottom sheet for clues
  return (
    <Box sx={{ p: 1.5, pb: 10 }}>
      {toolbar}
      {saveErrorBanner}
      {unplacedBanner}

      {/* Grid */}
      <Box
        sx={{
          backgroundColor: '#fff',
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          p: 1,
          overflow: 'auto',
        }}
      >
        {gridResult.grid.length > 0 ? gridContent : (
          <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
            Không có từ nào để hiển thị lưới.
          </Typography>
        )}
      </Box>

      {/* Bottom sheet toggle */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTop: '1px solid #e2e8f0',
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <IconButton onClick={() => setBottomSheetOpen(true)} aria-label="Mở danh sách gợi ý">
          <ExpandLessIcon />
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1, color: '#475569' }}>
          Xem gợi ý ({gridResult.placedWords.length} từ)
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
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
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
            Danh sách gợi ý
          </Typography>
        </Box>
        <Box sx={{ overflow: 'auto', maxHeight: 'calc(70vh - 60px)' }}>
          {cluePanelContent}
        </Box>
      </SwipeableDrawer>

      {/* Word edit modal */}
      <WordEditModal
        open={editingWordId != null}
        word={editingWord}
        gameId={gameId}
        onClose={() => setEditingWordId(null)}
        onSave={handleEditWordSave}
      />
      {publishModal}
    </Box>
  );
}
