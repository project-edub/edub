
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as lessonService from '../../services/lessonService';
import * as storageService from '../../services/storageService';
import * as quizService from '../../services/quizService';
import * as crosswordService from '../../services/crosswordService';
import type { LessonDetail, DocumentResponse, AddDocumentRequest, AttachmentResponse } from '../../types/lessonPlan';
import type { StorageItem } from '../../types/storage';
import type { QuizListItem } from '../../services/quizService';

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
  const [docForm, setDocForm] = useState<{ mode: 'add' | 'edit'; editId?: number; name: string; link: string; pageRange: string }>({ mode: 'add', name: '', link: '', pageRange: '' });

  // Storage picker
  const [showStoragePicker, setShowStoragePicker] = useState(false);
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [selectedStorageItemId, setSelectedStorageItemId] = useState<number | null>(null);
  const [folderTrail, setFolderTrail] = useState<Array<{ id: number | null; name: string }>>([{ id: null, name: 'Kho lưu trữ' }]);

  // Quiz/Crossword picker
  const [showGamePicker, setShowGamePicker] = useState<'quiz' | 'crossword' | null>(null);
  const [quizList, setQuizList] = useState<QuizListItem[]>([]);
  const [crosswordList, setCrosswordList] = useState<CrosswordListItem[]>([]);
  const [gameListLoading, setGameListLoading] = useState(false);

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

  // ── Documents ──
  function openAddDoc() { setDocForm({ mode: 'add', name: '', link: '', pageRange: '' }); setShowDocForm(true); }
  function openEditDoc(doc: DocumentResponse) { setDocForm({ mode: 'edit', editId: doc.id, name: doc.name, link: doc.link, pageRange: doc.pageRange || '' }); setShowDocForm(true); }

  async function handleDocSubmit() {
    if (!docForm.name.trim() || !docForm.link.trim()) return;
    setActionLoading(true); setError('');
    try {
      const payload: AddDocumentRequest = { name: docForm.name.trim(), link: docForm.link.trim(), pageRange: docForm.pageRange.trim() || undefined };
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

  // ── Storage picker ──
  async function openStoragePicker() {
    setSelectedStorageItemId(null);
    setFolderTrail([{ id: null, name: 'Kho lưu trữ' }]);
    setShowStoragePicker(true);
    setStorageLoading(true);
    try { setStorageItems(await storageService.listItems(null)); }
    catch { setError('Lỗi tải kho.'); }
    finally { setStorageLoading(false); }
  }

  async function enterFolder(folder: StorageItem) {
    setFolderTrail((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedStorageItemId(null);
    setStorageLoading(true);
    try { setStorageItems(await storageService.listItems(folder.id)); }
    catch { setError('Lỗi.'); }
    finally { setStorageLoading(false); }
  }

  async function navigateUpFolder() {
    if (folderTrail.length <= 1) return;
    const nextTrail = folderTrail.slice(0, -1);
    setFolderTrail(nextTrail);
    setSelectedStorageItemId(null);
    setStorageLoading(true);
    try { setStorageItems(await storageService.listItems(nextTrail[nextTrail.length - 1].id)); }
    catch { setError('Lỗi.'); }
    finally { setStorageLoading(false); }
  }

  async function handleAddFromStorage() {
    if (selectedStorageItemId == null) return;
    setActionLoading(true);
    try { await lessonService.addAttachmentFromStorage(lessonId, selectedStorageItemId); setShowStoragePicker(false); await loadLesson(); }
    catch (err: any) { setError(err?.message || 'Lỗi.'); }
    finally { setActionLoading(false); }
  }

  // ── Game picker (quiz/crossword) ──
  async function openGamePicker(type: 'quiz' | 'crossword') {
    setShowGamePicker(type);
    setGameListLoading(true);
    try {
      if (type === 'quiz') {
        const list = await quizService.getQuizList();
        setQuizList(list.filter((q) => q.status === 'published'));
      } else {
        const list = await crosswordService.getCrosswordList();
        setCrosswordList(list.filter((c: any) => c.status === 'published'));
      }
    } catch { setError('Lỗi tải danh sách.'); }
    finally { setGameListLoading(false); }
  }

  async function handleAttachGame(type: 'quiz' | 'crossword', slug: string, title: string) {
    // Attach as a document link pointing to the game player URL
    const siteUrl = 'https://project-edub.netlify.app';
    const link = type === 'quiz' ? `${siteUrl}/quiz/${slug}` : `${siteUrl}/play/${slug}`;
    setActionLoading(true);
    try {
      await lessonService.addDocument(lessonId, { name: `${type === 'quiz' ? '📝 Quiz' : '🧩 Crossword'}: ${title}`, link });
      setShowGamePicker(null);
      await loadLesson();
    } catch (err: any) { setError(err?.message || 'Lỗi.'); }
    finally { setActionLoading(false); }
  }

  // ── Render ──
  if (loading) return <div style={pageStyle}><p>Đang tải...</p></div>;
  if (error && !lesson) return <div style={pageStyle}><p style={{ color: '#d32f2f' }}>{error}</p><button className="btn btn-neutral" onClick={() => navigate(-1)}>← Quay lại</button></div>;
  if (!lesson) return null;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button type="button" className="btn btn-neutral" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>

      {error && <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}

      {/* Lesson name */}
      <div style={{ marginBottom: 24 }}>
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)} style={inputStyle} />
            <button className="btn btn-update" onClick={handleSaveName} disabled={actionLoading}>Lưu</button>
            <button className="btn btn-neutral" onClick={() => { setEditingName(false); setNameValue(lesson.name); }}>Hủy</button>
          </div>
        ) : (
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            {lesson.name}
            <button className="btn btn-view" style={{ fontSize: 13, padding: '4px 10px' }} onClick={() => setEditingName(true)}>Sửa tên</button>
          </h1>
        )}
      </div>

      {/* Documents */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3>Tài liệu</h3>
          <button className="btn btn-add" style={{ padding: '6px 12px' }} onClick={openAddDoc} disabled={actionLoading}>+ Thêm tài liệu</button>
        </div>
        {showDocForm && (
          <div style={formBoxStyle}>
            <input placeholder="Tên tài liệu" value={docForm.name} onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
            <input placeholder="Link tài liệu" value={docForm.link} onChange={(e) => setDocForm((f) => ({ ...f, link: e.target.value }))} style={inputStyle} />
            <input placeholder="Trang (VD: 1-10)" value={docForm.pageRange} onChange={(e) => setDocForm((f) => ({ ...f, pageRange: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-neutral" onClick={() => setShowDocForm(false)} disabled={actionLoading}>Hủy</button>
              <button className="btn btn-update" onClick={handleDocSubmit} disabled={actionLoading}>Lưu</button>
            </div>
          </div>
        )}
        {lesson.documents.length === 0 && !showDocForm && <p style={emptyStyle}>Chưa có tài liệu nào</p>}
        {lesson.documents.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lesson.documents.map((doc) => (
              <div key={doc.id} style={itemRowStyle}>
                <div>
                  <a href={doc.link} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>{doc.name}</a>
                  {doc.pageRange && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--edub-text-secondary)' }}>Trang: {doc.pageRange}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-update" style={{ padding: '4px 8px' }} onClick={() => openEditDoc(doc)} disabled={actionLoading}>Sửa</button>
                  <button className="btn btn-delete" style={{ padding: '4px 8px' }} onClick={() => handleDeleteDoc(doc.id)} disabled={actionLoading}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Attachments */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3>Tệp đính kèm</h3>
          <button className="btn btn-add" style={{ padding: '6px 12px' }} onClick={openStoragePicker} disabled={actionLoading}>Chọn tệp từ kho</button>
        </div>
        {lesson.attachments.length === 0 && <p style={emptyStyle}>Chưa có tệp đính kèm nào</p>}
        {lesson.attachments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lesson.attachments.map((att) => (
              <div key={att.id} style={itemRowStyle}>
                <span
                  style={{ fontWeight: 600, cursor: 'pointer', color: '#1565c0', textDecoration: 'underline' }}
                  onClick={() => handleOpenAttachment(att)}
                  title="Nhấn để mở tệp"
                >
                  {att.fileName}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-view" style={{ padding: '4px 8px' }} onClick={() => handleOpenAttachment(att)}>Mở</button>
                  <button className="btn btn-delete" style={{ padding: '4px 8px' }} onClick={() => handleDeleteAttachment(att.id)} disabled={actionLoading}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quiz & Crossword */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3>Quiz & Crossword</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-add" style={{ padding: '6px 12px' }} onClick={() => openGamePicker('quiz')} disabled={actionLoading}>📝 Gắn Quiz</button>
            <button className="btn btn-add" style={{ padding: '6px 12px' }} onClick={() => openGamePicker('crossword')} disabled={actionLoading}>🧩 Gắn Crossword</button>
          </div>
        </div>
        <p style={{ ...emptyStyle, marginTop: 0 }}>
          Các quiz/crossword đã gắn sẽ hiện trong mục Tài liệu ở trên.
        </p>
      </section>

      {/* Storage picker modal */}
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
                      <input type="radio" name="storage-pick" checked={selectedStorageItemId === item.id} onChange={() => setSelectedStorageItemId(item.id)} />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn btn-neutral" onClick={() => setShowStoragePicker(false)}>Hủy</button>
              <button className="btn btn-add" onClick={handleAddFromStorage} disabled={actionLoading || selectedStorageItemId == null}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Game picker modal */}
      {showGamePicker && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{showGamePicker === 'quiz' ? 'Chọn Quiz' : 'Chọn Crossword'}</h3>
              <button className="btn btn-neutral" onClick={() => setShowGamePicker(null)}>Đóng</button>
            </div>
            {gameListLoading ? <p>Đang tải...</p> : (
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {showGamePicker === 'quiz' && quizList.length === 0 && <p style={emptyStyle}>Chưa có quiz đã xuất bản nào.</p>}
                {showGamePicker === 'crossword' && crosswordList.length === 0 && <p style={emptyStyle}>Chưa có crossword đã xuất bản nào.</p>}
                {showGamePicker === 'quiz' && quizList.map((q) => (
                  <div key={q.id} style={{ ...itemRowStyle, padding: '8px' }}>
                    <span style={{ fontWeight: 600 }}>{q.title}</span>
                    <button className="btn btn-add" style={{ padding: '4px 10px' }} onClick={() => handleAttachGame('quiz', q.slug, q.title)} disabled={actionLoading}>Gắn</button>
                  </div>
                ))}
                {showGamePicker === 'crossword' && crosswordList.map((c) => (
                  <div key={c.id} style={{ ...itemRowStyle, padding: '8px' }}>
                    <span style={{ fontWeight: 600 }}>{c.title}</span>
                    <button className="btn btn-add" style={{ padding: '4px 10px' }} onClick={() => handleAttachGame('crossword', c.slug, c.title)} disabled={actionLoading}>Gắn</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: 24, maxWidth: 900, margin: '0 auto' };
const sectionStyle: React.CSSProperties = { marginBottom: 24, padding: 16, borderRadius: 12, border: '1px solid var(--edub-border)', background: 'var(--edub-surface)' };
const sectionHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 };
const formBoxStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px solid #ccc', borderRadius: 8, marginBottom: 12 };
const inputStyle: React.CSSProperties = { width: '100%', padding: 8, boxSizing: 'border-box', borderRadius: 6, border: '1px solid var(--edub-border)' };
const emptyStyle: React.CSSProperties = { color: 'var(--edub-text-secondary)', fontSize: 14 };
const itemRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, border: '1px solid #eee' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: 'var(--edub-surface)', padding: 24, borderRadius: 12, minWidth: 500, maxWidth: 650, maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--edub-border)' };
