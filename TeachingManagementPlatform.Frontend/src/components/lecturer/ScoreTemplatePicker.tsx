import { useState, useEffect, useCallback, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { SelectChangeEvent } from '@mui/material/Select';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreTemplateColumn {
  name: string;
  coefficient: number | null;
  isAverageColumn: boolean;
  sortOrder: number;
}

export interface ScoreTemplate {
  id: number;
  name: string;
  subject: string;
  columns: ScoreTemplateColumn[];
}

export interface ScoreTemplatePickerProps {
  /** Whether the dialog is open */
  open: boolean;
  /** The student list ID to apply the template to */
  listId: number;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Callback after a template is successfully applied */
  onApplied: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_SUBJECTS = 'Tất cả';

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScoreTemplatePicker({
  open,
  listId,
  onClose,
  onApplied,
}: ScoreTemplatePickerProps) {
  const [templates, setTemplates] = useState<ScoreTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ScoreTemplate | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL_SUBJECTS);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // ── Fetch templates ───────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ScoreTemplate[]>('/score-templates');
      setTemplates(response.data);
    } catch {
      setError('Không thể tải danh sách template. Vui lòng thử lại.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelectedTemplate(null);
      setSubjectFilter(ALL_SUBJECTS);
      setApplyError(null);
    }
  }, [open, fetchTemplates]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const subjects = useMemo(() => {
    const subjectSet = new Set(templates.map((t) => t.subject));
    return [ALL_SUBJECTS, ...Array.from(subjectSet).sort()];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (subjectFilter === ALL_SUBJECTS) return templates;
    return templates.filter((t) => t.subject === subjectFilter);
  }, [templates, subjectFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSubjectChange(event: SelectChangeEvent) {
    setSubjectFilter(event.target.value);
    setSelectedTemplate(null);
  }

  function handleSelectTemplate(template: ScoreTemplate) {
    setSelectedTemplate(template);
    setApplyError(null);
  }

  async function handleApply() {
    if (!selectedTemplate) return;

    setApplying(true);
    setApplyError(null);
    try {
      await api.post(`/student-lists/${listId}/apply-template`, {
        templateId: selectedTemplate.id,
      });
      onApplied();
      onClose();
    } catch {
      setApplyError('Không thể áp dụng template. Vui lòng thử lại.');
    } finally {
      setApplying(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="score-template-picker-title"
    >
      <DialogTitle id="score-template-picker-title">
        Chọn Template điểm
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Box sx={{ display: 'flex', gap: 2, minHeight: 350 }}>
            {/* Left panel: subject filter + template list */}
            <Box sx={{ width: 280, flexShrink: 0 }}>
              {/* Subject filter */}
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel id="subject-filter-label">Môn học</InputLabel>
                <Select
                  labelId="subject-filter-label"
                  value={subjectFilter}
                  label="Môn học"
                  onChange={handleSubjectChange}
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject} value={subject}>
                      {subject}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Template list */}
              {filteredTemplates.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  Không có template nào.
                </Typography>
              ) : (
                <List
                  dense
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {filteredTemplates.map((template) => (
                    <ListItemButton
                      key={template.id}
                      selected={selectedTemplate?.id === template.id}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <ListItemText
                        primary={template.name}
                        secondary={template.subject}
                      />
                      {selectedTemplate?.id === template.id && (
                        <CheckCircleIcon color="primary" fontSize="small" />
                      )}
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Right panel: column preview */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {!selectedTemplate ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    Chọn một template để xem danh sách cột
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {selectedTemplate.name}
                    </Typography>
                    <Chip
                      label={selectedTemplate.subject}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Danh sách cột ({selectedTemplate.columns.length}):
                  </Typography>

                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 260 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>STT</TableCell>
                          <TableCell>Tên cột</TableCell>
                          <TableCell align="center">Hệ số</TableCell>
                          <TableCell align="center">Cột ĐTB</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedTemplate.columns
                          .slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((col, index) => (
                            <TableRow key={`${col.name}-${col.sortOrder}`}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{col.name}</TableCell>
                              <TableCell align="center">
                                {col.coefficient != null ? col.coefficient : '–'}
                              </TableCell>
                              <TableCell align="center">
                                {col.isAverageColumn ? (
                                  <CheckCircleIcon color="success" fontSize="small" />
                                ) : (
                                  '–'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          </Box>
        )}

        {applyError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {applyError}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={applying}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={!selectedTemplate || applying}
        >
          {applying ? 'Đang áp dụng...' : 'Áp dụng'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
