import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Tooltip,
} from '@mui/material';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditorToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onRegenerate: () => void;
  onPublish: () => void;
  regenerateCost: number;
  ecoinBalance: number;
  maxAttempts: number | null;
  onMaxAttemptsChange: (value: number | null) => void;
  isPublished: boolean;
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
}: EditorToolbarProps) {
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const canAffordRegenerate = ecoinBalance >= regenerateCost;

  const handleRegenerateClick = () => {
    setShowRegenerateDialog(true);
  };

  const handleRegenerateConfirm = () => {
    setShowRegenerateDialog(false);
    onRegenerate();
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
            !canAffordRegenerate
              ? `Không đủ ECoin (cần ${regenerateCost}, hiện có ${ecoinBalance})`
              : `Tạo lại ô chữ (${regenerateCost} ECoin)`
          }
        >
          <span>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRegenerateClick}
              disabled={!canAffordRegenerate}
            >
              Tạo lại · {regenerateCost}🪙
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

      {/* Regenerate Confirm Dialog */}
      <RegenerateConfirmDialog
        open={showRegenerateDialog}
        cost={regenerateCost}
        onConfirm={handleRegenerateConfirm}
        onCancel={handleRegenerateCancel}
      />
    </>
  );
}

// ── RegenerateConfirmDialog ───────────────────────────────────────────────────

interface RegenerateConfirmDialogProps {
  open: boolean;
  cost: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function RegenerateConfirmDialog({
  open,
  cost,
  onConfirm,
  onCancel,
}: RegenerateConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="regenerate-dialog-title">
      <DialogTitle id="regenerate-dialog-title">Xác nhận tạo lại</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Tạo lại sẽ tốn {cost}🪙. Tiếp tục?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          Hủy
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary" autoFocus>
          Xác nhận
        </Button>
      </DialogActions>
    </Dialog>
  );
}
