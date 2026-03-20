import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { LessonDetail, DocumentResponse, AddDocumentRequest, MiniGameSummaryResponse } from '../../types/lessonPlan';
import type { StorageItem } from '../../types/storage';
import type { ApiError } from '../../types/common';
import * as lessonService from '../../services/lessonService';
import * as miniGameService from '../../services/miniGameService';
import * as storageService from '../../services/storageService';
import MiniGameCreateModal from './MiniGameCreateModal';
import QuizPlayModal from './QuizPlayModal';
import QuizViewModal from './QuizViewModal';

interface LessonDetailModalProps {
  lessonId: number;
  onClose: () => void;
}

interface DocumentFormState {
  mode: 'add' | 'edit';
  editId?: number;
  name: string;
  link: string;
  pageRange: string;
}

const INITIAL_DOC_FORM: DocumentFormState = { mode: 'add', name: '', link: '', pageRange: '' };

function extractError(err: unknown): string {
  const axiosErr = err as AxiosError<ApiError>;
  return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default function LessonDetailModal({ lessonId, onClose }: LessonDetailModalProps) {
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [docForm, setDocForm] = useState<DocumentFormState>(INITIAL_DOC_FORM);
  const [showDocForm, setShowDocForm] = useState(false);
  const [showStoragePicker, setShowStoragePicker] = useState(false);
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [selectedStorageItemId, setSelectedStorageItemId] = useState<number | null>(null);
  const [folderTrail, setFolderTrail] = useState<Array<{ id: number | null; name: string }>>([{ id: null, name: 'Kho lưu trữ' }]);
  const [showMiniGameCreate, setShowMiniGameCreate] = useState(false);
  const [playGameId, setPlayGameId] = useState<number | null>(null);
  const [viewGameId, setViewGameId] = useState<number | null>(null);
  const [deleteGameTarget, setDeleteGameTarget] = useState<MiniGameSummaryResponse | null>(null);

  useEffect(() => {
    loadLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function loadLesson() {
    setLoading(true);
    setError('');
    try {
      const data = await lessonService.getById(lessonId);
      setLesson(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  function openAddDocForm() {
    setDocForm(INITIAL_DOC_FORM);
    setShowDocForm(true);
  }

  function openEditDocForm(doc: DocumentResponse) {
    setDocForm({
      mode: 'edit',
      editId: doc.id,
      name: doc.name,
      link: doc.link,
      pageRange: doc.pageRange || '',
    });
    setShowDocForm(true);
  }

  function cancelDocForm() {
    setShowDocForm(false);
    setDocForm(INITIAL_DOC_FORM);
  }

  async function handleDocSubmit() {
    if (!docForm.name.trim() || !docForm.link.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      const payload: AddDocumentRequest = {
        name: docForm.name.trim(),
        link: docForm.link.trim(),
        pageRange: docForm.pageRange.trim() || undefined,
      };
      if (docForm.mode === 'add') {
        await lessonService.addDocument(lessonId, payload);
      } else if (docForm.editId != null) {
        await lessonService.updateDocument(docForm.editId, payload);
      }
      cancelDocForm();
      await loadLesson();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteDoc(docId: number) {
    setActionLoading(true);
    setError('');
    try {
      await lessonService.deleteDocument(docId);
      await loadLesson();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function loadStorageItems(folderId: number | null) {
    setStorageLoading(true);
    try {
      const data = await storageService.listItems(folderId);
      setStorageItems(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setStorageLoading(false);
    }
  }

  async function openStoragePicker() {
    setError('');
    setSelectedStorageItemId(null);
    setFolderTrail([{ id: null, name: 'Kho lưu trữ' }]);
    setShowStoragePicker(true);
    await loadStorageItems(null);
  }

  function closeStoragePicker() {
    setShowStoragePicker(false);
    setSelectedStorageItemId(null);
    setStorageItems([]);
  }

  async function enterFolder(folder: StorageItem) {
    setFolderTrail((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedStorageItemId(null);
    await loadStorageItems(folder.id);
  }

  async function navigateUpFolder() {
    if (folderTrail.length <= 1) return;
    const nextTrail = folderTrail.slice(0, -1);
    const parentFolderId = nextTrail[nextTrail.length - 1].id;
    setFolderTrail(nextTrail);
    setSelectedStorageItemId(null);
    await loadStorageItems(parentFolderId);
  }

  async function handleAddAttachmentFromStorage() {
    if (selectedStorageItemId == null) return;
    setActionLoading(true);
    setError('');
    try {
      await lessonService.addAttachmentFromStorage(lessonId, selectedStorageItemId);
      closeStoragePicker();
      await loadLesson();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    setActionLoading(true);
    setError('');
    try {
      await lessonService.deleteAttachment(attachmentId);
      await loadLesson();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteMiniGame() {
    if (!deleteGameTarget) return;
    setActionLoading(true);
    setError('');
    try {
      await miniGameService.deleteMiniGame(deleteGameTarget.id);
      setDeleteGameTarget(null);
      await loadLesson();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div style={overlayStyle} role="dialog" aria-label="Chi tiết bài học">
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>Chi tiết bài học</h2>
          <button type="button" onClick={onClose} style={{ cursor: 'pointer', padding: '4px 12px' }}>
            Đóng
          </button>
        </div>

        {error && (
          <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>Đang tải...</p>
        ) : lesson ? (
          <>
            <h3 style={{ marginBottom: 8 }}>{lesson.name}</h3>

            {/* Documents Section */}
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4>Tài liệu</h4>
                <button type="button" onClick={openAddDocForm} disabled={actionLoading} style={{ cursor: 'pointer', padding: '4px 12px' }}>
                  Thêm tài liệu
                </button>
              </div>

              {showDocForm && (
                <div style={{ border: '1px solid #ccc', padding: 12, borderRadius: 4, marginBottom: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <label htmlFor="doc-name" style={labelStyle}>Tên tài liệu</label>
                    <input
                      id="doc-name"
                      type="text"
                      placeholder="Nhập tên tài liệu"
                      value={docForm.name}
                      onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label htmlFor="doc-link" style={labelStyle}>Link tài liệu</label>
                    <input
                      id="doc-link"
                      type="text"
                      placeholder="Nhập link tài liệu"
                      value={docForm.link}
                      onChange={(e) => setDocForm((f) => ({ ...f, link: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label htmlFor="doc-page" style={labelStyle}>Trang</label>
                    <input
                      id="doc-page"
                      type="text"
                      placeholder="VD: 1-10"
                      value={docForm.pageRange}
                      onChange={(e) => setDocForm((f) => ({ ...f, pageRange: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={cancelDocForm} disabled={actionLoading} style={{ padding: '4px 12px', cursor: 'pointer' }}>
                      Hủy
                    </button>
                    <button type="button" onClick={handleDocSubmit} disabled={actionLoading} style={{ padding: '4px 12px', cursor: 'pointer' }}>
                      Lưu
                    </button>
                  </div>
                </div>
              )}

              {lesson.documents.length === 0 && !showDocForm ? (
                <p style={{ color: '#888', fontSize: 14 }}>Chưa có tài liệu nào</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Tên</th>
                      <th style={thStyle}>Liên kết</th>
                      <th style={thStyle}>Trang</th>
                      <th style={thStyle}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lesson.documents.map((doc) => (
                      <tr key={doc.id}>
                        <td style={tdStyle}>{doc.name}</td>
                        <td style={tdStyle}>
                          <a href={doc.link} target="_blank" rel="noopener noreferrer">{doc.link}</a>
                        </td>
                        <td style={tdStyle}>{doc.pageRange || '—'}</td>
                        <td style={tdStyle}>
                          <button type="button" onClick={() => openEditDocForm(doc)} disabled={actionLoading} style={{ marginRight: 4, cursor: 'pointer' }}>
                            Sửa
                          </button>
                          <button type="button" onClick={() => handleDeleteDoc(doc.id)} disabled={actionLoading} style={{ cursor: 'pointer', color: '#d32f2f' }}>
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Attachments Section */}
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4>Tệp đính kèm</h4>
                <button
                  type="button"
                  onClick={openStoragePicker}
                  disabled={actionLoading}
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                >
                  Chọn tệp từ kho
                </button>
              </div>

              {lesson.attachments.length === 0 ? (
                <p style={{ color: '#888', fontSize: 14 }}>Chưa có tệp đính kèm nào</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Tên tệp</th>
                      <th style={thStyle}>Kích thước</th>
                      <th style={thStyle}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lesson.attachments.map((att) => (
                      <tr key={att.id}>
                        <td style={tdStyle}>{att.fileName}</td>
                        <td style={tdStyle}>{formatFileSize(att.fileSize)}</td>
                        <td style={tdStyle}>
                          <button type="button" onClick={() => handleDeleteAttachment(att.id)} disabled={actionLoading} style={{ cursor: 'pointer', color: '#d32f2f' }}>
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Mini Games Section */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4>Mini game</h4>
                <button type="button" onClick={() => setShowMiniGameCreate(true)} disabled={actionLoading} style={{ cursor: 'pointer', padding: '4px 12px' }}>
                  Tạo mini game
                </button>
              </div>
              {lesson.miniGames.length === 0 ? (
                <p style={{ color: '#888', fontSize: 14 }}>Chưa có mini game nào</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Tên</th>
                      <th style={thStyle}>Loại</th>
                      <th style={thStyle}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lesson.miniGames.map((game) => (
                      <tr key={game.id}>
                        <td style={tdStyle}>{game.name}</td>
                        <td style={tdStyle}>{game.type}</td>
                        <td style={tdStyle}>
                          <button type="button" onClick={() => setPlayGameId(game.id)} disabled={actionLoading} style={{ marginRight: 4, cursor: 'pointer' }}>
                            Chơi
                          </button>
                          <button type="button" onClick={() => setViewGameId(game.id)} disabled={actionLoading} style={{ marginRight: 4, cursor: 'pointer' }}>
                            Xem
                          </button>
                          <button type="button" onClick={() => setDeleteGameTarget(game)} disabled={actionLoading} style={{ cursor: 'pointer', color: '#d32f2f' }}>
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        ) : null}
      </div>

      {/* Mini Game Create Modal */}
      {showMiniGameCreate && (
        <MiniGameCreateModal
          lessonId={lessonId}
          onClose={() => setShowMiniGameCreate(false)}
          onCreated={loadLesson}
        />
      )}

      {/* Quiz Play Modal */}
      {playGameId != null && (
        <QuizPlayModal
          miniGameId={playGameId}
          onClose={() => setPlayGameId(null)}
        />
      )}

      {/* Quiz View Modal */}
      {viewGameId != null && (
        <QuizViewModal
          miniGameId={viewGameId}
          onClose={() => setViewGameId(null)}
        />
      )}

      {/* Delete Mini Game Confirmation */}
      {deleteGameTarget && (
        <div style={{ ...overlayStyle, zIndex: 1100 }}>
          <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, minWidth: 400, maxWidth: 500 }}>
            <h2 style={{ marginBottom: 16 }}>Xác nhận xóa</h2>
            <p style={{ marginBottom: 16 }}>
              Bạn có chắc chắn muốn xóa mini game <strong>{deleteGameTarget.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeleteGameTarget(null)} disabled={actionLoading} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Hủy
              </button>
              <button type="button" onClick={handleDeleteMiniGame} disabled={actionLoading} style={{ padding: '8px 16px', cursor: 'pointer', color: '#d32f2f' }}>
                {actionLoading ? 'Đang xử lý...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStoragePicker && (
        <div style={{ ...overlayStyle, zIndex: 1100 }}>
          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, minWidth: 620, maxWidth: 760, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Chọn tệp từ kho lưu trữ</h3>
              <button type="button" onClick={closeStoragePicker} style={{ cursor: 'pointer', padding: '4px 12px' }}>
                Đóng
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ color: '#555', fontSize: 14 }}>
                {folderTrail.map((f) => f.name).join(' / ')}
              </div>
              <button
                type="button"
                onClick={navigateUpFolder}
                disabled={folderTrail.length <= 1 || storageLoading}
                style={{ cursor: folderTrail.length <= 1 ? 'not-allowed' : 'pointer', padding: '4px 10px' }}
              >
                Lên thư mục trên
              </button>
            </div>

            {storageLoading ? (
              <p>Đang tải kho lưu trữ...</p>
            ) : storageItems.length === 0 ? (
              <p style={{ color: '#888' }}>Thư mục này chưa có dữ liệu.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Chọn</th>
                    <th style={thStyle}>Tên</th>
                    <th style={thStyle}>Loại</th>
                    <th style={thStyle}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {storageItems.map((item) => {
                    const isFolder = item.itemType === 'Folder';
                    return (
                      <tr key={item.id}>
                        <td style={tdStyle}>
                          {isFolder ? (
                            '—'
                          ) : (
                            <input
                              type="radio"
                              name="storage-attachment"
                              checked={selectedStorageItemId === item.id}
                              onChange={() => setSelectedStorageItemId(item.id)}
                            />
                          )}
                        </td>
                        <td style={tdStyle}>{item.name}</td>
                        <td style={tdStyle}>{isFolder ? 'Thư mục' : 'Tệp'}</td>
                        <td style={tdStyle}>
                          {isFolder ? (
                            <button
                              type="button"
                              onClick={() => enterFolder(item)}
                              style={{ cursor: 'pointer', padding: '4px 8px' }}
                            >
                              Mở
                            </button>
                          ) : (
                            <span style={{ color: '#888' }}>Có thể chọn</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={closeStoragePicker} disabled={actionLoading} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddAttachmentFromStorage}
                disabled={actionLoading || selectedStorageItemId == null}
                style={{ padding: '8px 16px', cursor: selectedStorageItemId == null ? 'not-allowed' : 'pointer' }}
              >
                {actionLoading ? 'Đang thêm...' : 'Thêm vào bài học'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: 24,
  borderRadius: 8,
  minWidth: 600,
  maxWidth: 750,
  maxHeight: '85vh',
  overflowY: 'auto',
};

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: 8, boxSizing: 'border-box' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #ccc' };
const tdStyle: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #eee' };
