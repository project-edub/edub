import { Box, Typography, Divider } from '@mui/material';
import ColorPicker from '../../components/common/ColorPicker';
import { useColorMode } from '../../theme/ColorModeContext';
import { updateUserSettings } from '../../services/userSettingsService';

export default function AdminSettingsPage() {
  const { mode, toggleMode, primaryColor, setPrimaryColor } = useColorMode();

  function handleColorChange(color: string) {
    setPrimaryColor(color);
    updateUserSettings({ themeColor: color }).catch(() => {});
  }

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        Cài đặt giao diện
      </Typography>

      {/* Theme color section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Màu chủ đạo
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Chọn màu chủ đạo cho giao diện. Màu này sẽ được áp dụng cho header, buttons và các thành phần nổi bật.
        </Typography>

        <ColorPicker
          value={primaryColor}
          onChange={handleColorChange}
          label="Chọn màu"
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Dark/Light mode section */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Chế độ hiển thị
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Chế độ hiện tại: <strong>{mode === 'light' ? 'Sáng' : 'Tối'}</strong>
        </Typography>

        <Box
          role="button"
          tabIndex={0}
          onClick={toggleMode}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleMode();
            }
          }}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {mode === 'light' ? '🌙 Chuyển sang chế độ tối' : '☀️ Chuyển sang chế độ sáng'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
