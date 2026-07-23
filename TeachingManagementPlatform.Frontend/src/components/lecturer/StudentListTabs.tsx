import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { StudentList } from '../../types/studentList';
import type { AttendanceStudentSource, AttendanceSlot } from '../../types/attendance';
import type { ApiError } from '../../types/common';
import type { ScoreColumnConfig, ClassificationRange } from '../../utils/scoreCalculation';
import * as studentListService from '../../services/studentListService';
import { getScoreMetadata, toColumnConfigMap } from '../../services/scoreMetadataService';
import { getClassificationRanges } from '../../services/classificationRangeService';
import StudentListTable from './StudentListTable';
import ScoreGrid from './ScoreGrid';
import ScoreTemplatePicker from './ScoreTemplatePicker';
import ExcelImportModal from './ExcelImportModal';
import AttendanceTable from './AttendanceTable';
import AttendanceConfigForm from './AttendanceConfigForm';
import ConfirmDialog from '../common/ConfirmDialog';
import SelectiveCloneDialog from './SelectiveCloneDialog';
import { useAttendanceStore } from '../../store/attendanceStore';
import { exportAttendanceExcel } from '../../utils/exportAttendanceExcel';

interface Props {
  classId: number;
  className?: string;
}

type ViewMode = 'students' | 'scores' | 'attendance';

export default function StudentListTabs({ classId, className = 'lop-hoc' }: Props) {
  const [lists, setLists] = useState<StudentList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('students');

  // Create list state
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Rename list state
  const [renamingListId, setRenamingListId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [confirmDeleteAttendanceOpen, setConfirmDeleteAttendanceOpen] = useState(false);
  const attendanceImportInputId = 'attendance-import-input';

  // Selective clone dialog state
  const [showSelectiveCloneDialog, setShowSelectiveCloneDialog] = useState(false);
  const [cloning, setCloning] = useState(false);

  // Score template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Copy column dialog state
  const [showCopyColumnDialog, setShowCopyColumnDialog] = useState(false);
  const [copySourceColId, setCopySourceColId] = useState<number | null>(null);
  const [copyTargetColId, setCopyTargetColId] = useState<number | null>(null);
  const [copyBonus, setCopyBonus] = useState('0');
  const [copyCap, setCopyCap] = useState(true);
  const [copyMaxScore, setCopyMaxScore] = useState('10');

  // Score metadata state
  const [columnConfigs, setColumnConfigs] = useState<Map<number, ScoreColumnConfig>>(new Map());
  const [classificationRanges, setClassificationRanges] = useState<ClassificationRange[]>([]);

  // Column visibility state (Task 4)
  const [visibleColumns, setVisibleColumns] = useState<Set<number>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Absence threshold state (Task 6)
  const [absenceThreshold, setAbsenceThreshold] = useState<number>(20);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await studentListService.getAll(classId);
      setLists(data);
      if (data.length > 0 && (activeListId === null || !data.find((l) => l.id === activeListId))) {
        setActiveListId(data[0].id);
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [classId, activeListId]);

  // Load score metadata when active list changes
  const loadScoreMetadata = useCallback(async () => {
    if (!activeListId) return;
    try {
      const metadata = await getScoreMetadata(activeListId);
      const configMap = toColumnConfigMap(metadata);
      setColumnConfigs(configMap);

      // Load classification ranges for average columns
      const avgConfig = Array.from(configMap.values()).find((c) => c.isAverageColumn);
      if (avgConfig) {
        const ranges = await getClassificationRanges(avgConfig.columnId);
        setClassificationRanges(ranges);
      } else {
        setClassificationRanges([]);
      }
    } catch {
      // Score metadata not configured yet – that's fine
      setColumnConfigs(new Map());
      setClassificationRanges([]);
    }
  }, [activeListId]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    loadScoreMetadata();
  }, [loadScoreMetadata]);

  // Initialize visible columns when active list changes
  useEffect(() => {
    if (activeList) {
      setVisibleColumns(new Set(activeList.columns.map((c) => c.id)));
    }
  }, [activeListId]); // eslint-disable-line react-hooks/exhaustive-deps

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  const activeList = lists.find((l) => l.id === activeListId) ?? null;
  const attendanceStudents: AttendanceStudentSource[] = activeList
    ? [...activeList.entries]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((entry) => ({
          studentId: String(entry.id),
          name: resolveStudentName(activeList, entry),
        }))
    : [];
  const { attendanceList, addSlot, updateSlotDate, removeSlot, resetAttendanceList, toggleSlotStatus, replaceAttendanceList } = useAttendanceStore(classId, attendanceStudents);
  const hasStudents = Boolean(activeList && activeList.entries.length > 0);

  // --- List CRUD ---
  async function handleCreateList() {
    if (!newListName.trim()) return;
    setActionLoading(true);
    try {
      const created = await studentListService.create(classId, { name: newListName.trim() });
      setNewListName('');
      setCreatingList(false);
      await loadLists();
      setActiveListId(created.id);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRenameList() {
    if (renamingListId === null || !renameValue.trim()) return;
    setActionLoading(true);
    try {
      await studentListService.update(renamingListId, { name: renameValue.trim() });
      setRenamingListId(null);
      setRenameValue('');
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteList(id: number) {
    setActionLoading(true);
    try {
      await studentListService.remove(id);
      if (activeListId === id) {
        setActiveListId(null);
      }
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSetMain(id: number) {
    setActionLoading(true);
    try {
      await studentListService.setMain(id);
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClone(_id: number) {
    setShowSelectiveCloneDialog(true);
  }

  async function handleSelectiveClone(selectedColumnIds: number[], newListName: string) {
    if (!activeList) return;
    setCloning(true);
    try {
      const cloned = await studentListService.cloneWithSelectedColumns(
        activeList.id,
        classId,
        selectedColumnIds,
        newListName
      );
      setShowSelectiveCloneDialog(false);
      await loadLists();
      setActiveListId(cloned.id);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setCloning(false);
    }
  }

  // --- Column handlers ---
  async function handleAddColumn(name: string) {
    if (!activeList) return;
    setActionLoading(true);
    try {
      await studentListService.addColumn(activeList.id, { name, sortOrder: activeList.columns.length });
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateColumn(columnId: number, name: string) {
    if (!activeList) return;
    // Task 7: Check for duplicate column name (case-insensitive)
    const isDuplicate = activeList.columns.some(
      (col) => col.id !== columnId && col.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      setError(`Cột có tên "${name}" đã tồn tại trong danh sách.`);
      return;
    }
    setActionLoading(true);
    try {
      await studentListService.updateColumn(columnId, { name });
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteColumn(columnId: number) {
    setActionLoading(true);
    try {
      await studentListService.deleteColumn(columnId);
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReorderColumns(reorderedColumns: { id: number; sortOrder: number }[]) {
    setActionLoading(true);
    try {
      // Update each column's sortOrder via API
      for (const col of reorderedColumns) {
        await studentListService.updateColumn(col.id, { sortOrder: col.sortOrder });
      }
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  // --- Entry handlers ---
  async function handleAddEntry(data: Record<string, string>) {
    if (!activeList) return;
    setActionLoading(true);
    try {
      await studentListService.addEntry(activeList.id, { data, sortOrder: activeList.entries.length });
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteEntry(entryId: number) {
    setActionLoading(true);
    try {
      await studentListService.deleteEntry(entryId);
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  // --- Excel import/export ---
  function handleImportSuccess() {
    setShowImportModal(false);
    loadLists();
  }

  // --- Attendance Excel import ---
  async function handleImportAttendanceFile(file: File | null) {
    if (!file) return;
    setActionLoading(true);
    try {
      const { parseAttendanceFile } = await import('../../utils/importAttendanceExcel');
      const parsed = await parseAttendanceFile(file, classId, attendanceStudents);
      replaceAttendanceList(parsed);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleExportExcel() {
    if (!activeList) return;
    setActionLoading(true);
    try {
      await studentListService.exportExcel(activeList.id);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  function handleGenerateAttendance(slots: AttendanceSlot[], _selectedColumnNames: string[]) {
    // Add all generated slots at once
    for (const slot of slots) {
      addSlot(slot);
    }
  }

  function handleExportAttendance() {
    if (!attendanceList) return;
    exportAttendanceExcel(attendanceList, className);
  }

  function handleDeleteAttendance() {
    setConfirmDeleteAttendanceOpen(true);
  }

  function handleConfirmDeleteAttendance() {
    resetAttendanceList();
    setConfirmDeleteAttendanceOpen(false);
  }

  // --- Score callbacks ---
  function handleScoreSaved() {
    // Do NOT call loadLists() here — it causes a full re-fetch and re-render
    // which resets ScoreGrid state (losing in-progress edits and causing page reset).
    // The score is already saved optimistically in ScoreGrid's local state and persisted via API.
  }

  function handleConfigSaved() {
    loadScoreMetadata();
    // Do NOT call loadLists() here — same issue as handleScoreSaved.
    // It causes a full re-fetch and re-render which resets ScoreGrid state.
    // Column config is metadata-only and doesn't require re-fetching the full lists.
  }

  function handleClassificationRangesSaved() {
    loadScoreMetadata();
  }

  function handleTemplateApplied() {
    loadLists();
    loadScoreMetadata();
  }

  // --- Add column state (lifted from StudentListTable for action bar) ---
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  async function handleAddColumnFromBar() {
    if (!newColumnName.trim() || !activeList) return;
    setActionLoading(true);
    try {
      await studentListService.addColumn(activeList.id, { name: newColumnName.trim(), sortOrder: activeList.columns.length });
      setNewColumnName('');
      setAddingColumn(false);
      await loadLists();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <p>Đang tải danh sách học sinh...</p>;
  }

  // Common button style for action buttons (Req 4: same color, same size, except delete)
  const actionBtnStyle: React.CSSProperties = { padding: '8px 14px', fontSize: '0.8125rem' };

  return (
    <div>
      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>
      )}

      {/* Req 1 & 2: Excel-style sheet tabs with + Thêm danh sách and Tạo Điểm Danh pushed to the right */}
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 0, gap: 0 }}>
        {/* Left: Excel-style sheet tabs */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, flexShrink: 1, overflow: 'auto' }}>
          {lists.map((list) => {
            const isActive = activeListId === list.id;
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveListId(list.id)}
                style={{
                  padding: '6px 16px',
                  border: '1px solid var(--edub-border)',
                  borderBottom: isActive ? '1px solid var(--edub-surface)' : '1px solid var(--edub-border)',
                  borderRadius: '6px 6px 0 0',
                  background: isActive ? 'var(--edub-surface)' : 'var(--edub-surface-muted)',
                  color: isActive ? 'var(--edub-text-primary)' : 'var(--edub-text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  marginRight: -1,
                  position: 'relative',
                  zIndex: isActive ? 2 : 1,
                  whiteSpace: 'nowrap',
                  fontFamily: '"Roboto Flex", "Segoe UI", sans-serif',
                }}
              >
                {list.name}
                {list.isMain && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>★</span>}
              </button>
            );
          })}
        </div>

        {/* Right: + Thêm danh sách */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 4 }}>
          {creatingList ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Tên danh sách"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                style={{ padding: 4, fontSize: 12 }}
                aria-label="Tên danh sách mới"
              />
              <button type="button" onClick={handleCreateList} disabled={actionLoading} className="btn btn-update" style={{ padding: '4px 8px', fontSize: 12 }}>
                Lưu
              </button>
              <button type="button" onClick={() => { setCreatingList(false); setNewListName(''); }} className="btn btn-neutral" style={{ padding: '4px 8px', fontSize: 12 }}>
                Hủy
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingList(true)}
              className="btn btn-add"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              + Thêm danh sách
            </button>
          )}
        </div>
      </div>

      {/* Border line below the sheet tabs */}
      <div style={{ borderBottom: '1px solid var(--edub-border)', marginBottom: 12 }} />

      {/* Req 3: View mode tabs - full width, evenly distributed, visually distinct */}
      <div style={{ display: 'flex', marginBottom: 16, border: '1px solid var(--edub-border)', borderRadius: 6, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setViewMode('students')}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            borderRight: '1px solid var(--edub-border)',
            background: viewMode === 'students' ? '#e3f2fd' : 'var(--edub-surface)',
            color: viewMode === 'students' ? '#1565c0' : 'var(--edub-text-secondary)',
            fontWeight: viewMode === 'students' ? 600 : 400,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            transition: 'background 150ms ease',
            fontFamily: '"Roboto Flex", "Segoe UI", sans-serif',
          }}
        >
          Danh Sách Học Sinh
        </button>
        <button
          type="button"
          onClick={() => setViewMode('scores')}
          disabled={!hasStudents}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            borderRight: '1px solid var(--edub-border)',
            background: viewMode === 'scores' ? '#e3f2fd' : 'var(--edub-surface)',
            color: !hasStudents ? '#ccc' : viewMode === 'scores' ? '#1565c0' : 'var(--edub-text-secondary)',
            fontWeight: viewMode === 'scores' ? 600 : 400,
            fontSize: '0.8125rem',
            cursor: hasStudents ? 'pointer' : 'not-allowed',
            transition: 'background 150ms ease',
            fontFamily: '"Roboto Flex", "Segoe UI", sans-serif',
          }}
          title={!hasStudents ? 'Cần có học sinh để sử dụng bảng điểm' : undefined}
        >
          Bảng Điểm
        </button>
        <button
          type="button"
          onClick={() => setViewMode('attendance')}
          disabled={!hasStudents}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            background: viewMode === 'attendance' ? '#e3f2fd' : 'var(--edub-surface)',
            color: !hasStudents ? '#ccc' : viewMode === 'attendance' ? '#1565c0' : 'var(--edub-text-secondary)',
            fontWeight: viewMode === 'attendance' ? 600 : 400,
            fontSize: '0.8125rem',
            cursor: hasStudents ? 'pointer' : 'not-allowed',
            transition: 'background 150ms ease',
            fontFamily: '"Roboto Flex", "Segoe UI", sans-serif',
          }}
          title={!hasStudents ? 'Cần có học sinh trong danh sách để tạo điểm danh' : undefined}
        >
          Điểm Danh
        </button>
      </div>

      {/* Active list actions & content */}
      {activeList && (
        <div>
          {/* Req 4 & 5: Action bar with uniform buttons + Thêm cột moved here */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {viewMode === 'students' && renamingListId === activeList.id ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  style={{ padding: 4 }}
                  aria-label="Đổi tên danh sách"
                />
                <button type="button" onClick={handleRenameList} disabled={actionLoading} className="btn btn-view" style={actionBtnStyle}>
                  Lưu
                </button>
                <button type="button" onClick={() => { setRenamingListId(null); setRenameValue(''); }} className="btn btn-neutral" style={actionBtnStyle}>
                  Hủy
                </button>
              </div>
            ) : viewMode === 'students' ? (
              <button
                type="button"
                onClick={() => { setRenamingListId(activeList.id); setRenameValue(activeList.name); }}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Sửa tên
              </button>
            ) : null}

            {viewMode === 'attendance' && attendanceList && (
              <>
                <input
                  id={attendanceImportInputId}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImportAttendanceFile(e.target.files ? e.target.files[0] : null)}
                />
                <label
                  htmlFor={attendanceImportInputId}
                  className="btn btn-view"
                  style={{ ...actionBtnStyle, cursor: 'pointer', ...(actionLoading ? { pointerEvents: 'none', opacity: 0.65 } : {}) }}
                >
                  Nhập Excel
                </label>

                <button
                  type="button"
                  onClick={handleExportAttendance}
                  disabled={actionLoading || !hasStudents}
                  className="btn btn-view"
                  style={actionBtnStyle}
                >
                  Xuất Excel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAttendance}
                  disabled={actionLoading}
                  className="btn btn-delete"
                  style={actionBtnStyle}
                >
                  Xóa danh sách
                </button>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginLeft: 8,
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}>
                  <label htmlFor="absence-threshold-input" style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--edub-text-secondary)' }}>
                    ⚠️ Ngưỡng vắng
                  </label>
                  <input
                    id="absence-threshold-input"
                    type="number"
                    min={0}
                    max={100}
                    value={absenceThreshold}
                    onChange={(e) => setAbsenceThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    style={{ width: 48, padding: '4px 6px', fontSize: 13, textAlign: 'center', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    aria-label="Ngưỡng cảnh báo vắng (%)"
                  />
                  <span style={{ fontSize: 12, color: 'var(--edub-text-secondary)' }}>%</span>
                </div>
              </>
            )}

            {viewMode === 'students' && !activeList.isMain && (
              <button
                type="button"
                onClick={() => handleSetMain(activeList.id)}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Đặt làm DS chính
              </button>
            )}

            {viewMode === 'students' && (
              <button
                type="button"
                onClick={() => handleClone(activeList.id)}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Nhân bản
              </button>
            )}

            {viewMode === 'students' && (
              <button
                type="button"
                onClick={() => handleDeleteList(activeList.id)}
                disabled={actionLoading}
                className="btn btn-delete"
                style={actionBtnStyle}
              >
                Xóa danh sách
              </button>
            )}

            {viewMode === 'students' && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Nhập Excel
              </button>
            )}

            {viewMode === 'students' && (
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Xuất Excel
              </button>
            )}

            {/* Column visibility selector */}
            {viewMode === 'students' && activeList && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  className="btn btn-view"
                  style={actionBtnStyle}
                >
                  Ẩn/Hiện cột
                </button>
                {showColumnSelector && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 100,
                    background: 'var(--edub-surface, #fff)',
                    border: '1px solid var(--edub-border)',
                    borderRadius: 6,
                    padding: 8,
                    minWidth: 180,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    marginTop: 4,
                  }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => setVisibleColumns(new Set(activeList.columns.map((c) => c.id)))}
                        className="btn btn-view"
                        style={{ fontSize: 11, padding: '2px 6px' }}
                      >
                        Hiện tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleColumns(new Set())}
                        className="btn btn-neutral"
                        style={{ fontSize: 11, padding: '2px 6px' }}
                      >
                        Ẩn tất cả
                      </button>
                    </div>
                    {activeList.columns
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((col) => (
                        <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 13, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(col.id)}
                            onChange={() => {
                              setVisibleColumns((prev) => {
                                const next = new Set(prev);
                                if (next.has(col.id)) {
                                  next.delete(col.id);
                                } else {
                                  next.add(col.id);
                                }
                                return next;
                              });
                            }}
                          />
                          {col.name}
                        </label>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Req 5: Thêm cột moved to scores action bar */}
            {viewMode === 'scores' && (
              addingColumn ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Tên cột"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddColumnFromBar(); } }}
                    style={{ padding: 4, fontSize: 13 }}
                    aria-label="Tên cột mới"
                  />
                  <button type="button" onClick={handleAddColumnFromBar} disabled={actionLoading} className="btn btn-view" style={actionBtnStyle}>
                    Lưu
                  </button>
                  <button type="button" onClick={() => { setAddingColumn(false); setNewColumnName(''); }} className="btn btn-neutral" style={actionBtnStyle}>
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingColumn(true)}
                  disabled={actionLoading}
                  className="btn btn-view"
                  style={actionBtnStyle}
                >
                  Thêm cột
                </button>
              )
            )}

            {viewMode === 'scores' && (
              <button
                type="button"
                onClick={() => handleAddEntry({})}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Thêm học sinh
              </button>
            )}

            {viewMode === 'scores' && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Nhập Excel
              </button>
            )}

            {viewMode === 'scores' && (
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Xuất Excel
              </button>
            )}

            {viewMode === 'scores' && (
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Áp dụng Template điểm
              </button>
            )}

            {viewMode === 'scores' && activeList && activeList.columns.length >= 2 && (
              <button
                type="button"
                onClick={() => setShowCopyColumnDialog(true)}
                disabled={actionLoading}
                className="btn btn-view"
                style={actionBtnStyle}
              >
                Copy cột
              </button>
            )}
          </div>

          {/* Students view */}
          {viewMode === 'students' && (
            <StudentListTable
              list={activeList}
              onAddColumn={handleAddColumn}
              onReorderColumns={handleReorderColumns}
              actionLoading={actionLoading}
              hideAddColumn
              visibleColumns={visibleColumns}
            />
          )}

          {/* Scores view (ScoreGrid) */}
          {viewMode === 'scores' && (
            <div
              style={{
                overflow: 'auto',
                maxHeight: '70vh',
                maxWidth: '100%',
                border: '1px solid var(--edub-border)',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <ScoreGrid
                list={activeList}
                columnConfigs={columnConfigs}
                classificationRanges={classificationRanges}
                onScoreSaved={handleScoreSaved}
                onConfigSaved={handleConfigSaved}
                onClassificationRangesSaved={handleClassificationRangesSaved}
                onReorderColumns={handleReorderColumns}
                onDeleteEntry={handleDeleteEntry}
                onDeleteColumn={handleDeleteColumn}
                onRenameColumn={async (columnId, newName) => { await handleUpdateColumn(columnId, newName); }}
              />
            </div>
          )}

          {/* Attendance view */}
          {viewMode === 'attendance' && attendanceList && attendanceList.slots.length > 0 ? (
            <AttendanceTable
              attendanceList={attendanceList}
              actionLoading={actionLoading}
              onToggleSlotStatus={toggleSlotStatus}
              onAddSlot={() => {
                const newSlot: AttendanceSlot = {
                  id: crypto.randomUUID(),
                  date: new Date().toISOString().slice(0, 10),
                  label: `Buổi ${attendanceList.slots.length + 1}`,
                };
                addSlot(newSlot);
              }}
              onUpdateSlotDate={updateSlotDate}
              onRemoveSlot={removeSlot}
              absenceThreshold={absenceThreshold}
            />
          ) : viewMode === 'attendance' ? (
            <AttendanceConfigForm
              columns={activeList.columns}
              onGenerate={handleGenerateAttendance}
              actionLoading={actionLoading}
            />
          ) : null}

          {/* Excel import modal */}
          {showImportModal && (
            <ExcelImportModal
              listId={activeList.id}
              onSuccess={handleImportSuccess}
              onClose={() => setShowImportModal(false)}
            />
          )}

          {/* Score Template Picker */}
          <ScoreTemplatePicker
            open={showTemplatePicker}
            listId={activeList.id}
            onClose={() => setShowTemplatePicker(false)}
            onApplied={handleTemplateApplied}
          />

          {/* Copy Column Dialog */}
          {showCopyColumnDialog && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'var(--edub-surface, #fff)', padding: 24, borderRadius: 12, width: 'min(400px, calc(100% - 24px))', maxWidth: 500, maxHeight: 'calc(100dvh - 24px)', boxSizing: 'border-box', overflowY: 'auto', border: '1px solid var(--edub-border)' }}>
                <h3 style={{ margin: '0 0 16px' }}>Copy cột điểm</h3>
                <p style={{ fontSize: 13, color: 'var(--edub-text-secondary)', marginBottom: 16 }}>
                  Sao chép điểm từ cột nguồn sang cột đích. Có thể cộng thêm hệ số bonus.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Cột nguồn</label>
                  <select
                    value={copySourceColId ?? ''}
                    onChange={(e) => setCopySourceColId(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--edub-border)' }}
                  >
                    <option value="">-- Chọn cột nguồn --</option>
                    {activeList.columns.map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Cột đích</label>
                  <select
                    value={copyTargetColId ?? ''}
                    onChange={(e) => setCopyTargetColId(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--edub-border)' }}
                  >
                    <option value="">-- Chọn cột đích --</option>
                    {activeList.columns.filter((col) => col.id !== copySourceColId).map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Hệ số bonus (cộng thêm vào điểm nguồn)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={copyBonus}
                    onChange={(e) => setCopyBonus(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--edub-border)' }}
                    placeholder="0"
                  />
                </div>
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={copyCap}
                      onChange={(e) => setCopyCap(e.target.checked)}
                    />
                    <span style={{ fontWeight: 600 }}>Không cho vượt quá điểm tối đa</span>
                  </label>
                </div>
                {copyCap && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Điểm tối đa</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={copyMaxScore}
                      onChange={(e) => setCopyMaxScore(e.target.value)}
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--edub-border)' }}
                      placeholder="10"
                    />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-neutral" onClick={() => { setShowCopyColumnDialog(false); setCopySourceColId(null); setCopyTargetColId(null); setCopyBonus('0'); setCopyCap(true); setCopyMaxScore('10'); }}>Hủy</button>
                  <button
                    className="btn btn-update"
                    disabled={!copySourceColId || !copyTargetColId || actionLoading}
                    onClick={async () => {
                      if (!copySourceColId || !copyTargetColId || !activeList) return;
                      const sourceCol = activeList.columns.find((c) => c.id === copySourceColId);
                      const targetCol = activeList.columns.find((c) => c.id === copyTargetColId);
                      if (!sourceCol || !targetCol) return;
                      setActionLoading(true);
                      try {
                        const bonus = parseFloat(copyBonus) || 0;
                        const maxScore = parseFloat(copyMaxScore) || 10;
                        for (const entry of activeList.entries) {
                          const sourceValue = entry.data[sourceCol.name] ?? '';
                          if (!sourceValue.trim()) continue;
                          // Normalize comma decimal separator to dot for parsing
                          const normalizedSource = sourceValue.replace(',', '.');
                          const numValue = parseFloat(normalizedSource);
                          let newValue: string;
                          if (!isNaN(numValue)) {
                            let result = numValue + bonus;
                            if (copyCap) result = Math.min(maxScore, result);
                            result = Math.max(0, result);
                            // Preserve decimal precision: use the source's decimal places or bonus's
                            const sourceDecimals = (normalizedSource.split('.')[1] || '').length;
                            const bonusDecimals = (copyBonus.replace(',', '.').split('.')[1] || '').length;
                            const decimals = Math.max(sourceDecimals, bonusDecimals);
                            newValue = result.toFixed(decimals);
                          } else {
                            newValue = sourceValue;
                          }
                          await studentListService.updateEntry(entry.id, { data: { ...entry.data, [targetCol.name]: newValue } });
                        }
                        setShowCopyColumnDialog(false);
                        setCopySourceColId(null);
                        setCopyTargetColId(null);
                        setCopyBonus('0');
                        setCopyCap(true);
                        setCopyMaxScore('10');
                        await loadLists();
                      } catch (err) {
                        setError(extractError(err));
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                  >
                    {actionLoading ? 'Đang copy...' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {lists.length === 0 && !creatingList && (
        <p style={{ color: 'var(--edub-text-secondary)' }}>Chưa có danh sách học sinh nào. Nhấn "+ Thêm danh sách" để tạo mới.</p>
      )}

      <ConfirmDialog
        open={confirmDeleteAttendanceOpen}
        title="Xoá danh sách điểm danh"
        message={`Xoá danh sách điểm danh ${attendanceList?.name ?? `Điểm danh lớp ${classId}`}? Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        onConfirm={handleConfirmDeleteAttendance}
        onCancel={() => setConfirmDeleteAttendanceOpen(false)}
      />

      {/* Selective clone dialog */}
      {activeList && (
        <SelectiveCloneDialog
          open={showSelectiveCloneDialog}
          columns={activeList.columns}
          defaultName={`${activeList.name} (bản sao)`}
          cloning={cloning}
          onConfirm={handleSelectiveClone}
          onClose={() => setShowSelectiveCloneDialog(false)}
        />
      )}
    </div>
  );
}

function resolveStudentName(list: StudentList, entry: StudentList['entries'][number]): string {
  const preferredKeys = ['Họ tên', 'Họ và tên', 'Tên', 'Name', 'Full name'];
  for (const key of preferredKeys) {
    const value = entry.data[key];
    if (value?.trim()) return value.trim();
  }

  const firstMeaningfulValue = Object.values(entry.data).find((value) => value.trim());
  if (firstMeaningfulValue) return firstMeaningfulValue.trim();

  return `${list.name} - Học sinh ${entry.id}`;
}
