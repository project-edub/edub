import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Typography, TextField, Paper, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Card, CardContent,
} from '@mui/material';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EcoinConfig {
  crosswordBaseRates: Array<{ minWords: number; maxWords: number; baseCost: number }>;
  crosswordClueStyleRates: Record<string, number>;
  crosswordLanguageRates: Record<string, number>;
  crosswordRegenerateMultiplier: number;
  quizCoinCostPerQuestion: number;
}

const DEFAULT_CONFIG: EcoinConfig = {
  crosswordBaseRates: [
    { minWords: 5, maxWords: 10, baseCost: 5 },
    { minWords: 11, maxWords: 15, baseCost: 8 },
    { minWords: 16, maxWords: 20, baseCost: 10 },
    { minWords: 21, maxWords: 25, baseCost: 12 },
    { minWords: 26, maxWords: 30, baseCost: 15 },
  ],
  crosswordClueStyleRates: { definition: 0, 'fill-in-blank': 3, 'multiple-choice': 5 },
  crosswordLanguageRates: { vi: 0, en: 2 },
  crosswordRegenerateMultiplier: 0.5,
  quizCoinCostPerQuestion: 1,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function GameEcoinConfigPage() {
  const [config, setConfig] = useState<EcoinConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<EcoinConfig>('/admin/game-ecoin-config');
      setConfig(response.data);
    } catch {
      // If not found, use defaults
      setConfig(DEFAULT_CONFIG);
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
      await api.put('/admin/game-ecoin-config', config);
      setSuccess('Đã lưu cấu hình thành công.');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  }, [config]);

  const updateBaseRate = (index: number, field: 'baseCost', value: number) => {
    setConfig(prev => {
      const rates = [...prev.crosswordBaseRates];
      rates[index] = { ...rates[index], [field]: value };
      return { ...prev, crosswordBaseRates: rates };
    });
  };

  const updateClueStyleRate = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      crosswordClueStyleRates: { ...prev.crosswordClueStyleRates, [key]: value },
    }));
  };

  const updateLanguageRate = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      crosswordLanguageRates: { ...prev.crosswordLanguageRates, [key]: value },
    }));
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: { xs: 1.5, md: 2 } }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Cấu hình ECoin trò chơi</Typography>
        <Typography variant="body2" color="text.secondary">
          Quản lý chi phí ECoin cho crossword và quiz.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      {/* Crossword base rates */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Crossword — Chi phí theo số từ</Typography>

        {/* Mobile card view */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
          {config.crosswordBaseRates.map((rate, idx) => (
            <Card key={idx} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  {rate.minWords} – {rate.maxWords} từ
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  label="Chi phí (ECoin)"
                  value={rate.baseCost}
                  onChange={(e) => updateBaseRate(idx, 'baseCost', Number(e.target.value))}
                  fullWidth
                  slotProps={{ input: { inputProps: { min: 0 } } }}
                />
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Desktop table view */}
        <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Số từ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Chi phí (ECoin)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {config.crosswordBaseRates.map((rate, idx) => (
                <TableRow key={idx}>
                  <TableCell>{rate.minWords} – {rate.maxWords} từ</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={rate.baseCost}
                      onChange={(e) => updateBaseRate(idx, 'baseCost', Number(e.target.value))}
                      sx={{ width: 100 }}
                      slotProps={{ input: { inputProps: { min: 0 } } }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Crossword clue style rates */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Crossword — Phụ phí kiểu gợi ý</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Object.entries(config.crosswordClueStyleRates).map(([key, value]) => (
            <Box key={key} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
              <Typography sx={{ minWidth: { sm: 160 } }}>
                {key === 'definition' ? 'Định nghĩa' : key === 'fill-in-blank' ? 'Điền vào chỗ trống' : 'Trắc nghiệm'}
              </Typography>
              <TextField
                type="number"
                size="small"
                value={value}
                onChange={(e) => updateClueStyleRate(key, Number(e.target.value))}
                sx={{ width: 100 }}
                slotProps={{ input: { inputProps: { min: 0 } } }}
              />
              <Typography variant="caption" color="text.secondary">ECoin</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Crossword language rates */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Crossword — Phụ phí ngôn ngữ</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Object.entries(config.crosswordLanguageRates).map(([key, value]) => (
            <Box key={key} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
              <Typography sx={{ minWidth: { sm: 120 } }}>{key === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}</Typography>
              <TextField
                type="number"
                size="small"
                value={value}
                onChange={(e) => updateLanguageRate(key, Number(e.target.value))}
                sx={{ width: 100 }}
                slotProps={{ input: { inputProps: { min: 0 } } }}
              />
              <Typography variant="caption" color="text.secondary">ECoin</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Crossword regenerate multiplier */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Crossword — Hệ số tạo lại</Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
          <TextField
            type="number"
            size="small"
            value={config.crosswordRegenerateMultiplier}
            onChange={(e) => setConfig(prev => ({ ...prev, crosswordRegenerateMultiplier: Number(e.target.value) }))}
            sx={{ width: 100 }}
            slotProps={{ input: { inputProps: { min: 0, max: 1, step: 0.1 } } }}
          />
          <Typography variant="body2" color="text.secondary">
            × chi phí tạo ban đầu (ví dụ: 0.5 = 50%)
          </Typography>
        </Box>
      </Paper>

      {/* Quiz cost per question */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Quiz — Chi phí mỗi câu hỏi</Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
          <TextField
            type="number"
            size="small"
            value={config.quizCoinCostPerQuestion}
            onChange={(e) => setConfig(prev => ({ ...prev, quizCoinCostPerQuestion: Number(e.target.value) }))}
            sx={{ width: 100 }}
            slotProps={{ input: { inputProps: { min: 0 } } }}
          />
          <Typography variant="body2" color="text.secondary">
            ECoin / câu hỏi (tổng = số câu × chi phí)
          </Typography>
        </Box>
      </Paper>

      <Button
        variant="contained"
        onClick={() => void handleSave()}
        disabled={saving}
        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, minHeight: 44 }}
      >
        {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
      </Button>
    </Box>
  );
}
