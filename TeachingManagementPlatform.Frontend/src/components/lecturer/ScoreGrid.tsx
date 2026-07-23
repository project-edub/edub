import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { StudentList, StudentListColumn } from '../../types/studentList';
import type { StudentEntry } from '../../types/studentList';
import type { ScoreColumnConfig, ClassificationRange } from '../../utils/scoreCalculation';
import { calculateAverage, classifyScore } from '../../utils/scoreCalculation';
import { validateScore } from '../../utils/scoreValidation';
import { searchEntries } from '../../utils/scoreSearch';
import { useDebounce } from '../../hooks/useDebounce';
import {
  addToQueue,
  getQueue,
  getPendingCount,
  removeFromQueue,
  syncOfflineChanges,
  isOnline,
  onConnectivityChange,
} from '../../utils/offlineSync';
import type { PendingChange, ScoreApiClient } from '../../utils/offlineSync';
import api from '../../services/api';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import type { SelectChangeEvent } from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import ScoreColumnConfigMenu from './ScoreColumnConfigMenu';
import ClassificationConfigPanel from './ClassificationConfigPanel';
import ScoreSummaryBar from './ScoreSummaryBar';
import {
  getClassificationRanges,
  updateClassificationRanges,
} from '../../services/classificationRangeService';
import type { ClassificationRangeRequest } from '../../services/classificationRangeService';

// ── Types ─────────────────────────────────────────────────────────────────────

type SaveStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved'; at: Date }
  | { state: 'offline'; pendingCount: number }
  | { state: 'error'; message: string };

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  columnName: string;
  direction: SortDirection;
}

interface CellError {
  entryId: number;
  columnName: string;
  message: string;
}

interface Props {
  list: StudentList;
  columnConfigs: Map<number, ScoreColumnConfig>;
  classificationRanges: ClassificationRange[];
  onScoreSaved?: () => void;
  /** Called after column config is saved via API – parent should refetch metadata & recalculate averages */
  onConfigSaved?: () => void;
  /** Called after classification ranges are saved via API – parent should refetch ranges to recalculate classifications */
  onClassificationRangesSaved?: () => void;
  /** Called when columns are reordered via drag-and-drop */
  onReorderColumns?: (reorderedColumns: { id: number; sortOrder: number }[]) => Promise<void>;
  /** Called when a student entry is deleted */
  onDeleteEntry?: (entryId: number) => void;
  /** Called when a column is deleted */
  onDeleteColumn?: (columnId: number) => void;
  /** Called when a column is renamed */
  onRenameColumn?: (columnId: number, newName: string) => Promise<void>;
}

// ── Helper: get editable score columns (non-average columns) ──────────────────

function getEditableColumns(columns: StudentListColumn[], columnConfigs: Map<number, ScoreColumnConfig>): StudentListColumn[] {
  return columns.filter((col) => {
    const config = columnConfigs.get(col.id);
    return !config?.isAverageColumn;
  });
}


// ── Helper: detect network error from axios ───────────────────────────────────

function isNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const axiosErr = err as { response?: unknown; code?: string; message?: string };
  // No response means the request never reached the server
  if (!axiosErr.response) return true;
  if (axiosErr.code === 'ERR_NETWORK' || axiosErr.code === 'ECONNABORTED') return true;
  if (axiosErr.message === 'Network Error') return true;
  return false;
}

// ── API client adapter for offlineSync ────────────────────────────────────────

const scoreApiClient: ScoreApiClient = {
  async updateCell(entryId: number, columnName: string, value: string, note?: string) {
    await api.patch(`/student-entries/${entryId}/cell`, {
      columnName,
      value,
      ...(note ? { note } : {}),
    });
  },
};

// ── ScoreGrid Component ───────────────────────────────────────────────────────

export default function ScoreGrid({
  list,
  columnConfigs,
  classificationRanges,
  onScoreSaved,
  onConfigSaved,
  onClassificationRangesSaved,
  onReorderColumns,
  onDeleteEntry,
  onDeleteColumn,
  onRenameColumn,
}: Props) {
  const columns = [...list.columns].sort((a, b) => a.sortOrder - b.sortOrder);
  const entries = [...list.entries].sort((a, b) => a.sortOrder - b.sortOrder);
  const editableColumns = getEditableColumns(columns, columnConfigs);

  // ── Column drag-and-drop state ────────────────────────────────────────────

  const [draggedColumnId, setDraggedColumnId] = useState<number | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<number | null>(null);
  const dragCounterRef = useRef(0);

  const handleColumnDragStart = useCallback((e: React.DragEvent, columnId: number) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(columnId));
  }, []);

  const handleColumnDragEnter = useCallback((e: React.DragEvent, columnId: number) => {
    e.preventDefault();
    dragCounterRef.current++;
    setDragOverColumnId(columnId);
  }, []);

  const handleColumnDragLeave = useCallback((_e: React.DragEvent) => {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragOverColumnId(null);
    }
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleColumnDrop = useCallback((e: React.DragEvent, targetColumnId: number) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOverColumnId(null);
    setDraggedColumnId(null);

    if (draggedColumnId === null || draggedColumnId === targetColumnId || !onReorderColumns) return;

    const currentOrder = [...columns];
    const draggedIndex = currentOrder.findIndex((c) => c.id === draggedColumnId);
    const targetIndex = currentOrder.findIndex((c) => c.id === targetColumnId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [moved] = currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, moved);

    const reordered = currentOrder.map((col, idx) => ({
      id: col.id,
      sortOrder: idx,
    }));

    onReorderColumns(reordered);
  }, [draggedColumnId, columns, onReorderColumns]);

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    dragCounterRef.current = 0;
  }, []);

  // ── Column resize state ───────────────────────────────────────────────────

  const [columnWidths, setColumnWidths] = useState<Map<number, number>>(new Map());
  const resizingRef = useRef<{ columnId: number; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest('th');
    const startWidth = th?.offsetWidth ?? 150;
    const startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      setColumnWidths((prev) => {
        const next = new Map(prev);
        next.set(columnId, newWidth);
        return next;
      });
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // ── Column config menu state ──────────────────────────────────────────────

  const [configMenuAnchor, setConfigMenuAnchor] = useState<HTMLElement | null>(null);
  const [configMenuColumn, setConfigMenuColumn] = useState<StudentListColumn | null>(null);

  const handleOpenConfigMenu = useCallback((event: React.MouseEvent<HTMLElement>, col: StudentListColumn) => {
    // Prevent sort from triggering simultaneously
    event.stopPropagation();
    setConfigMenuAnchor(event.currentTarget);
    setConfigMenuColumn(col);
  }, []);

  const handleCloseConfigMenu = useCallback(() => {
    setConfigMenuAnchor(null);
    setConfigMenuColumn(null);
  }, []);

  const handleConfigSaved = useCallback(() => {
    // Notify parent to refetch metadata from API and recalculate averages
    onConfigSaved?.();
  }, [onConfigSaved]);

  // ── Classification config panel state ─────────────────────────────────────

  const [classificationPanelOpen, setClassificationPanelOpen] = useState(false);
  const [classificationColumnId, setClassificationColumnId] = useState<number | null>(null);
  const [classificationInitialRanges, setClassificationInitialRanges] = useState<ClassificationRange[]>([]);
  const [classificationSaving, setClassificationSaving] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const [classificationLoading, setClassificationLoading] = useState(false);

  const handleOpenClassificationPanel = useCallback(async (columnId: number) => {
    setClassificationColumnId(columnId);
    setClassificationError(null);
    setClassificationLoading(true);
    setClassificationPanelOpen(true);

    try {
      const ranges = await getClassificationRanges(columnId);
      setClassificationInitialRanges(ranges);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Lỗi khi tải cấu hình xếp loại';
      setClassificationError(message);
      setClassificationInitialRanges([]);
    } finally {
      setClassificationLoading(false);
    }
  }, []);

  const handleCloseClassificationPanel = useCallback(() => {
    setClassificationPanelOpen(false);
    setClassificationColumnId(null);
    setClassificationInitialRanges([]);
    setClassificationError(null);
  }, []);

  const handleSaveClassificationRanges = useCallback(
    async (ranges: Omit<ClassificationRange, 'id' | 'columnId'>[]) => {
      if (classificationColumnId === null) return;
      setClassificationSaving(true);
      setClassificationError(null);

      try {
        const payload: ClassificationRangeRequest[] = ranges.map((r) => ({
          minScore: r.minScore,
          maxScore: r.maxScore,
          label: r.label,
          color: r.color,
          sortOrder: r.sortOrder,
        }));

        await updateClassificationRanges(classificationColumnId, payload);

        // Close panel and notify parent to refetch ranges → triggers recalculation (Req 6.4)
        handleCloseClassificationPanel();
        onClassificationRangesSaved?.();
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
              ?? 'Lỗi khi lưu cấu hình xếp loại';
        setClassificationError(message);
      } finally {
        setClassificationSaving(false);
      }
    },
    [classificationColumnId, handleCloseClassificationPanel, onClassificationRangesSaved],
  );

  // ── Warning: source columns missing coefficient (Req 2.4) ─────────────────

  const missingCoefficientWarnings = useMemo(() => {
    const warnings: string[] = [];
    for (const [, config] of columnConfigs) {
      if (!config.isAverageColumn) continue;
      for (const sourceId of config.sourceColumnIds) {
        const sourceConfig = columnConfigs.get(sourceId);
        if (!sourceConfig || sourceConfig.coefficient === null) {
          const col = columns.find((c) => c.id === sourceId);
          if (col) warnings.push(col.name);
        }
      }
    }
    return [...new Set(warnings)];
  }, [columnConfigs, columns]);

  // Local state for cell values (optimistic updates)
  const [localData, setLocalData] = useState<Map<number, Record<string, string>>>(() => {
    const map = new Map<number, Record<string, string>>();
    entries.forEach((entry) => map.set(entry.id, { ...entry.data }));
    return map;
  });

  // Sync localData when list.entries changes from external source
  useEffect(() => {
    setLocalData((prev) => {
      const newMap = new Map<number, Record<string, string>>();
      entries.forEach((entry) => {
        const existing = prev.get(entry.id);
        // Keep local edits if they exist, otherwise use entry data
        newMap.set(entry.id, existing ?? { ...entry.data });
      });
      return newMap;
    });
  }, [list.entries]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search state ──────────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumns, setSearchColumns] = useState<string[]>([]);
  const debouncedQuery = useDebounce(searchQuery, 200);

  // Build entries with local data for filtering
  const entriesWithLocalData: StudentEntry[] = useMemo(() => {
    return entries.map((entry) => ({
      ...entry,
      data: localData.get(entry.id) ?? entry.data,
    }));
  }, [entries, localData]);

  // Filter entries based on debounced search query and selected columns
  const filteredEntries: StudentEntry[] = useMemo(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) return entries;
    const targetColumns = searchColumns.length > 0 ? searchColumns : null;
    return searchEntries(entriesWithLocalData, trimmed, targetColumns);
  }, [debouncedQuery, searchColumns, entriesWithLocalData, entries]);

  // ── Sort state ────────────────────────────────────────────────────────────

  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const handleColumnSort = useCallback((columnName: string) => {
    setSortConfig((prev) => {
      if (prev === null || prev.columnName !== columnName) {
        // New column or no sort → ascending
        return { columnName, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        // Already ascending → descending
        return { columnName, direction: 'desc' };
      }
      // Already descending → no sort
      return null;
    });
  }, []);

  // Sort the filtered entries based on current sortConfig
  const sortedEntries: StudentEntry[] = useMemo(() => {
    if (!sortConfig) return filteredEntries;

    const { columnName, direction } = sortConfig;

    return [...filteredEntries].sort((a, b) => {
      const aData = localData.get(a.id) ?? a.data;
      const bData = localData.get(b.id) ?? b.data;
      const aVal = aData[columnName] ?? '';
      const bVal = bData[columnName] ?? '';

      // Smart sort: detect if both values are numeric
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      const bothNumeric = aVal !== '' && bVal !== '' && !isNaN(aNum) && !isNaN(bNum);

      let comparison: number;
      if (bothNumeric) {
        // Numeric sort (0→10)
        comparison = aNum - bNum;
      } else {
        // Alphabetical sort (A→Z), case-insensitive
        comparison = aVal.localeCompare(bVal, 'vi', { sensitivity: 'base' });
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredEntries, sortConfig, localData]);

  const handleSearchColumnsChange = useCallback((event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSearchColumns(typeof value === 'string' ? value.split(',') : value);
  }, []);

  // Paging
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const pagedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, currentPage, pageSize]);

  const [cellErrors, setCellErrors] = useState<CellError[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: 'idle' });

  // Refs for focus management
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const getCellKey = (entryId: number, columnName: string) => `${entryId}:${columnName}`;

  const registerRef = useCallback((entryId: number, columnName: string, el: HTMLInputElement | null) => {
    const key = getCellKey(entryId, columnName);
    if (el) {
      inputRefs.current.set(key, el);
    } else {
      inputRefs.current.delete(key);
    }
  }, []);

  // ── Cell value change handler with inline validation ──────────────────────

  const handleCellChange = useCallback((entryId: number, columnName: string, rawValue: string) => {
    // Update local data immediately
    setLocalData((prev) => {
      const newMap = new Map(prev);
      const entryData = { ...(newMap.get(entryId) ?? {}) };
      entryData[columnName] = rawValue;
      newMap.set(entryId, entryData);
      return newMap;
    });

    // Validate and show/clear errors
    const result = validateScore(rawValue);
    setCellErrors((prev) => {
      const filtered = prev.filter(
        (e) => !(e.entryId === entryId && e.columnName === columnName),
      );
      if (!result.valid && result.error) {
        return [...filtered, { entryId, columnName, message: result.error }];
      }
      return filtered;
    });
  }, []);

  // ── Auto-save on blur (with offline sync integration) ────────────────────────

  const handleCellBlur = useCallback(async (entryId: number, columnName: string) => {
    const entryData = localData.get(entryId);
    if (!entryData) return;

    const rawValue = entryData[columnName] ?? '';
    const validation = validateScore(rawValue);

    // Don't save if invalid
    if (!validation.valid) return;

    // Determine the value to save: numeric (rounded), text, or empty
    const isTextValue = validation.textValue !== undefined;
    const newValueStr = isTextValue
      ? validation.textValue!
      : validation.value !== null
        ? String(validation.value)
        : '';

    // Check if value actually changed from the original entry
    const originalEntry = entries.find((e) => e.id === entryId);
    const originalValue = originalEntry?.data[columnName] ?? '';

    if (newValueStr === originalValue) return;

    // Persist rounded numeric value locally (text stays as-is)
    if (validation.value !== null) {
      setLocalData((prev) => {
        const newMap = new Map(prev);
        const data = { ...(newMap.get(entryId) ?? {}) };
        data[columnName] = String(validation.value);
        newMap.set(entryId, data);
        return newMap;
      });
    }

    // If already offline, queue directly without attempting API call (Req 4.1)
    if (!isOnline()) {
      const pendingChange: PendingChange = {
        id: crypto.randomUUID(),
        entryId,
        columnName,
        value: newValueStr,
        timestamp: Date.now(),
        status: 'pending',
      };
      addToQueue(pendingChange);
      setSaveStatus({ state: 'offline', pendingCount: getPendingCount() });
      return;
    }

    // Auto-save via API
    setSaveStatus({ state: 'saving' });
    try {
      await api.patch(`/student-entries/${entryId}/cell`, {
        columnName,
        value: newValueStr,
      });
      setSaveStatus({ state: 'saved', at: new Date() });
      onScoreSaved?.();
    } catch (err: unknown) {
      // Req 4.1: Network failure → queue to localStorage
      if (isNetworkError(err)) {
        const pendingChange: PendingChange = {
          id: crypto.randomUUID(),
          entryId,
          columnName,
          value: newValueStr,
          timestamp: Date.now(),
          status: 'pending',
        };
        addToQueue(pendingChange);
        setSaveStatus({ state: 'offline', pendingCount: getPendingCount() });
      } else {
        const message = err instanceof Error ? err.message : 'Lỗi khi lưu';
        setSaveStatus({ state: 'error', message });
      }
    }
  }, [localData, entries, onScoreSaved]);

  // ── Offline sync: subscribe to connectivity changes (Req 4.3) ──────────────

  useEffect(() => {
    const unsubscribe = onConnectivityChange(async (online) => {
      if (online) {
        // Reconnected → sync pending changes
        const queue = getQueue();
        if (queue.length === 0) return;

        setSaveStatus({ state: 'saving' });
        const { synced, failed } = await syncOfflineChanges(queue, scoreApiClient);

        // Remove successfully synced items from queue
        if (synced.length > 0) {
          removeFromQueue(synced);
        }

        // Req 4.5: If some failed, they remain in queue with status 'failed'
        const remainingCount = getPendingCount();
        if (remainingCount > 0) {
          setSaveStatus({ state: 'offline', pendingCount: remainingCount });
        } else if (failed.length > 0) {
          setSaveStatus({ state: 'error', message: `${failed.length} thay đổi đồng bộ thất bại` });
        } else {
          setSaveStatus({ state: 'saved', at: new Date() });
          onScoreSaved?.();
        }
      } else {
        // Went offline → update status with current pending count (Req 4.2)
        const pendingCount = getPendingCount();
        setSaveStatus({ state: 'offline', pendingCount });
      }
    });

    return unsubscribe;
  }, [onScoreSaved]);

  // ── Keyboard navigation: Tab/Enter ────────────────────────────────────────

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    entryId: number,
    columnName: string,
  ) => {
    const rowIndex = sortedEntries.findIndex((en) => en.id === entryId);
    const colIndex = editableColumns.findIndex((c) => c.name === columnName);

    if (e.key === 'Tab') {
      e.preventDefault();
      let nextRowIndex = rowIndex;
      let nextColIndex: number;

      if (e.shiftKey) {
        // Shift+Tab → previous cell horizontal
        nextColIndex = colIndex - 1;
        if (nextColIndex < 0) {
          // Wrap to previous row, last column
          nextRowIndex = rowIndex - 1;
          nextColIndex = editableColumns.length - 1;
        }
      } else {
        // Tab → next cell horizontal
        nextColIndex = colIndex + 1;
        if (nextColIndex >= editableColumns.length) {
          // Wrap to next row, first column
          nextRowIndex = rowIndex + 1;
          nextColIndex = 0;
        }
      }

      // Boundary check
      if (nextRowIndex < 0 || nextRowIndex >= sortedEntries.length) return;

      const targetEntry = sortedEntries[nextRowIndex];
      const targetColumn = editableColumns[nextColIndex];
      if (!targetEntry || !targetColumn) return;

      const key = getCellKey(targetEntry.id, targetColumn.name);
      const targetInput = inputRefs.current.get(key);
      targetInput?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter → next cell vertical (same column, next row)
      const nextRowIndex = rowIndex + 1;
      if (nextRowIndex >= sortedEntries.length) return;

      const targetEntry = sortedEntries[nextRowIndex];
      const key = getCellKey(targetEntry.id, columnName);
      const targetInput = inputRefs.current.get(key);
      targetInput?.focus();
    }
  }, [sortedEntries, editableColumns]);

  // ── Computed averages + classifications ───────────────────────────────────

  const computeAverageForEntry = useCallback((entryId: number, avgColumn: StudentListColumn) => {
    const entryData = localData.get(entryId) ?? {};
    const config = columnConfigs.get(avgColumn.id);
    if (!config) return { average: null, formula: '' };

    return calculateAverage(
      entryData,
      config.sourceColumnIds,
      columns.map((c) => ({ id: c.id, name: c.name })),
      columnConfigs,
    );
  }, [localData, columnConfigs, columns]);

  const getClassification = useCallback((average: number | null) => {
    return classifyScore(average, classificationRanges);
  }, [classificationRanges]);

  // ── Get cell error message ────────────────────────────────────────────────

  const getCellError = (entryId: number, columnName: string): string | undefined => {
    return cellErrors.find(
      (e) => e.entryId === entryId && e.columnName === columnName,
    )?.message;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Save status indicator */}
      <SaveStatusIndicator status={saveStatus} />

      {/* Warning: source columns missing coefficient (Req 2.4) */}
      {missingCoefficientWarnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Cột nguồn chưa có hệ số: <strong>{missingCoefficientWarnings.join(', ')}</strong>.
          Các cột này sẽ bị bỏ qua khi tính trung bình.
        </Alert>
      )}

      {/* Search bar and column filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Tìm kiếm..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 220 }}
          aria-label="Tìm kiếm học sinh"
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="search-columns-label">Cột tìm kiếm</InputLabel>
          <Select
            labelId="search-columns-label"
            multiple
            value={searchColumns}
            onChange={handleSearchColumnsChange}
            label="Cột tìm kiếm"
            renderValue={(selected) =>
              selected.length === 0
                ? 'Tất cả cột'
                : selected.join(', ')
            }
          >
            {columns.map((col) => (
              <MenuItem key={col.id} value={col.name}>
                <Checkbox checked={searchColumns.includes(col.name)} size="small" />
                <ListItemText primary={col.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Score Grid Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 50, minWidth: 50 }}>#</th>
            {columns.map((col) => {
              const config = columnConfigs.get(col.id);
              const isAvg = config?.isAverageColumn;
              const isSorted = sortConfig?.columnName === col.name;
              const width = columnWidths.get(col.id);
              return (
                <th
                  key={col.id}
                  style={{
                    ...thStyle,
                    ...(isAvg ? { backgroundColor: '#f5f5f5' } : {}),
                    cursor: onReorderColumns ? (draggedColumnId ? 'grabbing' : 'pointer') : 'pointer',
                    userSelect: 'none',
                    opacity: draggedColumnId === col.id ? 0.5 : 1,
                    borderLeft: dragOverColumnId === col.id && draggedColumnId !== col.id
                      ? '3px solid #1976d2'
                      : undefined,
                    width: width ? `${width}px` : undefined,
                    minWidth: width ? `${width}px` : 100,
                    position: 'relative',
                  }}
                  draggable={!!onReorderColumns}
                  onDragStart={(e) => handleColumnDragStart(e, col.id)}
                  onDragEnter={(e) => handleColumnDragEnter(e, col.id)}
                  onDragLeave={handleColumnDragLeave}
                  onDragOver={handleColumnDragOver}
                  onDrop={(e) => handleColumnDrop(e, col.id)}
                  onDragEnd={handleColumnDragEnd}
                  onClick={() => handleColumnSort(col.name)}
                  onContextMenu={(e) => { e.preventDefault(); handleOpenConfigMenu(e, col); }}
                  aria-sort={
                    isSorted
                      ? sortConfig!.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    {onReorderColumns && <span style={{ cursor: 'grab', marginRight: 2 }} title="Kéo để di chuyển cột">⠿</span>}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleOpenConfigMenu(e, col); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleOpenConfigMenu(e as unknown as React.MouseEvent<HTMLElement>, col); } }}
                      style={{ cursor: 'pointer' }}
                      aria-label={`Cấu hình cột ${col.name}`}
                    >
                      {col.name}
                    </span>
                    {isSorted && (
                      sortConfig!.direction === 'asc' ? (
                        <ArrowUp size={16} style={{ color: '#1976d2' }} />
                      ) : (
                        <ArrowDown size={16} style={{ color: '#1976d2' }} />
                      )
                    )}
                  </span>
                  {config?.coefficient != null && (
                    <span style={{ fontSize: 11, color: '#666', marginLeft: 4 }}>
                      (HS: {config.coefficient})
                    </span>
                  )}
                  {isAvg && (
                    <span style={{ fontSize: 11, color: '#1976d2', marginLeft: 4 }}>
                      [ĐTB]
                    </span>
                  )}
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, col.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 5,
                      cursor: 'col-resize',
                      background: 'transparent',
                    }}
                    title="Kéo để thay đổi kích thước cột"
                  />
                </th>
              );
            })}
            {onDeleteEntry && <th style={{ ...thStyle, width: 50, minWidth: 50 }}>Xóa</th>}
          </tr>
        </thead>
        <tbody>
          {pagedEntries.map((entry, idx) => {
            const entryData = localData.get(entry.id) ?? entry.data;
            return (
              <tr key={entry.id}>
                <td style={{ ...tdStyle, width: 50 }}>{idx + 1}</td>
                {columns.map((col) => {
                  const config = columnConfigs.get(col.id);
                  const isAvg = config?.isAverageColumn;
                  const width = columnWidths.get(col.id);
                  const cellWidthStyle = width ? { width: `${width}px`, minWidth: `${width}px` } : {};

                  if (isAvg) {
                    // Render computed average + classification
                    const { average } = computeAverageForEntry(entry.id, col);
                    const classification = getClassification(average);
                    return (
                      <td
                        key={col.id}
                        style={{
                          ...tdStyle,
                          ...cellWidthStyle,
                          backgroundColor: classification?.color ? `${classification.color}20` : '#f5f5f5',
                          textAlign: 'center',
                          fontWeight: 600,
                        }}
                      >
                        {average !== null ? (
                          <span>
                            {average}
                            {classification && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 11,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  backgroundColor: classification.color,
                                  color: '#fff',
                                }}
                              >
                                {classification.label}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>–</span>
                        )}
                      </td>
                    );
                  }

                  // Editable score cell
                  const cellError = getCellError(entry.id, col.name);
                  const rawValue = entryData[col.name] ?? '';

                  return (
                    <td key={col.id} style={{ ...tdStyle, ...cellWidthStyle, position: 'relative' }}>
                      <input
                        ref={(el) => registerRef(entry.id, col.name, el)}
                        type="text"
                        value={rawValue}
                        onChange={(e) => handleCellChange(entry.id, col.name, e.target.value)}
                        onBlur={() => handleCellBlur(entry.id, col.name)}
                        onKeyDown={(e) => handleKeyDown(e, entry.id, col.name)}
                        aria-label={`${col.name} - Học sinh ${idx + 1}`}
                        aria-invalid={!!cellError}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          border: cellError ? '1px solid #d32f2f' : '1px solid #ddd',
                          borderRadius: 4,
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                      {cellError && (
                        <div
                          role="alert"
                          style={{
                            position: 'absolute',
                            bottom: -16,
                            left: 0,
                            fontSize: 11,
                            color: '#d32f2f',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cellError}
                        </div>
                      )}
                    </td>
                  );
                })}
                {onDeleteEntry && (
                  <td style={{ ...tdStyle, width: 50, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(entry.id)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#d32f2f', fontSize: 16 }}
                      title="Xóa học sinh"
                      aria-label={`Xóa học sinh ${idx + 1}`}
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {sortedEntries.length === 0 && entries.length > 0 && (
        <p style={{ color: 'var(--edub-text-secondary)', textAlign: 'center', padding: 24 }}>
          Không tìm thấy kết quả phù hợp.
        </p>
      )}

      {entries.length === 0 && (
        <p style={{ color: 'var(--edub-text-secondary)', textAlign: 'center', padding: 24 }}>
          Chưa có học sinh nào trong danh sách.
        </p>
      )}

      {/* Paging controls */}
      {sortedEntries.length > pageSize && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12, padding: '8px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} style={pagingBtnStyle}>‹ Trước</button>
          <span style={{ fontSize: 13 }}>Trang {currentPage} / {totalPages}</span>
          <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={pagingBtnStyle}>Sau ›</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
            <label style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Hiện:</label>
            <input type="number" min={10} max={50} value={pageSize} onChange={(e) => { setPageSize(Math.max(10, Math.min(50, Number(e.target.value) || 10))); setCurrentPage(1); }} style={{ width: 48, padding: '2px 4px', fontSize: 12, textAlign: 'center', borderRadius: 4, border: '1px solid #e2e8f0' }} />
            <span style={{ fontSize: 12 }}>/trang</span>
          </div>
        </div>
      )}

      {/* Summary stats bar – auto-recalculates when entries/config change (Req 9.2) */}
      {entries.length > 0 && (
        <ScoreSummaryBar
          entries={entriesWithLocalData}
          columns={columns}
          columnConfigs={columnConfigs}
          classificationRanges={classificationRanges}
        />
      )}

      {/* Score Column Config Menu (Popover) */}
      {configMenuColumn && (
        <ScoreColumnConfigMenu
          anchorEl={configMenuAnchor}
          open={Boolean(configMenuAnchor)}
          onClose={handleCloseConfigMenu}
          column={configMenuColumn}
          allColumns={columns}
          columnConfigs={columnConfigs}
          onConfigSaved={handleConfigSaved}
          onOpenClassificationConfig={handleOpenClassificationPanel}
          onDeleteColumn={onDeleteColumn}
          onRenameColumn={onRenameColumn}
        />
      )}

      {/* Classification Config Panel (Dialog) */}
      <Dialog
        open={classificationPanelOpen}
        onClose={handleCloseClassificationPanel}
        maxWidth="sm"
        fullWidth={false}
      >
        <DialogContent sx={{ p: 0 }}>
          {classificationLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Đang tải cấu hình xếp loại...
              </Typography>
            </Box>
          ) : (
            classificationColumnId !== null && (
              <ClassificationConfigPanel
                columnId={classificationColumnId}
                initialRanges={classificationInitialRanges}
                onSave={handleSaveClassificationRanges}
                onCancel={handleCloseClassificationPanel}
                saving={classificationSaving}
                error={classificationError}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── SaveStatusIndicator ─────────────────────────────────────────────────────

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status.state === 'idle') return null;

  const styles: React.CSSProperties = {
    padding: '6px 12px',
    marginBottom: 8,
    borderRadius: 4,
    fontSize: 13,
    display: 'inline-block',
  };

  switch (status.state) {
    case 'saving':
      return (
        <div style={{ ...styles, backgroundColor: '#fff3e0', color: '#e65100' }}>
          Đang lưu...
        </div>
      );
    case 'saved':
      return (
        <div style={{ ...styles, backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
          Đã lưu lúc {status.at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      );
    case 'offline':
      return (
        <div style={{ ...styles, backgroundColor: '#e3f2fd', color: '#0d47a1' }}>
          Đang lưu ngoại tuyến – sẽ đồng bộ khi có kết nối ({status.pendingCount} thay đổi chờ)
        </div>
      );
    case 'error':
      return (
        <div style={{ ...styles, backgroundColor: '#ffebee', color: '#c62828' }}>
          Lỗi: {status.message}
        </div>
      );
    default:
      return null;
  }
}

// ── Styles ──────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid #ccc',
  borderRight: '1px solid var(--edub-border)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #eee',
  borderRight: '1px solid var(--edub-border)',
};

const pagingBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  background: '#fff',
  cursor: 'pointer',
};

export type { SaveStatus, SortConfig, SortDirection, Props as ScoreGridProps };
