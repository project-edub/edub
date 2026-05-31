import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { StudentList } from '../../types/studentList';
import type { AttendanceStudentSource } from '../../types/attendance';
import type { ApiError } from '../../types/common';
import * as studentListService from '../../services/studentListService';
import StudentListTable from './StudentListTable';
import ExcelImportModal from './ExcelImportModal';
import AttendanceTable from './AttendanceTable';
import AddSlotModal from './AddSlotModal';
import { useAttendanceStore } from '../../store/attendanceStore';
import { createAttendanceSlot } from '../../utils/attendanceHelpers';
import { exportAttendanceExcel } from '../../utils/exportAttendanceExcel';

interface Props {
  classId: number;
  className?: string;
}

type ViewMode = 'students' | 'attendance';

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
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [renamingAttendance, setRenamingAttendance] = useState(false);
  const [attendanceRenameValue, setAttendanceRenameValue] = useState('');

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

  useEffect(() => {
    loadLists();
  }, [loadLists]);

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
  const { attendanceList, addSlot, updateSlotDate, removeSlot, renameAttendanceList, resetAttendanceList, toggleSlotStatus, replaceAttendanceList } = useAttendanceStore(classId, attendanceStudents);
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

  async function handleClone(id: number) {
    setActionLoading(true);
    try {
      const cloned = await studentListService.clone(id);
      await loadLists();
      setActiveListId(cloned.id);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
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

  async function handleUpdateEntry(entryId: number, data: Record<string, string>) {
    setActionLoading(true);
    try {
      await studentListService.updateEntry(entryId, { data });
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

  function handleAddAttendanceSlot(data: { label: string; date: string }) {
    addSlot(createAttendanceSlot(data.label, data.date));
    setShowAddSlotModal(false);
  }

  function handleExportAttendance() {
    if (!attendanceList) return;
    exportAttendanceExcel(attendanceList, className);
  }

  function handleRenameAttendance() {
    if (!attendanceRenameValue.trim()) return;
    renameAttendanceList(attendanceRenameValue.trim());
    setRenamingAttendance(false);
  }

  function handleDeleteAttendance() {
    const confirmed = window.confirm('Xoá danh sách điểm danh hiện tại? Hành động này không thể hoàn tác.');
    if (!confirmed) return;
    resetAttendanceList();
    setRenamingAttendance(false);
    setAttendanceRenameValue('');
  }

  if (loading) {
    return <p>Đang tải danh sách học sinh...</p>;
  }

  return (
    <div>
      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>
      )}

      {/* Tab bar with student list tabs */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--edub-border)', marginBottom: 16, flexWrap: 'wrap', gap: 4 }}>
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => setActiveListId(list.id)}
            className={activeListId === list.id ? 'btn btn-view' : 'btn btn-neutral'}
            style={{
              padding: '8px 16px',
              border: '1px solid transparent',
              borderBottom: activeListId === list.id ? '3px solid #1565c0' : '3px solid transparent',
              fontWeight: activeListId === list.id ? 700 : 600,
              marginBottom: -2,
            }}
          >
            {list.name}
            {list.isMain && <span style={{ marginLeft: 6, fontSize: 11, color: activeListId === list.id ? 'rgba(255,255,255,0.85)' : 'var(--edub-text-secondary)' }}>(Danh sách chính)</span>}
          </button>
        ))}

        {/* Add list button / inline form */}
        {creatingList ? (
          <div style={{ display: 'flex', gap: 4, padding: '4px 0', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Tên danh sách"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              style={{ padding: 4 }}
              aria-label="Tên danh sách mới"
            />
            <button type="button" onClick={handleCreateList} disabled={actionLoading} className="btn btn-update" style={{ padding: '4px 8px' }}>
              Lưu
            </button>
            <button type="button" onClick={() => { setCreatingList(false); setNewListName(''); }} className="btn btn-neutral" style={{ padding: '4px 8px' }}>
              Hủy
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreatingList(true)}
            className="btn btn-add"
            style={{ padding: '8px 16px' }}
          >
            + Thêm danh sách
          </button>
        )}

        <button
          type="button"
          onClick={() => setViewMode('attendance')}
          disabled={!hasStudents}
          className="btn btn-add"
          style={{ padding: '8px 16px' }}
          title={!hasStudents ? 'Cần có học sinh trong danh sách để tạo điểm danh' : undefined}
        >
          Tạo Điểm Danh
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setViewMode('students')}
          className={viewMode === 'students' ? 'btn btn-view' : 'btn btn-neutral'}
          style={{ padding: '8px 16px' }}
        >
          Danh Sách Học Sinh
        </button>
        <button
          type="button"
          onClick={() => setViewMode('attendance')}
          disabled={!hasStudents}
          className={viewMode === 'attendance' ? 'btn btn-view' : 'btn btn-neutral'}
          style={{ padding: '8px 16px' }}
          title={!hasStudents ? 'Cần có học sinh trong danh sách để tạo điểm danh' : undefined}
        >
          Điểm Danh
        </button>
      </div>

      {/* Active list actions & content */}
      {activeList && (
        <div>
          {/* List action bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {viewMode === 'students' && renamingListId === activeList.id ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  style={{ padding: 4 }}
                  aria-label="Đổi tên danh sách"
                />
                <button type="button" onClick={handleRenameList} disabled={actionLoading} className="btn btn-update" style={{ padding: '4px 8px' }}>
                  Lưu
                </button>
                <button type="button" onClick={() => { setRenamingListId(null); setRenameValue(''); }} className="btn btn-neutral" style={{ padding: '4px 8px' }}>
                  Hủy
                </button>
              </div>
            ) : viewMode === 'students' ? (
              <button
                type="button"
                onClick={() => { setRenamingListId(activeList.id); setRenameValue(activeList.name); }}
                disabled={actionLoading}
                className="btn btn-update"
              >
                Sửa tên
              </button>
            ) : null}

            {viewMode === 'attendance' && attendanceList && (
              <>
                {renamingAttendance ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={attendanceRenameValue}
                      onChange={(e) => setAttendanceRenameValue(e.target.value)}
                      style={{ padding: 4 }}
                      aria-label="Đổi tên danh sách điểm danh"
                    />
                    <button type="button" onClick={handleRenameAttendance} disabled={actionLoading} className="btn btn-update" style={{ padding: '4px 8px' }}>
                      Lưu
                    </button>
                    <button type="button" onClick={() => { setRenamingAttendance(false); setAttendanceRenameValue(''); }} className="btn btn-neutral" style={{ padding: '4px 8px' }}>
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setRenamingAttendance(true); setAttendanceRenameValue(attendanceList.name ?? `Điểm danh lớp ${classId}`); }}
                    disabled={actionLoading}
                    className="btn btn-update"
                  >
                    Sửa tên
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDeleteAttendance}
                  disabled={actionLoading}
                  className="btn btn-delete"
                >
                  Xóa danh sách
                </button>
              </>
            )}

            {viewMode === 'students' && !activeList.isMain && (
              <button
                type="button"
                onClick={() => handleSetMain(activeList.id)}
                disabled={actionLoading}
                className="btn btn-view"
              >
                Đặt làm danh sách chính
              </button>
            )}

            {viewMode === 'students' && (
              <button
                type="button"
                onClick={() => handleClone(activeList.id)}
                disabled={actionLoading}
                className="btn btn-update"
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
              >
                Xóa danh sách
              </button>
            )}

            {viewMode === 'students' && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                disabled={actionLoading}
                className="btn btn-add"
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
              >
                Xuất Excel
              </button>
            )}
          </div>

          {viewMode === 'students' ? (
            <StudentListTable
              list={activeList}
              onAddColumn={handleAddColumn}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              onAddEntry={handleAddEntry}
              onUpdateEntry={handleUpdateEntry}
              onDeleteEntry={handleDeleteEntry}
              actionLoading={actionLoading}
            />
          ) : null}

          {viewMode === 'attendance' && attendanceList ? (
            <>
              <div style={{ marginBottom: 12, color: 'var(--edub-text-secondary)', fontSize: 13 }}>
                <strong style={{ color: 'var(--edub-text-primary)' }}>{attendanceList.name ?? `Điểm danh lớp ${classId}`}</strong>
                <span style={{ marginLeft: 8 }}>• {attendanceList.slots.length} slot</span>
                <span style={{ marginLeft: 8 }}>• {attendanceList.rows.length} học sinh</span>
              </div>
              <AttendanceTable
                attendanceList={attendanceList}
                actionLoading={actionLoading}
                onToggleSlotStatus={toggleSlotStatus}
                onAddSlot={() => setShowAddSlotModal(true)}
                onUpdateSlotDate={updateSlotDate}
                onRemoveSlot={removeSlot}
                onImportExcel={handleImportAttendanceFile}
                onExportExcel={handleExportAttendance}
                exportDisabled={!hasStudents}
              />
            </>
          ) : (
            viewMode === 'attendance' ? <p style={{ color: 'var(--edub-text-secondary)' }}>Chưa có dữ liệu điểm danh.</p> : null
          )}

          {/* Excel import modal */}
          {showImportModal && (
            <ExcelImportModal
              listId={activeList.id}
              onSuccess={handleImportSuccess}
              onClose={() => setShowImportModal(false)}
            />
          )}

          {showAddSlotModal && (
            <AddSlotModal
              open={showAddSlotModal}
              actionLoading={actionLoading}
              existingSlots={attendanceList?.slots ?? []}
              onClose={() => setShowAddSlotModal(false)}
              onConfirm={handleAddAttendanceSlot}
            />
          )}
        </div>
      )}

      {lists.length === 0 && !creatingList && (
        <p style={{ color: 'var(--edub-text-secondary)' }}>Chưa có danh sách học sinh nào. Nhấn "+ Thêm danh sách" để tạo mới.</p>
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
