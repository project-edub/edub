import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Typography, TextField, Paper, Alert, CircularProgress,
} from '@mui/material';
import api from '../../services/api';

interface QuotaConfig {
  quizGenerationDailyLimitFree: number;
  quizGenerationMonthlyLimitFree: number;
  quizGenerationDailyLimitPro: number;
}

const DEFAULT_QUOTA: QuotaConfig = {
  quizGenerationDailyLimitFree: 3,
  quizGenerationMonthlyLimitFree: 20,
  quizGenerationDailyLimitPro: -1,
};

export default function FreemiumQuotaConfigPage() {
  const [config, setConfig] = useState<QuotaConfig>(DEFAULT_QUOTA);
  const [fullConfig, setFullConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Record<string, unknown>>('/admin/game-ecoin-config');
      const data = response.data;
      setFullConfig(data);
      setConfig({
        quizGenerationDailyLimitFree: (data.quizGenerationDailyLimitFree as number) ?? DEFAULT_QUOTA.quizGenerationDailyLimitFree,
        quizGenerationMonthlyLimitFree: (data.quizGenerationMonthlyLimitFree as number) ?? DEFAULT_QUOTA.quizGenerationMonthlyLimitFree,
        quizGenerationDailyLimitPro: (data.quizGenerationDailyLimitPro as number) ?? DEFAULT_QUOTA.quizGenerationDailyLimitPro,
      });
    } catch {
      setConfig(DEFAULT_QUOTA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const merged = { ...fullConfig, ...config };
      await api.put('/admin/game-ecoin-config', merged);
      setFullConfig(merged);
      setSuccess('Đã lưu cấu hình hạn mức thành công.');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  }, [config, fullConfig]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Hạn mức Freemium</Typography>
        <Typography variant="body2" color="text.secondary">
          Cấu hình giới hạn số lượt tạo quiz từ tài liệu cho user Free và Pro.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Gói Free</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ minWidth: 240 }}>Giới hạn lượt/ngày:</Typography>
            <TextField
              type="number"
              size="small"
              value={config.quizGenerationDailyLimitFree}
              onChange={(e) => setConfig(prev => ({ ...prev, quizGenerationDailyLimitFree: Number(e.target.value) }))}
              sx={{ width: 120 }}
              slotProps={{ input: { inputProps: { min: 0 } } }}
            />
            <Typography variant="caption" color="text.secondary">lượt/ngày</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ minWidth: 240 }}>Giới hạn lượt/tháng:</Typography>
            <TextField
              type="number"
              size="small"
              value={config.quizGenerationMonthlyLimitFree}
              onChange={(e) => setConfig(prev => ({ ...prev, quizGenerationMonthlyLimitFree: Number(e.target.value) }))}
              sx={{ width: 120 }}
              slotProps={{ input: { inputProps: { min: 0 } } }}
            />
            <Typography variant="caption" color="text.secondary">lượt/tháng</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Gói Pro / Premium</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ minWidth: 240 }}>Giới hạn lượt/ngày:</Typography>
          <TextField
            type="number"
            size="small"
            value={config.quizGenerationDailyLimitPro}
            onChange={(e) => setConfig(prev => ({ ...prev, quizGenerationDailyLimitPro: Number(e.target.value) }))}
            sx={{ width: 120 }}
            slotProps={{ input: { inputProps: { min: -1 } } }}
          />
          <Typography variant="caption" color="text.secondary">lượt/ngày (-1 = không giới hạn)</Typography>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Lưu ý:</strong> Giá trị <code>-1</code> nghĩa là không giới hạn. Quota reset mỗi ngày lúc 00:00 UTC.
        </Typography>
      </Paper>

      <Button
        variant="contained"
        onClick={() => void handleSave()}
        disabled={saving}
        sx={{ alignSelf: 'flex-start' }}
      >
        {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
      </Button>
    </Box>
  );
}
