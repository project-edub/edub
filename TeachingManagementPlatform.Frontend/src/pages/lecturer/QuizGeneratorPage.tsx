import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as quizService from '../../services/quizService';
import * as coinService from '../../services/coinService';
import type { CoinWalletResponse } from '../../types/coin';
import InlineHint from '../../components/common/InlineHint';

const ACCEPTED_EXTENSIONS = ['.docx', '.xlsx', '.pdf', '.pptx'];
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 20;

export default function QuizGeneratorPage() {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [title, setTitle] = useState('');
  const [titleWarning, setTitleWarning] = useState<string | null>(null);
  const [existingTitles, setExistingTitles] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('trung bình');
  const [language] = useState('vi');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<CoinWalletResponse>({ coinBalance: 0, freeEcoinBalance: 0, freeEcoinMax: 50 });

  useEffect(() => {
    void (async () => {
      try { const w = await coinService.getLecturerCoinWallet(); setWallet(w); } catch {}
    })();
    void (async () => {
      try {
        const list = await quizService.getQuizList();
        setExistingTitles(list.map((q) => q.title.toLowerCase().trim()));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (title.trim() && existingTitles.includes(title.toLowerCase().trim())) {
      setTitleWarning('Tên này đã tồn tại trong kho trắc nghiệm của bạn.');
    } else {
      setTitleWarning(null);
    }
  }, [title, existingTitles]);

  const estimatedCost = Math.max(1, questionCount);
  const totalBalance = (wallet.freeEcoinBalance ?? 0) + wallet.coinBalance;
  const hasEnoughCoin = totalBalance >= estimatedCost;

  const handleGenerate = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    if (!title.trim()) { setError('Vui lòng nhập tên cho bài trắc nghiệm.'); return; }
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      for (const f of selectedFiles) fd.append('files', f);
      fd.append('questionCount', String(questionCount));
      fd.append('title', title.trim());
      fd.append('topic', topic);
      fd.append('difficulty', difficulty);
      fd.append('language', language);
      if (prompt) fd.append('prompt', prompt);

      const result = await quizService.generateQuiz(fd);
      navigate(`/lecturer/quiz/${result.gameId}/edit`);
    } catch (err: any) {
      setError(err?.message || 'Tạo bài trắc nghiệm thất bại.');
    } finally {
      setLoading(false);
    }
  }, [selectedFiles, questionCount, title, topic, difficulty, language, prompt, navigate]);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-neutral" onClick={() => navigate('/lecturer/quiz-generator')}>
          ← Quay lại danh sách
        </button>
      </div>

      <h1 style={{ marginBottom: 8 }}>Tạo bài trắc nghiệm từ tài liệu</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Upload tài liệu, cấu hình và để AI tạo câu hỏi. Sau khi tạo xong bạn có thể chỉnh sửa và xuất bản.
      </p>

      {error && <div role="alert" style={alertStyle}>{error}</div>}

      {/* File upload */}
      <section style={cardStyle}>
        <h2 style={sectionTitle}>1. Tải lên tài liệu</h2>
        <label style={dropZoneStyle}>
          <input type="file" accept=".docx,.xlsx,.pdf,.pptx" multiple style={{ display: 'none' }}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > MAX_FILES) { setError(`Tối đa ${MAX_FILES} tệp.`); return; }
              for (const f of files) {
                const ext = '.' + f.name.split('.').pop()?.toLowerCase();
                if (!ACCEPTED_EXTENSIONS.includes(ext)) { setError(`Định dạng không hợp lệ: ${f.name}`); return; }
                if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setError(`Tệp quá lớn: ${f.name}`); return; }
              }
              setError(null); setSelectedFiles(files);
            }}
          />
          <span style={{ fontWeight: 600 }}>Kéo thả hoặc nhấn để chọn tệp</span>
          <br /><span style={{ color: '#64748b', fontSize: 13 }}>Tối đa {MAX_FILES} tệp · {ACCEPTED_EXTENSIONS.join(', ')}</span>
        </label>
        {selectedFiles.length > 0 && (
          <ul style={{ marginTop: 8 }}>
            {selectedFiles.map((f, i) => <li key={i} style={{ fontSize: 13 }}>{f.name} · {(f.size/1024/1024).toFixed(2)} MB</li>)}
          </ul>
        )}
      </section>

      {/* Config */}
      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={sectionTitle}>
          2. Cấu hình
          <InlineHint text="Chọn số lượng câu hỏi và độ khó mong muốn" />
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
          <label style={fieldStyle}>
            <span style={{ fontWeight: 600 }}>Tên quiz <span style={{ color: '#dc2626' }}>*</span></span>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="VD: Quiz Hóa học chương 3" />
            {titleWarning && <span style={{ color: '#d97706', fontSize: 13 }}>⚠️ {titleWarning}</span>}
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <label style={fieldStyle}>
            <span style={{ fontWeight: 600 }}>Số câu hỏi</span>
            <input type="number" min={1} max={30} value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span style={{ fontWeight: 600 }}>Chủ đề</span>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} style={inputStyle} placeholder="VD: Hóa học hữu cơ" />
          </label>
          <label style={fieldStyle}>
            <span style={{ fontWeight: 600 }}>Độ khó</span>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inputStyle}>
              <option value="dễ">Dễ</option>
              <option value="trung bình">Trung bình</option>
              <option value="khó">Khó</option>
            </select>
          </label>
        </div>
        <label style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={{ fontWeight: 600 }}>Prompt tùy chỉnh (tùy chọn)</span>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Mô tả yêu cầu thêm..." />
        </label>
      </section>

      {/* Action */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button type="button" className="btn btn-add" disabled={selectedFiles.length === 0 || !title.trim() || loading || !hasEnoughCoin} onClick={() => void handleGenerate()}>
          {loading ? 'Đang tạo...' : `Tạo quiz (${estimatedCost} ECoin)`}
        </button>
        <span style={{ color: '#64748b', fontSize: 13 }}>Miễn phí: {wallet.freeEcoinBalance ?? 0} · Trả phí: {wallet.coinBalance}</span>
        {!hasEnoughCoin && <span style={{ color: '#dc2626', fontSize: 13 }}>Không đủ ECoin</span>}
      </div>
    </div>
  );
}

const alertStyle: React.CSSProperties = { marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' };
const cardStyle: React.CSSProperties = { padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', backgroundColor: '#fff' };
const sectionTitle: React.CSSProperties = { margin: '0 0 12px', fontSize: 18 };
const dropZoneStyle: React.CSSProperties = { display: 'block', padding: 24, borderRadius: 12, border: '2px dashed #cbd5e1', textAlign: 'center', cursor: 'pointer' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', boxSizing: 'border-box' as const };
