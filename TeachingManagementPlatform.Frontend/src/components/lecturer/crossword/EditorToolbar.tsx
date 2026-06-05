
import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GameConfig } from '../../../types/crossword';
import GameConfigForm from './GameConfigForm';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditorToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onRegenerate: (config: GameConfig) => void;
  onPublish: () => void;
  regenerateCost: number;
  ecoinBalance: number;
  maxAttempts: number | null;
  onMaxAttemptsChange: (value: number | null) => void;
  isPublished: boolean;
  /** Current game config (used as initial values for regenerate form). */
  currentConfig: GameConfig;
  /** Whether regeneration is in progress. */
  isRegenerating?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditorToolbar({
  title,
  onTitleChange,
  onRegenerate,
  onPublish,
  regenerateCost,
  ecoinBalance,
  maxAttempts,
  onMaxAttemptsChange,
  isPublished,
  currentConfig,
  isRegenerating,
}: EditorToolbarProps) {
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenConfig, setRegenConfig] = useState<GameConfig>(currentConfig);

  const canAffordRegenerate = ecoinBalance >= regenerateCost;

  const handleRegenerateClick = () => {
    setRegenConfig(currentConfig);
    setShowRegenerateDialog(true);
  };

  const handleRegenerateConfirm = () => {
    setShowRegenerateDialog(false);
    onRegenerate(regenConfig);
  };

  const handleRegenerateCancel = () => {
    setShowRegenerateDialog(false);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          mb: 2,
          backgroundColor: '#fff',
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
        }}
      >
        {/* Editable title */}
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Tên trò chơi"
          style={{
            border: 'none',
            borderBottom: '2px solid #e2e8f0',
            fontSize: 18,
            fontWeight: 700,
            padding: '4px 8px',
            flex: 1,
            minWidth: 200,
            outline: 'none',
            background: 'transparent',
          }}
          aria-label="Tên trò chơi"
        />

        {/* Max attempts setting */}
        <TextField
          label="Số lần thử"
          type="number"
          size="small"
          value={maxAttempts ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onMaxAttemptsChange(val ? Number(val) : null);
          }}
          slotProps={{
            input: { inputProps: { min: 1 } },
          }}
          sx={{ width: 120 }}
        />

        {/* Regenerate button */}
        <Tooltip
          title={
            isRegenerating
              ? 'Đang tạo lại...'
              : !canAffordRegenerate
                ? `Không đủ ECoin (cần ${regenerateCost}, hiện có ${ecoinBalance})`
                : `Tạo lại ô chữ (${regenerateCost} ECoin)`
          }
        >
          <span>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRegenerateClick}
              disabled={!canAffordRegenerate || isRegenerating}
            >
              {isRegenerating ? 'Đang tạo lại...' : `Tạo lại · ${regenerateCost}🪙`}
            </Button>
          </span>
        </Tooltip>

        {/* Publish button */}
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={onPublish}
        >
          {isPublished ? 'Tái xuất bản →' : 'Xuất bản →'}
        </Button>
      </Box>

      {/* Regenerate Config Dialog */}
      <Dialog
        open={showRegenerateDialog}
        onClose={handleRegenerateCancel}
        maxWidth="sm"
        fullWidth
        aria-labelledby="regenerate-dialog-title"
      >
        <DialogTitle id="regenerate-dialog-title">Tạo lại ô chữ</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Chỉnh sửa cấu hình bên dưới rồi nhấn xác nhận để tạo lại. Chi phí: {regenerateCost}🪙
          </Typography>
          <GameConfigForm
            config={regenConfig}
            onChange={setRegenConfig}
            maxWordCount={30}
            isPro={false}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleRegenerateCancel} color="inherit">
            Hủy
          </Button>
          <Button
            onClick={handleRegenerateConfirm}
            variant="contained"
            color="primary"
            disabled={!canAffordRegenerate}
          >
            Xác nhận · {regenerateCost}🪙
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
