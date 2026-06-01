import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import type { Minigame } from '../../types/minigameLibrary';

interface Props {
  minigame: Minigame;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MinigameCard({ minigame, onEdit, onDelete }: Props) {
  const createdAt = new Date(minigame.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 2.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minHeight: 180,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap title={minigame.title}>
            {minigame.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {minigame.description?.trim() || 'Chưa có mô tả'}
          </Typography>
        </Box>
        <Chip size="small" label={minigame.type} color="primary" variant="outlined" />
      </Box>

      <Typography variant="body2" color="text.secondary">
        Ngày tạo: {createdAt}
      </Typography>

      <Box sx={{ mt: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" size="small" onClick={onEdit}>
          Sửa tên
        </Button>
        <Button variant="outlined" size="small" color="error" onClick={onDelete}>
          Xoá
        </Button>
      </Box>
    </Paper>
  );
}
