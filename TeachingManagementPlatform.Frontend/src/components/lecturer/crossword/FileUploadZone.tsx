import { useCallback, useRef, useState } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ['.docx', '.xlsx', '.pptx', '.pdf'];
const ACCEPTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/pdf',
];
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'dragover' | 'uploading' | 'success' | 'error';

export interface FileUploadZoneProps {
  /** Max number of files allowed (from subscription). */
  maxFiles: number;
  /** Called when files are validated and ready. */
  onFilesChange: (files: File[]) => void;
  /** Upload progress 0–100, or null when not uploading. */
  uploadProgress: number | null;
  /** Error message from the upload attempt. */
  uploadError: string | null;
  /** Whether the upload has completed successfully. */
  uploadSuccess: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FileUploadZone({
  maxFiles,
  onFilesChange,
  uploadProgress,
  uploadError,
  uploadSuccess,
}: FileUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<'idle' | 'dragover'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<File[]>([]);

  // Keep ref in sync with state
  filesRef.current = files;

  const uploadState: UploadState = uploadSuccess
    ? 'success'
    : uploadError
      ? 'error'
      : uploadProgress !== null
        ? 'uploading'
        : dragState === 'dragover'
          ? 'dragover'
          : 'idle';

  function validateAndSetFiles(incoming: File[]): boolean {
    setValidationError(null);

    if (incoming.length === 0) return false;

    // Use ref to get current files (avoids stale closure)
    const currentFiles = filesRef.current;
    const merged = [...currentFiles, ...incoming];

    if (merged.length > maxFiles) {
      setValidationError(`Chỉ cho phép tối đa ${maxFiles} tệp. Hiện đã có ${currentFiles.length} tệp.`);
      return false;
    }

    for (const file of incoming) {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setValidationError(
          `Định dạng không hỗ trợ: ${file.name}. Chỉ chấp nhận ${ACCEPTED_EXTENSIONS.join(', ')}.`,
        );
        return false;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setValidationError(
          `Tệp quá lớn: ${file.name}. Tối đa ${MAX_FILE_SIZE_MB} MB mỗi tệp.`,
        );
        return false;
      }
    }

    setFiles(merged);
    onFilesChange(merged);
    return true;
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState('dragover');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState('idle');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragState('idle');
      const dropped = Array.from(e.dataTransfer.files);
      validateAndSetFiles(dropped);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maxFiles, onFilesChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      validateAndSetFiles(selected);
      // Reset input so the same file can be re-selected after removal
      e.target.value = '';
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maxFiles, onFilesChange],
  );

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange(updated);
    setValidationError(null);
  }

  const isUploading = uploadProgress !== null && !uploadSuccess && !uploadError;

  const dropZoneBorder =
    dragState === 'dragover'
      ? '2px dashed #1976d2'
      : uploadState === 'error'
        ? '2px dashed #d32f2f'
        : uploadState === 'success'
          ? '2px dashed #2e7d32'
          : '2px dashed #cbd5e1';

  const dropZoneBg =
    dragState === 'dragover'
      ? 'rgba(25,118,210,0.06)'
      : uploadState === 'success'
        ? 'rgba(46,125,50,0.04)'
        : 'rgba(255,255,255,0.55)';

  return (
    <div>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Kéo thả tệp vào đây hoặc nhấn để chọn"
        style={{
          ...dropZoneStyle,
          border: dropZoneBorder,
          background: dropZoneBg,
          cursor: isUploading ? 'not-allowed' : 'pointer',
          opacity: isUploading ? 0.7 : 1,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(',')}
          multiple
          style={{ display: 'none' }}
          onChange={handleInputChange}
          disabled={isUploading}
        />

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {uploadState === 'success' ? '✅' : uploadState === 'error' ? '❌' : '📂'}
          </div>
          {uploadState === 'success' ? (
            <p style={{ margin: 0, color: '#2e7d32', fontWeight: 600 }}>
              Tải lên thành công!
            </p>
          ) : uploadState === 'error' ? (
            <p style={{ margin: 0, color: '#d32f2f', fontWeight: 600 }}>
              Tải lên thất bại. Nhấn để thử lại.
            </p>
          ) : dragState === 'dragover' ? (
            <p style={{ margin: 0, color: '#1976d2', fontWeight: 600 }}>
              Thả tệp vào đây
            </p>
          ) : (
            <>
              <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
                Kéo thả tệp vào đây hoặc{' '}
                <span style={{ color: '#1976d2', textDecoration: 'underline' }}>nhấn để chọn</span>
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Tối đa {maxFiles} tệp · Mỗi tệp &lt; {MAX_FILE_SIZE_MB} MB
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                {ACCEPTED_EXTENSIONS.join(', ')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isUploading && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: '#475569' }}>Đang tải lên...</span>
            <span style={{ fontSize: 13, color: '#475569' }}>{uploadProgress}%</span>
          </div>
          <div style={progressTrackStyle}>
            <div
              style={{
                ...progressBarStyle,
                width: `${uploadProgress}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <div role="alert" style={errorBannerStyle}>
          {validationError}
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div role="alert" style={errorBannerStyle}>
          {uploadError}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul style={fileListStyle}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} style={fileItemStyle}>
              <span style={fileIconStyle}>
                {getFileIcon(file.name)}
              </span>
              <span style={fileNameStyle}>{file.name}</span>
              <span style={fileSizeStyle}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                aria-label={`Xóa ${file.name}`}
                style={removeButtonStyle}
                onClick={() => removeFile(index)}
                disabled={isUploading}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return '📄';
    case 'docx': return '📝';
    case 'xlsx': return '📊';
    case 'pptx': return '📑';
    default: return '📎';
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const dropZoneStyle: React.CSSProperties = {
  padding: '32px 24px',
  borderRadius: 16,
  transition: 'border-color 0.2s, background 0.2s',
  userSelect: 'none',
};

const progressTrackStyle: React.CSSProperties = {
  height: 8,
  borderRadius: 4,
  backgroundColor: '#e2e8f0',
  overflow: 'hidden',
};

const progressBarStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 4,
  backgroundColor: '#1976d2',
  transition: 'width 0.3s ease',
};

const errorBannerStyle: React.CSSProperties = {
  marginTop: 10,
  padding: '10px 14px',
  borderRadius: 10,
  backgroundColor: '#fff1f2',
  border: '1px solid #fecdd3',
  color: '#9f1239',
  fontSize: 14,
};

const fileListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: '12px 0 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const fileItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 10,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const fileIconStyle: React.CSSProperties = {
  fontSize: 18,
  flexShrink: 0,
};

const fileNameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 14,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const fileSizeStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  flexShrink: 0,
};

const removeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#94a3b8',
  fontSize: 14,
  padding: '2px 4px',
  borderRadius: 4,
  flexShrink: 0,
  lineHeight: 1,
};
