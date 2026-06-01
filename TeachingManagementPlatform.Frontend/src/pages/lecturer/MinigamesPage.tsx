import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import MinigameCard from '../../components/lecturer/MinigameCard';
import type { Minigame } from '../../types/minigameLibrary';
import { addMinigame, deleteMinigame, updateMinigame, useMinigameStore } from '../../store/minigameStore';

type FormMode = 'create' | 'edit';

interface FormState {
  title: string;
  description: string;
  type: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  type: 'quiz',
};

export default function MinigamesPage() {
  const { minigames } = useMinigameStore();
  const [dialogMode, setDialogMode] = useState<FormMode | null>(null);
  const [editTarget, setEditTarget] = useState<Minigame | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Minigame | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const orderedMinigames = useMemo(
    () => [...minigames].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [minigames],
  );

  function openCreateDialog() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogMode('create');
  }

  function openEditDialog(minigame: Minigame) {
    setEditTarget(minigame);
    setForm({
      title: minigame.title,
      description: minigame.description ?? '',
      type: minigame.type,
    });
    setFormError('');
    setDialogMode('edit');
  }

  function closeDialog() {
    setDialogMode(null);
    setEditTarget(null);
    setFormError('');
  }

  function handleSubmit() {
    const title = form.title.trim();
    if (!title) {
      setFormError('Vui lòng nhập tên minigame.');
      return;
    }

    if (dialogMode === 'create') {
      addMinigame({
        title,
        description: form.description.trim() || undefined,
        type: form.type.trim() || 'quiz',
      });
    } else if (dialogMode === 'edit' && editTarget) {
      updateMinigame(editTarget.id, {
        title,
        description: form.description.trim() || undefined,
        type: form.type.trim() || 'quiz',
      });
    }

    closeDialog();
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    deleteMinigame(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Minigame
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý danh sách minigame và gắn vào bài học từ trang này.
          </Typography>
        </Box>

        <Button variant="contained" onClick={openCreateDialog}>
          Tạo Minigame
        </Button>
      </Box>

      {orderedMinigames.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 3,
            p: 4,
            textAlign: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Chưa có minigame nào
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Hãy tạo một minigame để bắt đầu gắn vào các bài học.
          </Typography>
          <Button variant="contained" onClick={openCreateDialog}>
            Tạo Minigame
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
          {orderedMinigames.map((minigame) => (
            <Box key={minigame.id}>
              <MinigameCard
                minigame={minigame}
                onEdit={() => openEditDialog(minigame)}
                onDelete={() => setDeleteTarget(minigame)}
              />
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={dialogMode !== null} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialogMode === 'create' ? 'Tạo Minigame' : 'Sửa Minigame'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {/* TODO: AI generation — handled by teammate */}
              Phần tạo nội dung tự động sẽ được đồng nghiệp ghép vào sau. Hiện tại chỉ lưu metadata và title.
            </Typography>
            <TextField
              label="Tên minigame"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              fullWidth
              required
              error={Boolean(formError)}
              helperText={formError || 'Tên dùng để nhận diện minigame trong danh sách.'}
            />
            <TextField
              label="Mô tả"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
            <TextField
              label="Loại"
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              fullWidth
              helperText="Ví dụ: quiz, flashcard, matching..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} color="inherit">
            Huỷ
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xoá minigame"
        message={`Bạn có chắc chắn muốn xoá minigame ${deleteTarget?.title ?? ''}?`}
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
