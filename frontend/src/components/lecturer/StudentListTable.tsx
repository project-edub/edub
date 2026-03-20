import { useState, type FormEvent } from 'react';
import type { StudentList, StudentListColumn, StudentEntry } from '../../types/studentList';

interface Props {
  list: StudentList;
  onAddColumn: (name: string) => Promise<void>;
  onUpdateColumn: (columnId: number, name: string) => Promise<void>;
  onDeleteColumn: (columnId: number) => Promise<void>;
  onAddEntry: (data: Record<string, string>) => Promise<void>;
  onUpdateEntry: (entryId: number, data: Record<string, string>) => Promise<void>;
  onDeleteEntry: (entryId: number) => Promise<void>;
  actionLoading: boolean;
}

export default function StudentListTable({
  list,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  actionLoading,
}: Props) {
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editColumnName, setEditColumnName] = useState('');

  const [addingEntry, setAddingEntry] = useState(false);
  const [newEntryData, setNewEntryData] = useState<Record<string, string>>({});
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editEntryData, setEditEntryData] = useState<Record<string, string>>({});

  const columns = [...list.columns].sort((a, b) => a.sortOrder - b.sortOrder);
  const entries = [...list.entries].sort((a, b) => a.sortOrder - b.sortOrder);

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
      {/* Add column button */}
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

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>#</th>
            {columns.map((col) => (
              <th key={col.id} style={thStyle}>
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
              </th>
            ))}
            <th style={thStyle}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr key={entry.id}>
              <td style={tdStyle}>{idx + 1}</td>
              {columns.map((col) => (
                <td key={col.id} style={tdStyle}>
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
              ))}
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
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #eee',
};
