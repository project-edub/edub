import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUploadZone from '../../components/lecturer/crossword/FileUploadZone';
import DocumentPreview from '../../components/lecturer/crossword/DocumentPreview';
import GameConfigForm from '../../components/lecturer/crossword/GameConfigForm';
import EcoinEstimator from '../../components/lecturer/crossword/EcoinEstimator';
import GenerateConfirmModal from '../../components/lecturer/crossword/GenerateConfirmModal';
import * as crosswordService from '../../services/crosswordService';
import * as coinService from '../../services/coinService';
import type { CrosswordFileExtractResult, GameConfig } from '../../types/crossword';

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Upload tài liệu', icon: '📂' },
  { label: 'Xem trước', icon: '👁️' },
  { label: 'Cấu hình', icon: '⚙️' },
] as const;

const STATUS_MESSAGES = [
  'Đang phân tích tài liệu...',
  'Đang tạo từ vựng...',
  'Đang xây dựng câu gợi ý...',
  'Đang hoàn thiện...',
];

const DEFAULT_CONFIG: GameConfig = {
  wordCount: 15,
  difficulty: 'medium',
  language: 'vi',
  clueStyle: 'definition',
  topic: '',
  excludeWords: [],
  gridSize: 15,
};

// Subscription defaults — in a real app these come from the user's subscription
const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_WORDS = 30;

// ── Component ─────────────────────────────────────────────────────────────────

export default function CrosswordCreatorPage() {
  const navigate = useNavigate();

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // ── Step 1: file upload ───────────────────────────────────────────────────
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [gameId, setGameId] = useState<number | null>(null);

  // ── Step 2: extracted texts ───────────────────────────────────────────────
  const [extractedTexts, setExtractedTexts] = useState<CrosswordFileExtractResult[]>([]);

  // ── Step 3: config ────────────────────────────────────────────────────────
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ── Fake progress for generation loading overlay ──────────────────────────
  const [fakeProgress, setFakeProgress] = useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const fakeProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusCycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── ECoin balance ─────────────────────────────────────────────────────────
  const [coinBalance, setCoinBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // ── Load wallet on mount ──────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const wallet = await coinService.getLecturerCoinWallet();
        setCoinBalance(wallet.coinBalance);
      } catch {
        setCoinBalance(0);
      } finally {
        setBalanceLoading(false);
      }
    })();
  }, []);

  // ── Fake progress animation ───────────────────────────────────────────────
  function startFakeProgress() {
    setFakeProgress(0);
    setStatusMessageIndex(0);

    fakeProgressRef.current = setInterval(() => {
      setFakeProgress((prev) => {
        if (prev >= 90) {
          if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
          return 90;
        }
        return prev + Math.random() * 8;
      });
    }, 600);

    statusCycleRef.current = setInterval(() => {
      setStatusMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2500);
  }

  function stopFakeProgress() {
    if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    if (statusCycleRef.current) clearInterval(statusCycleRef.current);
    setFakeProgress(100);
  }

  useEffect(() => {
    return () => {
      if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
      if (statusCycleRef.current) clearInterval(statusCycleRef.current);
    };
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────

  async function goToStep2() {
    if (selectedFiles.length === 0) return;

    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);

    try {
      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 85) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);

      const result = await crosswordService.uploadDocument(selectedFiles);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadSuccess(true);
      setGameId(result.gameId);
      setExtractedTexts(result.files);

      // Brief pause to show success state before advancing
      setTimeout(() => {
        setCurrentStep(2);
        setUploadProgress(null);
      }, 600);
    } catch (err: unknown) {
      setUploadProgress(null);
      setUploadSuccess(false);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Tải lên thất bại. Vui lòng thử lại.';
      setUploadError(message);
    }
  }

  function goToStep3() {
    setCurrentStep(3);
  }

  function goBack() {
    if (currentStep === 2) {
      setCurrentStep(1);
      setUploadSuccess(false);
      setUploadProgress(null);
      setUploadError(null);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  }

  // ── Generation ────────────────────────────────────────────────────────────

  const handleGenerateRequest = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const handleConfirmGenerate = useCallback(async () => {
    setShowConfirmModal(false);
    setIsGenerating(true);
    setGenerateError(null);
    startFakeProgress();

    try {
      const result = await crosswordService.generateCrossword({
        gameId: gameId ?? undefined,
        config,
      });

      stopFakeProgress();

      // Brief pause to show 100%
      await new Promise<void>((resolve) => setTimeout(resolve, 400));

      navigate(`/lecturer/crossword/${result.gameId}/edit`);
    } catch (err: unknown) {
      stopFakeProgress();
      setIsGenerating(false);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Tạo ô chữ thất bại. Vui lòng thử lại.';
      setGenerateError(message);
    }
  }, [config, gameId, navigate]);

  // ── Check if any extracted file has blocking quality ──────────────────────
  const hasBlockingFile = extractedTexts.some((f) => f.quality === 'empty');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Crossword Generator</p>
          <h1 style={titleStyle}>Tạo ô chữ từ tài liệu</h1>
          <p style={subtitleStyle}>
            Tải lên tài liệu, xem trước nội dung trích xuất, rồi cấu hình và để AI tạo ô chữ cho bạn.
          </p>
        </div>
        <div style={heroActionsStyle}>
          <button
            type="button"
            className="btn btn-neutral"
            onClick={() => navigate('/lecturer/crossword')}
          >
            ← Danh sách ô chữ
          </button>
          <button
            type="button"
            className="btn btn-neutral"
            onClick={() => navigate('/lecturer/coin-packages')}
          >
            Mua ECoin
          </button>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step content */}
      <div style={contentStyle}>
        {/* ── Step 1: Upload ── */}
        {currentStep === 1 && (
          <div style={stepPanelStyle}>
            <h2 style={stepTitleStyle}>
              {STEPS[0].icon} {STEPS[0].label}
            </h2>
            <p style={stepDescStyle}>
              Chọn tối đa {DEFAULT_MAX_FILES} tệp (.docx, .xlsx, .pptx, .pdf). Hệ thống sẽ trích xuất văn bản để tạo ô chữ.
            </p>

            <FileUploadZone
              maxFiles={DEFAULT_MAX_FILES}
              onFilesChange={setSelectedFiles}
              uploadProgress={uploadProgress}
              uploadError={uploadError}
              uploadSuccess={uploadSuccess}
            />

            <div style={stepActionsStyle}>
              <button
                type="button"
                className="btn btn-add"
                disabled={selectedFiles.length === 0 || uploadProgress !== null}
                onClick={() => void goToStep2()}
              >
                {uploadProgress !== null ? 'Đang tải lên...' : 'Tiếp theo →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {currentStep === 2 && (
          <div style={stepPanelStyle}>
            <h2 style={stepTitleStyle}>
              {STEPS[1].icon} {STEPS[1].label}
            </h2>
            <p style={stepDescStyle}>
              Kiểm tra nội dung trích xuất từ tài liệu. Tệp có chất lượng kém có thể ảnh hưởng đến kết quả.
            </p>

            <DocumentPreview files={extractedTexts} />

            {hasBlockingFile && (
              <div role="alert" style={blockingWarningStyle}>
                🚫 Một hoặc nhiều tệp không có nội dung. Vui lòng quay lại và thay thế tệp đó.
              </div>
            )}

            <div style={stepActionsStyle}>
              <button type="button" className="btn btn-neutral" onClick={goBack}>
                ← Quay lại
              </button>
              <button
                type="button"
                className="btn btn-add"
                disabled={hasBlockingFile}
                onClick={goToStep3}
              >
                Tiếp theo →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Config ── */}
        {currentStep === 3 && (
          <div style={step3LayoutStyle}>
            {/* Left: config form */}
            <div style={step3FormColStyle}>
              <div style={stepPanelStyle}>
                <h2 style={stepTitleStyle}>
                  {STEPS[2].icon} {STEPS[2].label}
                </h2>
                <p style={stepDescStyle}>
                  Tùy chỉnh cách AI tạo ô chữ. Số ECoin sẽ được tính theo cấu hình bên phải.
                </p>

                <GameConfigForm
                  config={config}
                  onChange={setConfig}
                  maxWordCount={DEFAULT_MAX_WORDS}
                  isPro={false}
                />

                {generateError && (
                  <div role="alert" style={errorBannerStyle}>
                    {generateError}
                  </div>
                )}

                <div style={stepActionsStyle}>
                  <button type="button" className="btn btn-neutral" onClick={goBack}>
                    ← Quay lại
                  </button>
                </div>
              </div>
            </div>

            {/* Right: ECoin estimator */}
            <div style={step3SidebarColStyle}>
              <EcoinEstimator
                config={config}
                coinBalance={coinBalance}
                balanceLoading={balanceLoading}
                onGenerate={handleGenerateRequest}
                isGenerating={isGenerating}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirmModal && (
        <GenerateConfirmModal
          config={config}
          coinBalance={coinBalance}
          onConfirm={() => void handleConfirmGenerate()}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* Full-screen loading overlay */}
      {isGenerating && (
        <GeneratingOverlay
          progress={fakeProgress}
          statusMessage={STATUS_MESSAGES[statusMessageIndex]}
        />
      )}
    </div>
  );
}

// ── StepIndicator ─────────────────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div style={stepIndicatorStyle} role="navigation" aria-label="Các bước tạo ô chữ">
      {STEPS.map((step, index) => {
        const stepNumber = (index + 1) as 1 | 2 | 3;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;

        return (
          <div key={stepNumber} style={stepItemWrapperStyle}>
            {/* Connector line */}
            {index > 0 && (
              <div
                style={{
                  ...connectorStyle,
                  backgroundColor: isCompleted ? '#1976d2' : '#e2e8f0',
                }}
              />
            )}

            <div style={stepItemStyle}>
              <div
                style={{
                  ...stepCircleStyle,
                  backgroundColor: isCompleted ? '#1976d2' : isActive ? '#e3f2fd' : '#f8fafc',
                  border: `2px solid ${isCompleted || isActive ? '#1976d2' : '#e2e8f0'}`,
                  color: isCompleted ? '#fff' : isActive ? '#1976d2' : '#94a3b8',
                }}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? '✓' : step.icon}
              </div>
              <span
                style={{
                  ...stepLabelStyle,
                  color: isActive ? '#1976d2' : isCompleted ? '#334155' : '#94a3b8',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── GeneratingOverlay ─────────────────────────────────────────────────────────

interface GeneratingOverlayProps {
  progress: number;
  statusMessage: string;
}

function GeneratingOverlay({ progress, statusMessage }: GeneratingOverlayProps) {
  return (
    <div style={overlayStyle} role="status" aria-live="polite" aria-label="Đang tạo ô chữ">
      <div style={overlayCardStyle}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🧩</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Đang tạo ô chữ...</h2>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
          {statusMessage}
        </p>
        <div style={overlayProgressTrackStyle}>
          <div
            style={{
              ...overlayProgressBarStyle,
              width: `${Math.min(100, progress)}%`,
            }}
          />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>
          {Math.round(Math.min(100, progress))}%
        </p>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  padding: 24,
  maxWidth: 1100,
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
  border: '1px solid #e2e8f0',
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontSize: 12,
  color: '#64748b',
};

const titleStyle: React.CSSProperties = {
  margin: '8px 0 8px',
  color: '#0f172a',
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#475569',
  maxWidth: 600,
  lineHeight: 1.6,
};

const heroActionsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'flex-end',
};

const stepIndicatorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
  marginBottom: 28,
  padding: '16px 24px',
  backgroundColor: '#fff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
};

const stepItemWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const connectorStyle: React.CSSProperties = {
  width: 60,
  height: 2,
  transition: 'background-color 0.3s',
};

const stepItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};

const stepCircleStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  transition: 'all 0.3s',
};

const stepLabelStyle: React.CSSProperties = {
  fontSize: 12,
  transition: 'color 0.3s',
  whiteSpace: 'nowrap',
};

const contentStyle: React.CSSProperties = {
  minHeight: 400,
};

const stepPanelStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: 28,
  boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
};

const stepTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 20,
};

const stepDescStyle: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#475569',
  fontSize: 14,
  lineHeight: 1.6,
};

const stepActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end',
  marginTop: 24,
  paddingTop: 20,
  borderTop: '1px solid #f1f5f9',
};

const step3LayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 300px',
  gap: 20,
  alignItems: 'start',
};

const step3FormColStyle: React.CSSProperties = {
  minWidth: 0,
};

const step3SidebarColStyle: React.CSSProperties = {
  position: 'sticky',
  top: 24,
};

const blockingWarningStyle: React.CSSProperties = {
  marginTop: 16,
  padding: '12px 16px',
  borderRadius: 12,
  backgroundColor: '#fef2f2',
  border: '1px solid #f87171',
  color: '#7f1d1d',
  fontSize: 14,
};

const errorBannerStyle: React.CSSProperties = {
  marginTop: 16,
  padding: '12px 16px',
  borderRadius: 12,
  backgroundColor: '#fff1f2',
  border: '1px solid #fecdd3',
  color: '#9f1239',
  fontSize: 14,
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15,23,42,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1300,
};

const overlayCardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 40,
  textAlign: 'center',
  minWidth: 320,
  maxWidth: 420,
  boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
};

const overlayProgressTrackStyle: React.CSSProperties = {
  height: 10,
  borderRadius: 5,
  backgroundColor: '#e2e8f0',
  overflow: 'hidden',
};

const overlayProgressBarStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 5,
  backgroundColor: '#1976d2',
  transition: 'width 0.5s ease',
};
