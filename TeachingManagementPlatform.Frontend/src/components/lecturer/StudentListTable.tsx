import { useState, useRef, useCallback, type FormEvent } from 'react';
import type { StudentList, StudentListColumn, StudentEntry } from '../../types/studentList';

interface Props {
  list: StudentList;
  onAddColumn: (name: string) => Promise<void>;
  onUpdateColumn: (columnId: number, name: string) => Promise<void>;
  onDeleteColumn: (columnId: number) => Promise<void>;
  onReorderColumns: (reorderedColumns: { id: number; sortOrder: number }[]) => Promise<void>;
  onAddEntry: (data: Record<string, string>) => Promise<void>;
  onUpdateEntry: (entryId: number, data: Record<string, string>) => Promise<void>;
  onDeleteEntry: (entryId: number) => Promise<void>;
  actionLoading: boolean;
  /** If true, hides the internal "Thêm cột" button (parent handles it) */
  hideAddColumn?: boolean;
}

export default function StudentListTable({
  list,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderColumns,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  actionLoading,
  hideAddColumn = false,
}: Props) {
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editColumnName, setEditColumnName] = useState('');

  const [addingEntry, setAddingEntry] = useState(false);
  const [newEntryData, setNewEntryData] = useState<Record<string, string>>({});
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editEntryData, setEditEntryData] = useState<Record<string, string>>({});

  // Drag-and-drop state for column reordering
  const [draggedColumnId, setDraggedColumnId] = useState<number | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<number | null>(null);
  const dragCounter = useRef(0);

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<Map<number, number>>(new Map());
  const resizingRef = useRef<{ columnId: number; startX: number; startWidth: number } | null>(null);

  const columns = [...list.columns].sort((a, b) => a.sortOrder - b.sortOrder);
  const entries = [...list.entries].sort((a, b) => a.sortOrder - b.sortOrder);

  // --- Column resize handlers ---
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest('th');
    const startWidth = th?.offsetWidth ?? 150;
    resizingRef.current = { columnId, startX: e.clientX, startWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(80, resizingRef.current.startWidth + diff);
      setColumnWidths((prev) => {
        const next = new Map(prev);
        next.set(resizingRef.current!.columnId, newWidth);
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

  // --- Column drag-and-drop handlers ---
  const handleDragStart = useCallback((e: React.DragEvent, columnId: number) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(columnId));
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, columnId: number) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverColumnId(columnId);
  }, []);

  const handleDragLeave = useCallback((_e: React.DragEvent) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverColumnId(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColumnId: number) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOverColumnId(null);
    setDraggedColumnId(null);

    if (draggedColumnId === null || draggedColumnId === targetColumnId) return;

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

  const handleDragEnd = useCallback(() => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    dragCounter.current = 0;
  }, []);

  // --- Column handlers ---
  async function handleAddColumn(e: FormEvent) {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    await onAddColumn(newColumnName.trim());
    setNewColumnName('');
    setAddingColumn(false);
  }

  function startEditColumn(col: StudentListColumn) {
    setEditingColumnId(col.id);
    setEditColumnName(col.name);
  }

  async function handleUpdateColumn(e: FormEvent) {
    e.preventDefault();
    if (editingColumnId === null || !editColumnName.trim()) return;
    await onUpdateColumn(editingColumnId, editColumnName.trim());
    setEditingColumnId(null);
    setEditColumnName('');
  }

  function cancelEditColumn() {
    setEditingColumnId(null);
    setEditColumnName('');
  }

  // --- Entry handlers ---
  function startAddEntry() {
    const data: Record<string, string> = {};
    columns.forEach((col) => { data[col.name] = ''; });
    setNewEntryData(data);
    setAddingEntry(true);
  }

  async function handleAddEntry(e: FormEvent) {
    e.preventDefault();
    await onAddEntry(newEntryData);
    setNewEntryData({});
    setAddingEntry(false);
  }

  function startEditEntry(entry: StudentEntry) {
    setEditingEntryId(entry.id);
    setEditEntryData({ ...entry.data });
  }

  async function handleUpdateEntry(e: FormEvent) {
    e.preventDefault();
    if (editingEntryId === null) return;
    await onUpdateEntry(editingEntryId, editEntryData);
    setEditingEntryId(null);
    setEditEntryData({});
  }

  function cancelEditEntry() {
    setEditingEntryId(null);
    setEditEntryData({});
  }

  return (
    <div>
      {/* Add column button (shown only if not hidden by parent) */}
      {!hideAddColumn && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          {addingColumn ? (
            <form onSubmit={handleAddColumn} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Tên cột"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                style={{ padding: 6 }}
                aria-label="Tên cột mới"
              />
              <button type="submit" disabled={actionLoading} className="btn btn-update" style={{ padding: '6px 12px' }}>
                Lưu
              </button>
              <button type="button" onClick={() => { setAddingColumn(false); setNewColumnName(''); }} className="btn btn-neutral" style={{ padding: '6px 12px' }}>
                Hủy
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setAddingColumn(true)} className="btn btn-add" style={{ padding: '6px 12px' }}>
              Thêm cột
            </button>
          )}
        </div>
      )}

      {/* Scrollable table container */}
      <div
        style={{
          overflow: 'auto',
          maxHeight: '70vh',
          maxWidth: '100%',
          border: '1px solid var(--edub-border)',
          borderRadius: 8,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: columns.length > 3 ? columns.length * 160 : undefined }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              <th style={{ ...thStyle, width: 50, minWidth: 50 }}>#</th>
              {columns.map((col) => {
                const width = columnWidths.get(col.id);
                return (
                  <th
                    key={col.id}
                    style={{
                      ...thStyle,
                      width: width ? `${width}px` : undefined,
                      minWidth: width ? `${width}px` : 100,
                      cursor: draggedColumnId ? 'grabbing' : 'grab',
                      opacity: draggedColumnId === col.id ? 0.5 : 1,
                      borderLeft: dragOverColumnId === col.id && draggedColumnId !== col.id
                        ? '3px solid #1976d2'
                        : undefined,
                      position: 'relative',
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, col.id)}
                    onDragEnter={(e) => handleDragEnter(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    onDragEnd={handleDragEnd}
                  >
                    {editingColumnId === col.id ? (
                      <form onSubmit={handleUpdateColumn} style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="text"
                          value={editColumnName}
                          onChange={(e) => setEditColumnName(e.target.value)}
                          style={{ padding: 4, width: 100 }}
                          aria-label="Sửa tên cột"
                        />
                        <button type="submit" disabled={actionLoading} className="btn btn-update" style={{ padding: '4px 8px' }}>Lưu</button>
                        <button type="button" onClick={cancelEditColumn} className="btn btn-neutral" style={{ padding: '4px 8px' }}>Hủy</button>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ cursor: 'grab' }} title="Kéo để di chuyển cột">⠿</span>
                        <span>{col.name}</span>
                        <button
                          type="button"
                          onClick={() => startEditColumn(col)}
                          disabled={actionLoading}
                          className="btn btn-update"
                          style={{ fontSize: 11, padding: '2px 4px' }}
                          title="Sửa cột"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteColumn(col.id)}
                          disabled={actionLoading}
                          className="btn btn-delete"
                          style={{ fontSize: 11, padding: '2px 4px' }}
                          title="Xóa cột"
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, col.id)}
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
              <th style={{ ...thStyle, minWidth: 120 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.id}>
                <td style={{ ...tdStyle, width: 50 }}>{idx + 1}</td>
                {columns.map((col) => {
                  const width = columnWidths.get(col.id);
                  return (
                    <td key={col.id} style={{ ...tdStyle, width: width ? `${width}px` : undefined, minWidth: width ? `${width}px` : undefined }}>
                      {editingEntryId === entry.id ? (
                        <input
                          type="text"
                          value={editEntryData[col.name] ?? ''}
                          onChange={(e) => setEditEntryData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                          style={{ padding: 4, width: '100%', boxSizing: 'border-box' }}
                          aria-label={`Sửa ${col.name}`}
                        />
                      ) : (
                        entry.data[col.name] ?? ''
                      )}
                    </td>
                  );
                })}
                <td style={tdStyle}>
                  {editingEntryId === entry.id ? (
                    <form onSubmit={handleUpdateEntry} style={{ display: 'flex', gap: 4 }}>
                      <button type="submit" disabled={actionLoading} className="btn btn-update" style={{ padding: '4px 8px' }}>Lưu</button>
                      <button type="button" onClick={cancelEditEntry} className="btn btn-neutral" style={{ padding: '4px 8px' }}>Hủy</button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={() => startEditEntry(entry)} disabled={actionLoading} className="btn btn-update">
                        Sửa
                      </button>
                      <button type="button" onClick={() => onDeleteEntry(entry.id)} disabled={actionLoading} className="btn btn-delete">
                        Xóa
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {/* Add entry row */}
            {addingEntry && (
              <tr>
                <td style={tdStyle}>—</td>
                {columns.map((col) => (
                  <td key={col.id} style={tdStyle}>
                    <input
                      type="text"
                      value={newEntryData[col.name] ?? ''}
                      onChange={(e) => setNewEntryData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                      style={{ padding: 4, width: '100%', boxSizing: 'border-box' }}
                      aria-label={`Nhập ${col.name}`}
                    />
                  </td>
                ))}
                <td style={tdStyle}>
                  <form onSubmit={handleAddEntry} style={{ display: 'flex', gap: 4 }}>
                    <button type="submit" disabled={actionLoading} className="btn btn-update" style={{ padding: '4px 8px' }}>Lưu</button>
                    <button type="button" onClick={() => { setAddingEntry(false); setNewEntryData({}); }} className="btn btn-neutral" style={{ padding: '4px 8px' }}>Hủy</button>
                  </form>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add entry button */}
      {!addingEntry && (
        <button
          type="button"
          onClick={startAddEntry}
          disabled={actionLoading || columns.length === 0}
          className="btn btn-add"
          style={{ marginTop: 12, padding: '6px 12px' }}
        >
          Thêm học sinh
        </button>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid #ccc',
  borderRight: '1px solid var(--edub-border)',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  background: '#fff0c4',
  zIndex: 1,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #eee',
  borderRight: '1px solid var(--edub-border)',
};
