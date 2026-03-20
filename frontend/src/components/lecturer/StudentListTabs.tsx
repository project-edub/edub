import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { StudentList } from '../../types/studentList';
import type { ApiError } from '../../types/common';
import * as studentListService from '../../services/studentListService';
import StudentListTable from './StudentListTable';
import ExcelImportModal from './ExcelImportModal';

interface Props {
  classId: number;
}

export default function StudentListTabs({ classId }: Props) {
  const [lists, setLists] = useState<StudentList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create list state
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Rename list state
  const [renamingListId, setRenamingListId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);

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

  if (loading) {
    return <p>Đang tải danh sách học sinh...</p>;
  }

  return (
    <div>
      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>
      )}

      {/* Tab bar with student list tabs */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #ccc', marginBottom: 16, flexWrap: 'wrap', gap: 4 }}>
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => setActiveListId(list.id)}
            className="btn btn-view"
            style={{
              padding: '8px 16px',
              borderBottom: activeListId === list.id ? '3px solid #007fff' : '3px solid transparent',
              background: activeListId === list.id ? '#f0f8ff' : 'none',
              fontWeight: activeListId === list.id ? 600 : 400,
              marginBottom: -2,
            }}
          >
            {list.name}
            {list.isMain && <span style={{ marginLeft: 6, fontSize: 11, color: '#388e3c' }}>(Danh sách chính)</span>}
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
      </div>

      {/* Active list actions & content */}
      {activeList && (
        <div>
          {/* List action bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {renamingListId === activeList.id ? (
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
            ) : (
              <button
                type="button"
                onClick={() => { setRenamingListId(activeList.id); setRenameValue(activeList.name); }}
                disabled={actionLoading}
                className="btn btn-update"
              >
                Sửa tên
              </button>
            )}

            {!activeList.isMain && (
              <button
                type="button"
                onClick={() => handleSetMain(activeList.id)}
                disabled={actionLoading}
                className="btn btn-view"
              >
                Đặt làm danh sách chính
              </button>
            )}

            <button
              type="button"
              onClick={() => handleClone(activeList.id)}
              disabled={actionLoading}
              className="btn btn-update"
            >
              Nhân bản
            </button>

            <button
              type="button"
              onClick={() => handleDeleteList(activeList.id)}
              disabled={actionLoading}
              className="btn btn-delete"
            >
              Xóa danh sách
            </button>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              disabled={actionLoading}
              className="btn btn-add"
            >
              Nhập Excel
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={actionLoading}
              className="btn btn-view"
            >
              Xuất Excel
            </button>
          </div>

          {/* Student list table */}
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

          {/* Excel import modal */}
          {showImportModal && (
            <ExcelImportModal
              listId={activeList.id}
              onSuccess={handleImportSuccess}
              onClose={() => setShowImportModal(false)}
            />
          )}
        </div>
      )}

      {lists.length === 0 && !creatingList && (
        <p style={{ color: '#666' }}>Chưa có danh sách học sinh nào. Nhấn "+ Thêm danh sách" để tạo mới.</p>
      )}
    </div>
  );
}
