
import { useState, useRef, useCallback, useMemo, type FormEvent } from 'react';
import type { StudentList } from '../../types/studentList';

interface Props {
  list: StudentList;
  onAddColumn: (name: string) => Promise<void>;
  onReorderColumns: (reorderedColumns: { id: number; sortOrder: number }[]) => Promise<void>;
  actionLoading: boolean;
  hideAddColumn?: boolean;
  visibleColumns?: Set<number>;
}

export default function StudentListTable({
  list,
  onAddColumn,
  onReorderColumns,
  actionLoading,
  hideAddColumn = false,
  visibleColumns,
}: Props) {
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Paging
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Drag-and-drop state
  const [draggedColumnId, setDraggedColumnId] = useState<number | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<number | null>(null);
  const dragCounter = useRef(0);

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<Map<number, number>>(new Map());

  const columns = useMemo(() =>
    [...list.columns]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((col) => !visibleColumns || visibleColumns.has(col.id)),
    [list.columns, visibleColumns]
  );
  const allEntries = useMemo(() => [...list.entries].sort((a, b) => a.sortOrder - b.sortOrder), [list.entries]);

  // Paging
  const totalPages = Math.max(1, Math.ceil(allEntries.length / pageSize));
  const entries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allEntries.slice(start, start + pageSize);
  }, [allEntries, currentPage, pageSize]);

  // Auto-size columns based on longest text on first render
  const autoWidths = useMemo(() => {
    const widths = new Map<number, number>();
    for (const col of columns) {
      let maxLen = col.name.length;
      for (const entry of allEntries) {
        const val = entry.data[col.name] ?? '';
        if (val.length > maxLen) maxLen = val.length;
      }
      // Estimate: ~8px per character + 24px padding, min 80, max 300
      widths.set(col.id, Math.min(300, Math.max(80, maxLen * 8 + 24)));
    }
    return widths;
  }, [columns, allEntries]);

  const getColWidth = (colId: number) => columnWidths.get(colId) ?? autoWidths.get(colId);

  // --- Column resize handlers (fixed: capture columnId in closure) ---
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
    if (dragCounter.current === 0) setDragOverColumnId(null);
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
    onReorderColumns(currentOrder.map((col, idx) => ({ id: col.id, sortOrder: idx })));
  }, [draggedColumnId, columns, onReorderColumns]);

  const handleDragEnd = useCallback(() => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    dragCounter.current = 0;
  }, []);

  async function handleAddColumn(e: FormEvent) {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    await onAddColumn(newColumnName.trim());
    setNewColumnName('');
    setAddingColumn(false);
  }

  return (
    <div>
      {!hideAddColumn && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          {addingColumn ? (
            <form onSubmit={handleAddColumn} style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Tên cột" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} style={{ padding: 6 }} aria-label="Tên cột mới" />
              <button type="submit" disabled={actionLoading} className="btn btn-update" style={{ padding: '6px 12px' }}>Lưu</button>
              <button type="button" onClick={() => { setAddingColumn(false); setNewColumnName(''); }} className="btn btn-neutral" style={{ padding: '6px 12px' }}>Hủy</button>
            </form>
          ) : (
            <button type="button" onClick={() => setAddingColumn(true)} className="btn btn-add" style={{ padding: '6px 12px' }}>Thêm cột</button>
          )}
        </div>
      )}

      <div style={{ overflow: 'auto', maxHeight: '65vh', maxWidth: '100%', border: '1px solid var(--edub-border)', borderRadius: 8 }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              <th style={{ ...thStyle, width: 50, minWidth: 50 }}>#</th>
              {columns.map((col) => {
                const width = getColWidth(col.id);
                return (
                  <th
                    key={col.id}
                    style={{
                      ...thStyle,
                      width: width ? `${width}px` : 120,
                      minWidth: 80,
                      cursor: draggedColumnId ? 'grabbing' : 'grab',
                      opacity: draggedColumnId === col.id ? 0.5 : 1,
                      borderLeft: dragOverColumnId === col.id && draggedColumnId !== col.id ? '3px solid #1976d2' : undefined,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ cursor: 'grab' }} title="Kéo để di chuyển cột">⠿</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.name}</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, col.id)}
                      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize', background: 'transparent' }}
                      title="Kéo để thay đổi kích thước cột"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.id}>
                <td style={{ ...tdStyle, width: 50 }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                {columns.map((col) => {
                  const width = getColWidth(col.id);
                  return (
                    <td key={col.id} style={{ ...tdStyle, width: width ? `${width}px` : undefined, maxWidth: width ? `${width}px` : 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.data[col.name] ?? ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paging */}
      {allEntries.length > pageSize && (
        <div style={pagingStyle}>
          <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} style={pagingBtnStyle}>‹ Trước</button>
          <span style={{ fontSize: 13 }}>Trang {currentPage} / {totalPages}</span>
          <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={pagingBtnStyle}>Sau ›</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
            <label style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Hiện:</label>
            <input type="number" min={10} max={50} value={pageSize} onChange={(e) => { setPageSize(Math.max(10, Math.min(50, Number(e.target.value) || 10))); setCurrentPage(1); }} style={{ width: 48, padding: '2px 4px', fontSize: 12, textAlign: 'center', borderRadius: 4, border: '1px solid var(--edub-border)' }} />
            <span style={{ fontSize: 12 }}>/trang</span>
          </div>
        </div>
      )}

      {allEntries.length === 0 && (
        <p style={{ color: 'var(--edub-text-secondary)', textAlign: 'center', padding: 24 }}>Chưa có học sinh nào trong danh sách.</p>
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

const pagingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  marginTop: 12,
  padding: '8px 12px',
  borderRadius: 8,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const pagingBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid var(--edub-border)',
  background: '#fff',
  cursor: 'pointer',
};
