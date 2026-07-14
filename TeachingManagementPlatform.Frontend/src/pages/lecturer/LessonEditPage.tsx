
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import * as lessonService from '../../services/lessonService';
import * as storageService from '../../services/storageService';
import ConfirmModal from '../../components/common/ConfirmModal';
import * as quizService from '../../services/quizService';
import * as crosswordService from '../../services/crosswordService';
import type { LessonDetail, DocumentResponse, AddDocumentRequest, AttachmentResponse } from '../../types/lessonPlan';
import type { StorageItem } from '../../types/storage';
import type { QuizListItem } from '../../services/quizService';
import CrudIcon from '../../components/common/CrudIcon';

interface CrosswordListItem {
  id: number;
  title: string;
  status: string;
  slug: string;
}

export default function LessonEditPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const lessonId = Number(idParam);
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Document form
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState<{ mode: 'add' | 'edit'; editId?: number; link: string; note: string }>({ mode: 'add', link: '', note: '' });

  // Storage picker (FR-08: multi-select)
  const [showStoragePicker, setShowStoragePicker] = useState(false);
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [selectedStorageItemIds, setSelectedStorageItemIds] = useState<number[]>([]);
  const [folderTrail, setFolderTrail] = useState<Array<{ id: number | null; name: string }>>([{ id: null, name: 'Kho lưu trữ' }]);

  // Game picker (FR-05: unified modal with tabs, multi-select)
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [gamePickerTab, setGamePickerTab] = useState<'crossword' | 'quiz'>('crossword');
  const [quizList, setQuizList] = useState<QuizListItem[]>([]);
  const [crosswordList, setCrosswordList] = useState<CrosswordListItem[]>([]);
  const [gameListLoading, setGameListLoading] = useState(false);
  const [gameSearch, setGameSearch] = useState('');
  const [selectedGameIds, setSelectedGameIds] = useState<{ type: 'quiz' | 'crossword'; id: number; slug: string; title: string }[]>([]);

  // Editing name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  useEffect(() => {
    if (!lessonId || isNaN(lessonId)) { setError('ID không hợp lệ.'); setLoading(false); return; }
    loadLesson();
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLesson() {
    setLoading(true); setError('');
    try {
      const data = await lessonService.getById(lessonId);
      setLesson(data);
      setNameValue(data.name);
    } catch { setError('Không thể tải bài học.'); }
    finally { setLoading(false); }
  }

  // ── Name editing ──
  async function handleSaveName() {
    if (!nameValue.trim()) return;
    setActionLoading(true);
    try {
      await lessonService.updateName(lessonId, nameValue.trim());
      setEditingName(false);
      await loadLesson();
    } catch (err: any) { setError(err?.message || 'Lỗi.'); }
    finally { setActionLoading(false); }
  }

  // ── Delete lesson ──
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  async function handleDeleteThisLesson() {
    setConfirmDeleteOpen(false);
    setActionLoading(true);
    try {
      await lessonService.deleteLesson(lessonId);
      navigate(-1);
    } catch (err: any) { setError(err?.message || 'Xóa bài học thất bại.'); }
    finally { setActionLoading(false); }
  }

  // ── Documents ──
  function openAddDoc() { setDocForm({ mode: 'add', link: '', note: '' }); setShowDocForm(true); }
  function openEditDoc(doc: DocumentResponse) {
    const noteValue = (doc.name && doc.name !== doc.link) ? doc.name : '';
    setDocForm({ mode: 'edit', editId: doc.id, link: doc.link, note: noteValue });
    setShowDocForm(true);
  }

  async function handleDocSubmit() {
    if (!docForm.link.trim()) return;
    setActionLoading(true); setError('');
    try {
      const payload: AddDocumentRequest = { name: docForm.note.trim() || docForm.link.trim(), link: docForm.link.trim(), pageRange: undefined };
      if (docForm.mode === 'add') await lessonService.addDocument(lessonId, payload);
      else if (docForm.editId != null) await lessonService.updateDocument(docForm.editId, payload);
      setShowDocForm(false); await loadLesson();
    } catch (err: any) { setError(err?.message || 'Lỗi.'); }
    finally { setActionLoading(false); }
  }

  async function handleDeleteDoc(docId: number) {
    setActionLoading(true);
    try { await lessonService.deleteDocument(docId); await loadLesson(); }
    catch (err: any) { setError(err?.message || 'Lỗi.'); }
    finally { setActionLoading(false); }
  }

  // ── Attachments ──
  async function handleDeleteAttachment(attId: number) {
    setActionLoading(true);
    try { await lessonService.deleteAttachment(attId); await loadLesson(); }
    catch (err: any) { setError(err?.message || 'Lỗi.'); }
    finally { setActionLoading(false); }
  }

  function handleOpenAttachment(att: AttachmentResponse) {
    lessonService.openAttachmentInViewer(att.id, att.fileName, att.fileUrl);
  }

  // ── Storage picker (FR-08: multi-select, preserve across folders) ──
  async function openStoragePicker() {
    setSelectedStorageItemIds([]);
    setFolderTrail([{ id: null, name: 'Kho lưu trữ' }]);
    setShowStoragePicker(true);
    setStorageLoading(true);
    try { setStorageItems(await storageService.listItems(null)); }
    catch { setError('Lỗi tải kho.'); }
    finally { setStorageLoading(false); }
  }

  async function enterFolder(folder: StorageItem) {
    setFolderTrail((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setStorageLoading(true);
    try { setStorageItems(await storageService.listItems(folder.id)); }
    catch { setError('Lỗi.'); }
    finally { setStorageLoading(false); }
  }

  async function navigateUpFolder() {
    if (folderTrail.length <= 1) return;
    const nextTrail = folderTrail.slice(0, -1);
    setFolderTrail(nextTrail);
    setStorageLoading(true);
    try { setStorageItems(await storageService.listItems(nextTrail[nextTrail.length - 1].id)); }
    catch { setError('Lỗi.'); }
    finally { setStorageLoading(false); }
  }

  function toggleStorageItem(itemId: number) {
    setSelectedStorageItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }

  async function handleAddFromStorage() {
    if (selectedStorageItemIds.length === 0) return;
    setActionLoading(true);
    try {
      for (const itemId of selectedStorageItemIds) {
        await lessonService.addAttachmentFromStorage(lessonId, itemId);
      }
      setShowStoragePicker(false);
      await loadLesson();
    } catch (err: any) { setError(err?.message || 'Lỗi.'); }
    finally { setActionLoading(false); }
  }

  // ── Game picker (FR-05: unified modal, tabs, multi-select) ──
  async function openGamePickerModal() {
    setShowGamePicker(true);
    setGamePickerTab('crossword');
    setGameSearch('');
    setSelectedGameIds([]);
    setGameListLoading(true);
    try {
      const [quizzes, crosswords] = await Promise.all([
        quizService.getQuizList(),
        crosswordService.getCrosswordList(),
      ]);
      setQuizList(quizzes.filter((q) => q.status === 'published'));
      setCrosswordList(crosswords.filter((c: any) => c.status === 'published'));
    } catch { setError('Lỗi tải danh sách.'); }
    finally { setGameListLoading(false); }
  }

  function toggleGameSelection(type: 'quiz' | 'crossword', id: number, slug: string, title: string) {
    setSelectedGameIds((prev) => {
      const exists = prev.find((g) => g.type === type && g.id === id);
      if (exists) return prev.filter((g) => !(g.type === type && g.id === id));
      return [...prev, { type, id, slug, title }];
    });
  }

  function isGameSelected(type: 'quiz' | 'crossword', id: number) {
    return selectedGameIds.some((g) => g.type === type && g.id === id);
  }

  async function handleAttachSelectedGames() {
    if (selectedGameIds.length === 0) return;
    setActionLoading(true);
    const siteUrl = 'https://project-edub.netlify.app';
    try {
      for (const game of selectedGameIds) {
        const link = game.type === 'quiz' ? `${siteUrl}/quiz/${game.slug}` : `${siteUrl}/play/${game.slug}`;
        await lessonService.addDocument(lessonId, { name: `${game.type === 'quiz' ? '📝 Quiz' : '🧩 Crossword'}: ${game.title}`, link });
      }
      setShowGamePicker(false);
      await loadLesson();
    } catch (err: any) { setError(err?.message || 'Lỗi.'); }
    finally { setActionLoading(false); }
  }

  // ── FR-05: Helpers to detect game documents ──
  function isQuizDoc(doc: DocumentResponse): boolean {
    return doc.link.includes('/quiz/');
  }

  function isCrosswordDoc(doc: DocumentResponse): boolean {
    return doc.link.includes('/play/');
  }

  function isGameDoc(doc: DocumentResponse): boolean {
    return isQuizDoc(doc) || isCrosswordDoc(doc);
  }

  // ── Render ──
  if (loading) return <Box sx={{ ...pageStyle, p: { xs: 1.5, md: 3 } }}><p>Đang tải...</p></Box>;
  if (error && !lesson) return <Box sx={{ ...pageStyle, p: { xs: 1.5, md: 3 } }}><p style={{ color: '#d32f2f' }}>{error}</p><button className="btn btn-neutral" onClick={() => navigate(-1)} style={{ minHeight: 44 }}>← Quay lại</button></Box>;
  if (!lesson) return null;

  // FR-05: Separate game documents from regular documents
  const regularDocuments = lesson.documents.filter((doc) => !isGameDoc(doc));
  const crosswordDocs = lesson.documents.filter((doc) => isCrosswordDoc(doc));
  const quizDocs = lesson.documents.filter((doc) => isQuizDoc(doc));

  // FR-05: Filter game lists by search
  const filteredQuizList = quizList.filter((q) => q.title.toLowerCase().includes(gameSearch.toLowerCase()));
  const filteredCrosswordList = crosswordList.filter((c) => c.title.toLowerCase().includes(gameSearch.toLowerCase()));

  return (
    <Box sx={{ ...pageStyle, p: { xs: 1.5, md: 3 } }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button type="button" className="btn btn-neutral" onClick={() => navigate(-1)}>← Quay lại</button>
        <CrudIcon name="delete" tooltip="Xóa bài học" onClick={() => setConfirmDeleteOpen(true)} disabled={actionLoading} size={24} />
      </div>

      {error && <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}

      {/* Lesson name */}
      <div style={{ marginBottom: 24 }}>
        {editingName ? (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: { xs: 'stretch', sm: 'center' } }}>
            <input type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)} style={inputStyle} />
            <button className="btn btn-update" onClick={handleSaveName} disabled={actionLoading}>Lưu</button>
            <button className="btn btn-neutral" onClick={() => { setEditingName(false); setNameValue(lesson.name); }}>Hủy</button>
          </Box>
        ) : (
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            {lesson.name}
            <button className="btn btn-view" style={{ fontSize: 13, padding: '4px 10px' }} onClick={() => setEditingName(true)}>Sửa tên</button>
          </h1>
        )}
      </div>

      {/* Documents (regular only, excluding game docs) */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3>Đường dẫn tham khảo</h3>
          <button className="btn btn-add" style={{ padding: '6px 12px' }} onClick={openAddDoc} disabled={actionLoading}>+ Thêm đường dẫn</button>
        </div>
        {showDocForm && docForm.mode === 'add' && (
          <div style={formBoxStyle}>
            <input placeholder="https://..." value={docForm.link} onChange={(e) => setDocForm((f) => ({ ...f, link: e.target.value }))} style={inputStyle} />
            <input placeholder="Ghi chú về đường dẫn (tùy chọn)" value={docForm.note} onChange={(e) => setDocForm((f) => ({ ...f, note: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-neutral" onClick={() => setShowDocForm(false)} disabled={actionLoading}>Hủy</button>
              <button className="btn btn-update" onClick={handleDocSubmit} disabled={actionLoading}>Lưu</button>
            </div>
          </div>
        )}
        {regularDocuments.length === 0 && !showDocForm && <p style={emptyStyle}>Chưa có đường dẫn nào</p>}
        {regularDocuments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {regularDocuments.map((doc) => (
              docForm.mode === 'edit' && docForm.editId === doc.id && showDocForm ? (
                <div key={doc.id} style={{ ...itemRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <input placeholder="https://..." value={docForm.link} onChange={(e) => setDocForm((f) => ({ ...f, link: e.target.value }))} style={inputStyle} />
                  <input placeholder="Ghi chú về đường dẫn (tùy chọn)" value={docForm.note} onChange={(e) => setDocForm((f) => ({ ...f, note: e.target.value }))} style={inputStyle} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-neutral" style={{ padding: '4px 10px' }} onClick={() => setShowDocForm(false)} disabled={actionLoading}>Hủy</button>
                    <button className="btn btn-update" style={{ padding: '4px 10px' }} onClick={handleDocSubmit} disabled={actionLoading}>Lưu</button>
                  </div>
                </div>
              ) : (
                <div key={doc.id} style={itemRowStyle}>
                  <div>
                    <a href={doc.link} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>{doc.link.length > 60 ? doc.link.slice(0, 60) + '…' : doc.link}</a>
                    {doc.name && doc.name !== doc.link && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--edub-text-secondary)' }}>{doc.name}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <CrudIcon name="edit" tooltip="Sửa" onClick={() => openEditDoc(doc)} disabled={actionLoading} />
                    <CrudIcon name="delete" tooltip="Xóa" onClick={() => handleDeleteDoc(doc.id)} disabled={actionLoading} />
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </section>

      {/* Attachments (FR-08: double-click to open, remove "Mở" button) */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3>Tệp đính kèm</h3>
          <button className="btn btn-add" style={{ padding: '6px 12px' }} onClick={openStoragePicker} disabled={actionLoading}>Chọn tệp từ kho</button>
        </div>
        {lesson.attachments.length === 0 && <p style={emptyStyle}>Chưa có tệp đính kèm nào</p>}
        {lesson.attachments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lesson.attachments.map((att) => (
              <div
                key={att.id}
                style={{ ...itemRowStyle, cursor: 'pointer' }}
                onClick={() => handleOpenAttachment(att)}
                title="Nhấn để mở tệp"
              >
                <span style={{ fontWeight: 600, color: '#1565c0' }}>
                  {att.fileName}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <CrudIcon name="delete" tooltip="Xóa" onClick={() => handleDeleteAttachment(att.id)} disabled={actionLoading} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FR-05: Trò chơi section (two columns) */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3>Trò chơi</h3>
          <button className="btn btn-add" style={{ padding: '6px 12px' }} onClick={openGamePickerModal} disabled={actionLoading}>🎮 Thêm trò chơi</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left column: Crosswords */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--edub-text-secondary)' }}>Ô chữ</h4>
            {crosswordDocs.length === 0 && <p style={emptyStyle}>Chưa có ô chữ nào</p>}
            {crosswordDocs.map((doc) => (
              <div key={doc.id} style={{ ...itemRowStyle, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{doc.name}</span>
                <button className="btn btn-delete" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => handleDeleteDoc(doc.id)} disabled={actionLoading}>Xóa</button>
              </div>
            ))}
          </div>
          {/* Right column: Quizzes */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--edub-text-secondary)' }}>Câu hỏi trắc nghiệm</h4>
            {quizDocs.length === 0 && <p style={emptyStyle}>Chưa có câu hỏi trắc nghiệm nào</p>}
            {quizDocs.map((doc) => (
              <div key={doc.id} style={{ ...itemRowStyle, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{doc.name}</span>
                <button className="btn btn-delete" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => handleDeleteDoc(doc.id)} disabled={actionLoading}>Xóa</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FR-08: Storage picker modal (multi-select with checkboxes) */}
      {showStoragePicker && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Chọn tệp từ kho</h3>
              <button className="btn btn-neutral" onClick={() => setShowStoragePicker(false)}>Đóng</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--edub-text-secondary)' }}>{folderTrail.map((f) => f.name).join(' / ')}</span>
              <button className="btn btn-view" style={{ padding: '4px 8px' }} onClick={navigateUpFolder} disabled={folderTrail.length <= 1}>Lên</button>
            </div>
            {storageLoading ? <p>Đang tải...</p> : storageItems.length === 0 ? <p>Thư mục trống.</p> : (
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {storageItems.map((item) => (
                  <div key={item.id} style={{ ...itemRowStyle, padding: '6px 8px' }}>
                    <span>{item.itemType === 'Folder' ? '📁' : '📄'} {item.name}</span>
                    {item.itemType === 'Folder' ? (
                      <button className="btn btn-view" style={{ padding: '2px 8px' }} onClick={() => enterFolder(item)}>Mở</button>
                    ) : (
                      <input
                        type="checkbox"
                        checked={selectedStorageItemIds.includes(item.id)}
                        onChange={() => toggleStorageItem(item.id)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--edub-text-secondary)' }}>Đã chọn: {selectedStorageItemIds.length} tệp</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-neutral" onClick={() => setShowStoragePicker(false)}>Hủy</button>
                <button className="btn btn-add" onClick={handleAddFromStorage} disabled={actionLoading || selectedStorageItemIds.length === 0}>Thêm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FR-05: Unified game picker modal with tabs */}
      {showGamePicker && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Thêm trò chơi</h3>
              <button className="btn btn-neutral" onClick={() => setShowGamePicker(false)}>Đóng</button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                className={gamePickerTab === 'crossword' ? 'btn btn-add' : 'btn btn-neutral'}
                style={{ padding: '6px 16px' }}
                onClick={() => setGamePickerTab('crossword')}
              >
                Ô chữ
              </button>
              <button
                className={gamePickerTab === 'quiz' ? 'btn btn-add' : 'btn btn-neutral'}
                style={{ padding: '6px 16px' }}
                onClick={() => setGamePickerTab('quiz')}
              >
                Câu hỏi trắc nghiệm
              </button>
            </div>
            {/* Search */}
            <input
              placeholder="Tìm kiếm theo tên..."
              value={gameSearch}
              onChange={(e) => setGameSearch(e.target.value)}
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            {gameListLoading ? <p>Đang tải...</p> : (
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {gamePickerTab === 'quiz' && filteredQuizList.length === 0 && <p style={emptyStyle}>Không tìm thấy quiz nào.</p>}
                {gamePickerTab === 'crossword' && filteredCrosswordList.length === 0 && <p style={emptyStyle}>Không tìm thấy ô chữ nào.</p>}
                {gamePickerTab === 'quiz' && filteredQuizList.map((q) => (
                  <div key={q.id} style={{ ...itemRowStyle, padding: '8px', marginBottom: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isGameSelected('quiz', q.id)}
                        onChange={() => toggleGameSelection('quiz', q.id, q.slug, q.title)}
                      />
                      <span style={{ fontWeight: 600 }}>{q.title}</span>
                    </label>
                  </div>
                ))}
                {gamePickerTab === 'crossword' && filteredCrosswordList.map((c) => (
                  <div key={c.id} style={{ ...itemRowStyle, padding: '8px', marginBottom: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isGameSelected('crossword', c.id)}
                        onChange={() => toggleGameSelection('crossword', c.id, c.slug, c.title)}
                      />
                      <span style={{ fontWeight: 600 }}>{c.title}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--edub-text-secondary)' }}>Đã chọn: {selectedGameIds.length} trò chơi</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-neutral" onClick={() => setShowGamePicker(false)}>Hủy</button>
                <button className="btn btn-add" onClick={handleAttachSelectedGames} disabled={actionLoading || selectedGameIds.length === 0}>Thêm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Xóa bài học"
        message="Bạn có chắc chắn muốn xóa bài học này? Tất cả đường dẫn, tệp đính kèm và mini game sẽ bị xóa."
        confirmLabel="Xóa"
        onConfirm={handleDeleteThisLesson}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 900, margin: '0 auto' };
const sectionStyle: React.CSSProperties = { marginBottom: 24, padding: 16, borderRadius: 12, border: '1px solid var(--edub-border)', background: 'var(--edub-surface)' };
const sectionHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 };
const formBoxStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px solid #ccc', borderRadius: 8, marginBottom: 12 };
const inputStyle: React.CSSProperties = { width: '100%', padding: 8, boxSizing: 'border-box', borderRadius: 6, border: '1px solid var(--edub-border)' };
const emptyStyle: React.CSSProperties = { color: 'var(--edub-text-secondary)', fontSize: 14 };
const itemRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, border: '1px solid #eee' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--edub-surface)',
  padding: 24,
  borderRadius: 12,
  // Preserve the 500px desktop picker while keeping it within narrow viewports.
  width: 'min(500px, calc(100% - 24px))',
  maxWidth: 650,
  maxHeight: 'calc(100dvh - 24px)',
  boxSizing: 'border-box',
  overflowY: 'auto',
  border: '1px solid var(--edub-border)',
};
