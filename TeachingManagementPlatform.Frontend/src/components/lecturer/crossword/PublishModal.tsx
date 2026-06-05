
import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Checkbox,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PublishConfig {
  maxAttempts: number | null;
  deadline: string | null;
}

export interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onPublish: (config: PublishConfig) => void;
  slug: string;
  isPublished: boolean;
  isPublishing: boolean;
  maxAttempts: number | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublishModal({
  open,
  onClose,
  onPublish,
  slug,
  isPublished,
  isPublishing,
  maxAttempts,
}: PublishModalProps) {
  const [copied, setCopied] = useState(false);
  const [isPermanent, setIsPermanent] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState('');

  const shareUrl = `${window.location.origin}/play/${slug}`;

  const handleSubmit = () => {
    const config: PublishConfig = {
      maxAttempts,
      deadline: isPermanent ? null : deadlineValue || null,
    };
    onPublish(config);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Publishing state (loading spinner) ────────────────────────────────────

  if (isPublishing) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              gap: 2,
            }}
          >
            <CircularProgress size={48} sx={{ color: '#c48a10' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Đang xuất bản ô chữ...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Đang tạo đường dẫn chia sẻ, vui lòng chờ.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Published success state ───────────────────────────────────────────────

  if (isPublished) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="publish-dialog-title"
      >
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              gap: 2,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 56, color: '#16a34a' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#166534' }}>
              Xuất bản thành công!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Ô chữ đã được xuất bản. Chia sẻ link bên dưới cho học sinh.
            </Typography>
          </Box>

          {/* Share link */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              mt: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#166534' }}>
              🔗 Link chia sẻ
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                value={shareUrl}
                fullWidth
                size="small"
                slotProps={{
                  input: { readOnly: true },
                }}
              />
              <Tooltip title={copied ? 'Đã sao chép!' : 'Sao chép link'}>
                <IconButton onClick={handleCopyLink} size="small" aria-label="Sao chép link">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="contained" color="primary">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Default: publish confirmation ─────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="publish-dialog-title"
    >
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
            Xuất bản ô chữ
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Số lần thử tối đa: {maxAttempts ?? 'Không giới hạn'}
          </Typography>

          {/* Deadline section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Thời hạn trò chơi
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  size="small"
                />
              }
              label="Mở vĩnh viễn (không có thời hạn)"
            />

            {!isPermanent && (
              <TextField
                type="datetime-local"
                label="Thời hạn"
                value={deadlineValue}
                onChange={(e) => setDeadlineValue(e.target.value)}
                fullWidth
                size="small"
                sx={{ mt: 1 }}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary">
            Đáp án sẽ hiện ngay sau khi hết lượt kiểm tra.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Hủy
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Xuất bản
        </Button>
      </DialogActions>
    </Dialog>
  );
}
