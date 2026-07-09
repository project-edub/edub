import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from '@mui/material';
import { attachMinigameToLesson, useLessonMinigameIds } from '../../store/lessonStore';
import { useMinigameStore } from '../../store/minigameStore';

interface Props {
  open: boolean;
  lessonId: number;
  onClose: () => void;
}

export default function AttachMinigameModal({ open, lessonId, onClose }: Props) {
  const navigate = useNavigate();
  const { minigames } = useMinigameStore();
  const lessonMinigameIds = useLessonMinigameIds(lessonId);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedIds([]);
      return;
    }

    setSelectedIds(lessonMinigameIds);
  }, [lessonMinigameIds, open]);

  const filteredMinigames = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return minigames;
    return minigames.filter((minigame) => minigame.title.toLowerCase().includes(term));
  }, [minigames, searchTerm]);

  function toggleSelection(minigameId: string) {
    setSelectedIds((current) => (
      current.includes(minigameId)
        ? current.filter((id) => id !== minigameId)
        : [...current, minigameId]
    ));
  }

  function handleAttach() {
    const nextIds = Array.from(new Set([...lessonMinigameIds, ...selectedIds]));
    for (const minigameId of nextIds) {
      attachMinigameToLesson(lessonId, minigameId);
    }
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>Gắn trò chơi</DialogTitle>
      <DialogContent dividers>
        {minigames.length === 0 ? (
          <Stack spacing={2} sx={{ py: 1 }}>
            <Typography color="text.secondary">
              Chưa có trò chơi nào để gắn vào bài học này.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/minigames')} sx={{ alignSelf: 'flex-start' }}>
              Đi tới trang Trò chơi
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <TextField
              label="Tìm kiếm trò chơi"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              fullWidth
              size="small"
            />

            <Divider />

            <Stack spacing={1.5}>
              {filteredMinigames.length === 0 ? (
                <Typography color="text.secondary">Không tìm thấy trò chơi phù hợp.</Typography>
              ) : (
                filteredMinigames.map((minigame) => {
                  const attached = lessonMinigameIds.includes(minigame.id);
                  const selected = selectedIds.includes(minigame.id);

                  return (
                    <Box
                      key={minigame.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 600 }}>{minigame.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {minigame.type}
                          </Typography>
                          {attached && (
                            <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                              Đã gắn
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" noWrap title={minigame.description || ''}>
                          {minigame.description?.trim() || 'Chưa có mô tả'}
                        </Typography>
                      </Box>

                      <Checkbox
                        checked={attached || selected}
                        disabled={attached}
                        onChange={() => toggleSelection(minigame.id)}
                        slotProps={{ input: { 'aria-label': `Chọn ${minigame.title}` } }}
                      />
                    </Box>
                  );
                })
              )}
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Huỷ
        </Button>
        <Button
          onClick={handleAttach}
          variant="contained"
          disabled={minigames.length === 0 || lessonMinigameIds.length === selectedIds.length}
        >
          Gắn
        </Button>
      </DialogActions>
    </Dialog>
  );
}
