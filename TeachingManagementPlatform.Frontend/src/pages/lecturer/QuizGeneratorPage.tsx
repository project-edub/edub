import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateQuiz, createGoogleForm } from '../../services/quizService';
import type { QuizGenerationResponse } from '../../types/quiz';
import type { CoinWalletResponse } from '../../types/coin';
import * as coinService from '../../services/coinService';

const acceptedExtensions = ['.docx', '.xlsx', '.pdf', '.pptx'];
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 20; // per file
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuizGeneratorPage() {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('dễ');
  const [language] = useState('vi');
  const [teacherGoogleEmail, setTeacherGoogleEmail] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<QuizGenerationResponse | null>(null);
  const [error, setError] = useState<{ code?: string; message: string; details?: unknown } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [wallet, setWallet] = useState<CoinWalletResponse>({ coinBalance: 0 });
  const [walletLoaded, setWalletLoaded] = useState(false);

  const loadWallet = useCallback(async () => {
    try {
      const data = await coinService.getLecturerCoinWallet();
      setWallet(data);
    } catch {
      setWallet({ coinBalance: 0 });
    } finally {
      setWalletLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  function localizeErrorMessage(code?: string, fallback?: string) {
    if (!code) return fallback ?? 'Đã có lỗi xảy ra.';
    switch (code) {
      case 'VALIDATION_ERROR': return 'Yêu cầu không hợp lệ.';
      case 'TOO_MANY_QUESTIONS': return 'Số câu hỏi yêu cầu vượt quá giới hạn.';
      case 'INVALID_EXTENSION': return 'Định dạng tệp không được hỗ trợ.';
      case 'FILE_TOO_LARGE': return 'Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn.';
      case 'INPUT_TOO_LONG': return 'Nội dung tệp quá dài. Chọn phạm vi ngắn hơn.';
      case 'GOOGLE_FORMS_CONFIG': return 'Server chưa cấu hình Google Forms. Liên hệ admin.';
      case 'GOOGLE_FORMS_ERROR': return 'Lỗi khi tạo Google Form. Kiểm tra cấu hình server.';
      case 'AI_ERROR': return 'Lỗi từ dịch vụ AI. Vui lòng thử lại sau.';
      default: return fallback ?? 'Đã có lỗi xảy ra.';
    }
  }

  const fileName = selectedFiles.length ? `${selectedFiles.length} tệp đã chọn` : 'Chưa chọn tệp nào';
  const estimatedCoinCost = Math.max(1, questionCount);
  const hasEnoughCoin = !walletLoaded || wallet.coinBalance >= estimatedCoinCost;

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Quiz Generator</p>
          <h1 style={titleStyle}>Tạo câu hỏi trắc nghiệm từ tài liệu</h1>
          <p style={subtitleStyle}>
            Chọn tài liệu, mô tả yêu cầu, rồi chuyển sang bước xử lý AI và xuất Google Form ở checklist tiếp theo.
          </p>
        </div>
        <div style={heroActionsStyle}>
          <div style={coinCardStyle}>
            <span style={coinLabelStyle}>Số dư ECoin</span>
            <strong style={coinValueStyle}>{wallet.coinBalance.toLocaleString('vi-VN')}</strong>
            <span style={coinHintStyle}>Ước tính tạo quiz này: {estimatedCoinCost} ECoin</span>
          </div>
          <div style={heroButtonRowStyle}>
            <button type="button" className="btn btn-neutral" onClick={() => navigate('/lecturer/coin-packages')}>
              Mua ECoin
            </button>
            <button type="button" className="btn btn-neutral" onClick={() => navigate('/lecturer/storage')}>
              Quay lại kho tài liệu
            </button>
          </div>
        </div>
      </div>

      <div style={gridStyle}>
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>1. Tệp nguồn</h2>
          <label style={dropZoneStyle}>
            <input
              type="file"
              accept=".docx,.xlsx,.pdf,.pptx"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                // client-side validation: max count and max size per file and extension
                if (files.length > MAX_FILES) {
                  setError({ message: `Chỉ cho phép tối đa ${MAX_FILES} tệp` } as any);
                  setSelectedFiles([]);
                  return;
                }
                for (const f of files) {
                  const ext = '.' + f.name.split('.').pop()?.toLowerCase();
                  if (!acceptedExtensions.includes(ext)) {
                    setError({ message: `Định dạng không hợp lệ: ${f.name}` } as any);
                    setSelectedFiles([]);
                    return;
                  }
                  if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    setError({ message: `Tệp quá lớn: ${f.name}. Tối đa ${MAX_FILE_SIZE_MB} MB` } as any);
                    setSelectedFiles([]);
                    return;
                  }
                }
                setError(null);
                setSelectedFiles(files);
              }}
              style={{ display: 'none' }}
            />
            <strong style={{ display: 'block', marginBottom: 8 }}>Chọn tài liệu (tối đa {MAX_FILES} tệp, mỗi tệp &lt; {MAX_FILE_SIZE_MB}MB)</strong>
            <span style={{ color: 'var(--edub-text-secondary)' }}>{fileName}</span>
          </label>
          <p style={hintStyle}>Định dạng cho phép: {acceptedExtensions.join(', ')}</p>
          {selectedFiles.length > 0 && (
            <ul style={{ marginTop: 8 }}>
              {selectedFiles.map((f, i) => (
                <li key={i} style={{ fontSize: 13 }}>{f.name} · {(f.size / 1024 / 1024).toFixed(2)} MB</li>
              ))}
            </ul>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>2. Cấu hình câu hỏi</h2>
          <div style={fieldGridStyle}>
            <Field label="Số câu hỏi" helper="Tối đa 30 câu">
              <input type="number" min={1} max={30} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Chủ đề" helper="Ví dụ: Hàm số, Hóa học hữu cơ">
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle} placeholder="Nhập chủ đề" />
            </Field>
            <Field label="Mức độ khó" helper="Chọn một trong ba mức">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={inputStyle}>
                <option value="dễ">Dễ</option>
                <option value="trung bình">Trung bình</option>
                <option value="khó">Khó</option>
              </select>
            </Field>
            <Field label="Email Google của GV" helper="Dùng để share form sau khi tạo">
              <input type="email" value={teacherGoogleEmail} onChange={(e) => { setTeacherGoogleEmail(e.target.value); setFieldErrors(prev => ({ ...prev, teacherGoogleEmail: '' })); }} style={inputStyle} placeholder="teacher@gmail.com" />
              {fieldErrors.teacherGoogleEmail && <div style={{ color: '#b71c1c', marginTop: 6 }}>{fieldErrors.teacherGoogleEmail}</div>}
            </Field>
          </div>
        </section>
      </div>

      <section style={{ ...cardStyle, marginTop: 20 }}>
        <h2 style={sectionTitleStyle}>3. Prompt tùy chỉnh</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Mô tả cách ra đề, phạm vi kiến thức, yêu cầu độ khó..."
          style={textareaStyle}
        />
        <div style={actionRowStyle}>
            <button
            type="button"
            className="btn btn-add"
              disabled={selectedFiles.length === 0 || loading || !hasEnoughCoin}
            onClick={async () => {
              if (selectedFiles.length === 0) return;
              // inline validation
              const newFieldErrors: Record<string,string> = {};
              if (teacherGoogleEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(teacherGoogleEmail)) newFieldErrors.teacherGoogleEmail = 'Email Google không hợp lệ';
              if (questionCount < 1 || questionCount > 30) newFieldErrors.questionCount = 'Số câu hỏi không hợp lệ';
                if (walletLoaded && wallet.coinBalance < Math.max(1, questionCount)) newFieldErrors.coinBalance = 'Không đủ ECoin để tạo quiz';
              if (Object.keys(newFieldErrors).length) { setFieldErrors(newFieldErrors); return; }
              setFieldErrors({});
              setLoading(true);
              setPreview(null);
              try {
                const fd = new FormData();
                for (const f of selectedFiles) fd.append('files', f);
                fd.append('prompt', prompt);
                fd.append('questionCount', String(questionCount));
                fd.append('topic', topic);
                fd.append('difficulty', difficulty);
                fd.append('language', language);
                fd.append('teacherGoogleEmail', teacherGoogleEmail);
                const res = await generateQuiz(fd);
                setPreview(res);
                setError(null);
                await loadWallet();
              } catch (err) {
                console.error(err);
                if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
                  const code = 'code' in err && typeof err.code === 'string' ? err.code : undefined;
                  const details = 'details' in err ? err.details : undefined;
                  setError({ code, message: localizeErrorMessage(code, err.message), details });
                } else {
                  setError({ message: 'Lỗi khi gọi AI. Vui lòng thử lại.' });
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Đang tạo...' : 'Gọi AI để tạo câu hỏi'}
          </button>
          <button
            type="button"
            className="btn btn-update"
            disabled={!preview}
            onClick={async () => {
              if (!preview) return;
              try {
                const googleAccessToken = localStorage.getItem('googleAccessToken') ?? undefined;
                const payload = {
                  title: topic || 'Quiz',
                  questions: preview.questions,
                  ...(googleAccessToken ? { googleAccessToken } : {}),
                  ...(teacherGoogleEmail.trim() ? { teacherGoogleEmail: teacherGoogleEmail.trim() } : {}),
                };
                const res = await createGoogleForm(payload);
                setError(null);
                alert(`Form created: ${res.editUrl}`);
              } catch (err) {
                console.error(err);
                if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
                  const code = 'code' in err && typeof err.code === 'string' ? err.code : undefined;
                  const details = 'details' in err ? err.details : undefined;
                  setError({ code, message: localizeErrorMessage(code, err.message), details });
                } else {
                  setError({ message: 'Lỗi tạo Google Form. Kiểm tra cấu hình server.' });
                }
              }
            }}
          >
            Tạo Google Form
          </button>
        </div>
      </section>

      {error && (
        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2 style={sectionTitleStyle}>Lỗi</h2>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(255,235,238,0.8)', border: '1px solid #f44336', position: 'relative' }}>
            <button type="button" onClick={() => setError(null)} style={{ position: 'absolute', right: 8, top: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            <strong style={{ color: '#b71c1c' }}>{error.code ?? 'ERROR'}</strong>
            <div style={{ marginTop: 6 }}>{error.message}</div>
            {error.details != null && (
              <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2)}
              </pre>
            )}
          </div>
        </section>
      )}

      {fieldErrors.coinBalance && (
        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2 style={sectionTitleStyle}>ECoin</h2>
          <div style={{ color: '#b71c1c' }}>{fieldErrors.coinBalance}</div>
        </section>
      )}

      {preview && (
        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2 style={sectionTitleStyle}>Kết quả - Xem trước</h2>
          <div style={{ marginTop: 12 }}>
            {preview.questions.map((q, idx) => (
              <div key={idx} style={{ padding: 12, border: '1px solid var(--edub-border)', borderRadius: 8, marginBottom: 8 }}>
                <strong>{idx + 1}. {q.question}</strong>
                <ul style={{ marginTop: 6, paddingLeft: 0, listStyle: 'none' }}>
                  {q.options.map((o, i) => (
                    <li key={i} style={{ color: i === q.correctAnswerIndex ? 'var(--edub-primary)' : undefined, marginBottom: 4 }}>
                      <strong>{OPTION_LABELS[i] ?? String(i + 1)}.</strong> {o.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, helper, children }: { label: string; helper: string; children: React.ReactNode }) {
  return (
    <label style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
      <span style={fieldHelperStyle}>{helper}</span>
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  padding: 24,
  maxWidth: 1200,
  margin: '0 auto',
};

const heroStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 24,
  padding: 24,
  borderRadius: 20,
  background: 'linear-gradient(135deg, rgba(25,118,210,0.12), rgba(14,165,233,0.06))',
  border: '1px solid var(--edub-border)',
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontSize: 12,
  color: 'var(--edub-text-secondary)',
};

const titleStyle: React.CSSProperties = {
  margin: '8px 0 8px',
  color: 'var(--edub-text-primary)',
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: 'var(--edub-text-secondary)',
  maxWidth: 720,
  lineHeight: 1.6,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 20,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--edub-surface)',
  color: 'var(--edub-text-primary)',
  border: '1px solid var(--edub-border)',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 18,
};

const dropZoneStyle: React.CSSProperties = {
  display: 'block',
  padding: 24,
  borderRadius: 16,
  border: '1.5px dashed var(--edub-border)',
  background: 'rgba(255,255,255,0.55)',
  cursor: 'pointer',
};

const hintStyle: React.CSSProperties = {
  marginTop: 12,
  marginBottom: 0,
  color: 'var(--edub-text-secondary)',
  fontSize: 13,
};

const fieldGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const fieldLabelStyle: React.CSSProperties = {
  fontWeight: 600,
};

const fieldHelperStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--edub-text-secondary)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--edub-border)',
  backgroundColor: 'var(--edub-surface)',
  color: 'var(--edub-text-primary)',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 140,
  resize: 'vertical',
  marginBottom: 16,
  fontFamily: 'inherit',
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
};

const heroActionsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  alignItems: 'flex-end',
};

const heroButtonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const coinCardStyle: React.CSSProperties = {
  minWidth: 220,
  padding: 16,
  borderRadius: 16,
  backgroundColor: 'rgba(255,255,255,0.65)',
  border: '1px solid var(--edub-border)',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const coinLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--edub-text-secondary)',
};

const coinValueStyle: React.CSSProperties = {
  fontSize: 28,
  color: 'var(--edub-text-primary)',
};

const coinHintStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--edub-text-secondary)',
};

