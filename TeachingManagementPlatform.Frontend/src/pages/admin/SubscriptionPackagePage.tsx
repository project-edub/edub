import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { AxiosError } from 'axios';
import type {
  SubscriptionPackage,
  CreateSubscriptionPackageRequest,
  UpdateSubscriptionPackageRequest,
} from '../../types/subscription';
import type { ApiError } from '../../types/common';
import * as subscriptionService from '../../services/subscriptionService';
import { formatCurrency } from '../../utils/formatters';

const BYTES_PER_GB = 1024 * 1024 * 1024;
const AVAILABLE_FEATURES = [
  {
    key: 'quiz_generator',
    label: 'Quiz Generator',
    description: 'Mở chức năng tạo câu hỏi từ tài liệu.',
  },
];

interface ModalState {
  type: 'create' | 'edit' | null;
  pkg?: SubscriptionPackage;
}

export default function SubscriptionPackagePage() {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPackage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('0');
  const [formStorageLimitGb, setFormStorageLimitGb] = useState('1');
  const [formMaxFiles, setFormMaxFiles] = useState('5');
  const [formMaxQuestions, setFormMaxQuestions] = useState('10');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formFeatures, setFormFeatures] = useState<string[]>(['quiz_generator']);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await subscriptionService.getAll();
      setPackages(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  function extractError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  function extractFieldErrors(err: unknown): Record<string, string> {
    const axiosErr = err as AxiosError<ApiError>;
    const details = axiosErr.response?.data?.error?.details;

    if (Array.isArray(details)) {
      const messages = details.filter((item): item is string => typeof item === 'string');
      return messages.length > 0 ? { _form: messages.join(' | ') } : {};
    }

    if (details && typeof details === 'object') {
      const errors: Record<string, string> = {};
      for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'string') {
          errors[key] = value;
        }
      }
      return errors;
    }

    return {};
  }

  function hasDefaultPackage(): boolean {
    return packages.some((pkg) => pkg.isDefault);
  }

  function resetForm(pkg?: SubscriptionPackage) {
    if (pkg) {
      setFormName(pkg.name);
      setFormPrice(String(pkg.price));
      setFormStorageLimitGb(formatGbValue(pkg.storageLimitBytes));
      setFormMaxFiles(String(pkg.maxFilesPerQuizGeneration));
      setFormMaxQuestions(String(pkg.maxQuestionsPerQuiz));
      setFormIsDefault(pkg.isDefault);
      setFormFeatures(pkg.unlockedFeatures.length > 0 ? pkg.unlockedFeatures : ['quiz_generator']);
    } else {
      setFormName('');
      setFormPrice('0');
      setFormStorageLimitGb('1');
      setFormMaxFiles('5');
      setFormMaxQuestions('10');
      setFormIsDefault(!hasDefaultPackage());
      setFormFeatures(['quiz_generator']);
    }
    setFormError('');
    setFieldErrors({});
  }

  function openCreateModal() {
    resetForm();
    setModal({ type: 'create' });
  }

  function openEditModal(pkg: SubscriptionPackage) {
    resetForm(pkg);
    setModal({ type: 'edit', pkg });
  }

  function closeModal() {
    setModal({ type: null });
    setFormError('');
    setFieldErrors({});
  }

  function toggleFeature(featureKey: string) {
    setFormFeatures((current) =>
      current.includes(featureKey)
        ? current.filter((item) => item !== featureKey)
        : [...current, featureKey],
    );
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formName.trim()) {
      errors.name = 'Tên gói không được để trống';
    }

    const price = Number(formPrice);
    if (formPrice.trim() === '' || Number.isNaN(price)) {
      errors.price = 'Giá phải là một số hợp lệ';
    } else if (price < 0) {
      errors.price = 'Giá không được âm';
    }

    const storageGb = Number(formStorageLimitGb);
    if (formStorageLimitGb.trim() === '' || Number.isNaN(storageGb)) {
      errors.storageLimitGb = 'Giới hạn lưu trữ phải là một số hợp lệ';
    } else if (storageGb <= 0) {
      errors.storageLimitGb = 'Giới hạn lưu trữ phải lớn hơn 0';
    }

    const maxFiles = Number(formMaxFiles);
    if (formMaxFiles.trim() === '' || Number.isNaN(maxFiles)) {
      errors.maxFilesPerQuizGeneration = 'Số file phải là một số hợp lệ';
    } else if (maxFiles <= 0) {
      errors.maxFilesPerQuizGeneration = 'Số file phải lớn hơn 0';
    }

    const maxQuestions = Number(formMaxQuestions);
    if (formMaxQuestions.trim() === '' || Number.isNaN(maxQuestions)) {
      errors.maxQuestionsPerQuiz = 'Số câu hỏi phải là một số hợp lệ';
    } else if (maxQuestions <= 0) {
      errors.maxQuestionsPerQuiz = 'Số câu hỏi phải lớn hơn 0';
    }

    if (formFeatures.length === 0) {
      errors.unlockedFeatures = 'Chọn ít nhất một chức năng';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildFeaturesList(): string[] {
    return AVAILABLE_FEATURES.map((feature) => feature.key).filter((featureKey) => formFeatures.includes(featureKey));
  }

  async function submitPackage(mode: 'create' | 'edit', pkg?: SubscriptionPackage) {
    if (mode === 'edit' && !pkg) return;

    setFormError('');
    setFieldErrors({});

    if (!validateForm()) return;

    const data = {
      name: formName.trim(),
      price: Number(formPrice),
      storageLimitBytes: gbToBytes(formStorageLimitGb),
      maxFilesPerQuizGeneration: Number(formMaxFiles),
      maxQuestionsPerQuiz: Number(formMaxQuestions),
      isDefault: formIsDefault,
      unlockedFeatures: buildFeaturesList(),
    } satisfies CreateSubscriptionPackageRequest | UpdateSubscriptionPackageRequest;

    setActionLoading(true);
    try {
      if (mode === 'create') {
        await subscriptionService.create(data as CreateSubscriptionPackageRequest);
      } else if (pkg) {
        await subscriptionService.update(pkg.id, data as UpdateSubscriptionPackageRequest);
      }

      closeModal();
      await loadPackages();
    } catch (err) {
      const fErrors = extractFieldErrors(err);
      if (fErrors._form) {
        setFormError(fErrors._form);
      } else if (Object.keys(fErrors).length > 0) {
        setFieldErrors(fErrors);
      } else {
        setFormError(extractError(err));
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleteTarget.isDefault) return;

    setActionLoading(true);
    try {
      await subscriptionService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadPackages();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  const packageCount = packages.length;
  const defaultPackage = packages.find((pkg) => pkg.isDefault) ?? null;

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Subscription Packages</p>
          <h1 style={titleStyle}>Quản lý gói subscription</h1>
          <p style={subtitleStyle}>
            Cấu hình giá, hạn mức quiz và các chức năng mở khóa cho từng gói. Storage đang hiển thị theo GB,
            còn lưu trữ thực tế sẽ được gắn sau.
          </p>
        </div>

        <div style={heroActionsStyle}>
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <span style={statValueStyle}>{packageCount}</span>
              <span style={statLabelStyle}>gói đang có</span>
            </div>
            <div style={statCardStyle}>
              <span style={statValueStyle}>{defaultPackage ? '1' : '0'}</span>
              <span style={statLabelStyle}>gói mặc định</span>
            </div>
          </div>

          <button type="button" onClick={openCreateModal} className="btn btn-add">
            Thêm gói mới
          </button>
        </div>
      </div>

      <div style={noticeStyle}>
        <strong>Gói mặc định:</strong> hệ thống sẽ tạo sẵn một gói miễn phí 0đ để áp dụng mặc định cho tài khoản chưa có gói riêng.
      </div>

      {error && (
        <div role="alert" style={alertErrorStyle}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={emptyStateStyle}>Đang tải dữ liệu gói subscription...</div>
      ) : packages.length === 0 ? (
        <div style={emptyStateStyle}>
          Chưa có gói subscription nào. Tạo gói miễn phí đầu tiên để bắt đầu.
        </div>
      ) : (
        <div style={tableShellStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Gói</th>
                <th style={thStyle}>Giá</th>
                <th style={thStyle}>Hạn mức</th>
                <th style={thStyle}>Chức năng</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={thStyle}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td style={tdStyle}>
                    <div style={packageNameStyle}>
                      <span>{pkg.name}</span>
                      {pkg.isDefault && <span style={defaultBadgeStyle}>Mặc định</span>}
                    </div>
                  </td>
                  <td style={tdStyle}>{formatCurrency(pkg.price)}</td>
                  <td style={tdStyle}>
                    <div style={limitStackStyle}>
                      <span>{formatStorageLimit(pkg.storageLimitBytes)}</span>
                      <span style={limitMetaStyle}>{pkg.maxFilesPerQuizGeneration} file / lần tạo quiz</span>
                      <span style={limitMetaStyle}>{pkg.maxQuestionsPerQuiz} câu hỏi tối đa</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={featureStackStyle}>
                      {pkg.unlockedFeatures.length > 0 ? (
                        pkg.unlockedFeatures.map((featureKey) => (
                          <span key={featureKey} style={featureChipStyle}>
                            {featureLabel(featureKey)}
                          </span>
                        ))
                      ) : (
                        <span style={mutedTextStyle}>Chưa mở chức năng nào</span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={featureStackStyle}>
                      <span style={statusBadgeStyle(pkg.isDefault)}>
                        {pkg.isDefault ? 'Áp dụng toàn hệ thống' : 'Gói tùy chỉnh'}
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={actionButtonsStyle}>
                      <button
                        type="button"
                        onClick={() => openEditModal(pkg)}
                        disabled={actionLoading}
                        className="btn btn-update"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(pkg)}
                        disabled={actionLoading || pkg.isDefault}
                        className="btn btn-delete"
                      >
                        {pkg.isDefault ? 'Không xóa' : 'Xóa'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.type && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={modalTitleStyle}>{modal.type === 'create' ? 'Tạo gói mới' : 'Chỉnh sửa gói'}</h2>
                <p style={modalSubtitleStyle}>
                  Tối ưu cho quiz generator và các chức năng mở khóa theo từng gói.
                </p>
              </div>
              <button type="button" onClick={closeModal} style={closeButtonStyle} aria-label="Đóng">
                ×
              </button>
            </div>

            {formError && (
              <div role="alert" style={alertErrorStyle}>
                {formError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modal.type) {
                  void submitPackage(modal.type, modal.pkg);
                }
              }}
              noValidate
            >
              <div style={formGridStyle}>
                <Field label="Tên gói" error={fieldErrors.name}>
                  <input
                    id="modal-name"
                    type="text"
                    placeholder="Ví dụ: Gói miễn phí"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Giá (VND)" error={fieldErrors.price}>
                  <input
                    id="modal-price"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Giới hạn lưu trữ (GB)" error={fieldErrors.storageLimitGb}>
                  <input
                    id="modal-storage"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={formStorageLimitGb}
                    onChange={(e) => setFormStorageLimitGb(e.target.value)}
                    style={inputStyle}
                  />
                  <span style={helperTextStyle}>Cấu hình này vẫn là placeholder cho storage thật ở giai đoạn sau.</span>
                </Field>

                <Field label="Số file mỗi lần tạo quiz" error={fieldErrors.maxFilesPerQuizGeneration}>
                  <input
                    id="modal-max-files"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="5"
                    value={formMaxFiles}
                    onChange={(e) => setFormMaxFiles(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Số câu hỏi tối đa" error={fieldErrors.maxQuestionsPerQuiz}>
                  <input
                    id="modal-max-questions"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="10"
                    value={formMaxQuestions}
                    onChange={(e) => setFormMaxQuestions(e.target.value)}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <section style={sectionBlockStyle}>
                <div style={sectionHeaderStyle}>
                  <h3 style={sectionTitleStyle}>Chức năng được mở khóa</h3>
                  <span style={helperTextStyle}>
                    Hiện tại chỉ có quiz generator, nhưng cấu trúc đã sẵn sàng cho các chức năng khác.
                  </span>
                </div>

                <div style={checkboxGridStyle}>
                  {AVAILABLE_FEATURES.map((feature) => {
                    const checked = formFeatures.includes(feature.key);
                    return (
                      <label key={feature.key} style={checkboxCardStyle(checked)}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFeature(feature.key)}
                        />
                        <span>
                          <strong style={{ display: 'block' }}>{feature.label}</strong>
                          <span style={helperTextStyle}>{feature.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {fieldErrors.unlockedFeatures && <span style={fieldErrorStyle}>{fieldErrors.unlockedFeatures}</span>}
              </section>

              <section style={sectionBlockStyle}>
                <label style={defaultToggleStyle}>
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                  />
                  <span>
                    <strong style={{ display: 'block' }}>Đặt làm gói mặc định</strong>
                    <span style={helperTextStyle}>
                      Gói này sẽ là lựa chọn mặc định cho tài khoản chưa có subscription riêng.
                    </span>
                  </span>
                </label>
              </section>

              <div style={footerActionsStyle}>
                <button type="button" onClick={closeModal} disabled={actionLoading} className="btn btn-neutral">
                  Hủy
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-update">
                  {actionLoading ? 'Đang xử lý...' : modal.type === 'create' ? 'Tạo gói' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={modalTitleStyle}>Xác nhận xóa</h2>
            <p style={{ ...modalSubtitleStyle, marginBottom: 20 }}>
              {deleteTarget.isDefault
                ? 'Gói mặc định không thể xóa vì đang là cấu hình áp dụng cho toàn bộ tài khoản.'
                : `Bạn có chắc chắn muốn xóa gói ${deleteTarget.name}?`}
            </p>
            <div style={footerActionsStyle}>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={actionLoading} className="btn btn-neutral">
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading || deleteTarget.isDefault}
                className="btn btn-delete"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label style={fieldWrapperStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
      {error && <span style={fieldErrorStyle}>{error}</span>}
    </label>
  );
}

function featureLabel(featureKey: string): string {
  return AVAILABLE_FEATURES.find((feature) => feature.key === featureKey)?.label ?? featureKey;
}

function gbToBytes(value: string): number {
  return Math.round(Number(value) * BYTES_PER_GB);
}

function formatGbValue(bytes: number): string {
  const value = bytes / BYTES_PER_GB;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '');
}

function formatStorageLimit(bytes: number): string {
  return `${formatGbValue(bytes)} GB`;
}

function statusBadgeStyle(isDefault: boolean): CSSProperties {
  return {
    ...statusBadgeBaseStyle,
    backgroundColor: isDefault ? '#e8f5e9' : '#fff8e1',
    color: isDefault ? '#2e7d32' : '#8d6e63',
  };
}

function checkboxCardStyle(checked: boolean): CSSProperties {
  return {
    ...checkboxCardBaseStyle,
    borderColor: checked ? '#1f7a4d' : '#d7dce3',
    backgroundColor: checked ? '#f1fbf5' : '#ffffff',
  };
}

const pageStyle: CSSProperties = {
  padding: 24,
  background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
};

const heroStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 24,
  alignItems: 'flex-start',
  marginBottom: 20,
  padding: 24,
  borderRadius: 20,
  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  color: '#fff',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
};

const heroActionsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  minWidth: 320,
};

const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12,
};

const statCardStyle: CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const statValueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  lineHeight: 1,
};

const statLabelStyle: CSSProperties = {
  fontSize: 12,
  opacity: 0.86,
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.75,
};

const titleStyle: CSSProperties = {
  margin: '10px 0 12px',
  fontSize: 36,
  lineHeight: 1.1,
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  maxWidth: 760,
  fontSize: 15,
  lineHeight: 1.7,
  color: 'rgba(255,255,255,0.82)',
};

const noticeStyle: CSSProperties = {
  padding: '14px 16px',
  marginBottom: 16,
  borderRadius: 14,
  backgroundColor: '#eef6ff',
  border: '1px solid #cfe1ff',
  color: '#1b4d8c',
};

const alertErrorStyle: CSSProperties = {
  padding: '12px 14px',
  marginBottom: 16,
  borderRadius: 14,
  backgroundColor: '#fff1f1',
  border: '1px solid #f1b7b7',
  color: '#b42318',
};

const emptyStateStyle: CSSProperties = {
  padding: 28,
  borderRadius: 18,
  backgroundColor: '#fff',
  border: '1px dashed #d9e2ec',
  color: '#4b5563',
};

const tableShellStyle: CSSProperties = {
  overflowX: 'auto',
  borderRadius: 18,
  border: '1px solid #e5e7eb',
  backgroundColor: '#fff',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: 0.7,
  color: '#6b7280',
  backgroundColor: '#f8fafc',
};

const tdStyle: CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid #eef2f7',
  verticalAlign: 'top',
};

const packageNameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontWeight: 600,
};

const defaultBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  width: 'fit-content',
  padding: '4px 10px',
  borderRadius: 999,
  backgroundColor: '#e3f2fd',
  color: '#1565c0',
  fontSize: 12,
  fontWeight: 600,
};

const limitStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const limitMetaStyle: CSSProperties = {
  fontSize: 13,
  color: '#6b7280',
};

const featureStackStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const featureChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  backgroundColor: '#edf7f1',
  color: '#1f7a4d',
  fontSize: 12,
  fontWeight: 600,
};

const mutedTextStyle: CSSProperties = {
  color: '#9ca3af',
  fontSize: 13,
};

const statusBadgeBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  width: 'fit-content',
  padding: '6px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
};

const actionButtonsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.56)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20,
};

const modalStyle: CSSProperties = {
  width: 'min(920px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  backgroundColor: '#fff',
  padding: 24,
  borderRadius: 22,
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.24)',
};

const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 20,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  color: '#0f172a',
};

const modalSubtitleStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#64748b',
  lineHeight: 1.6,
};

const closeButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: '1px solid #dbe4f0',
  backgroundColor: '#fff',
  color: '#334155',
  cursor: 'pointer',
  fontSize: 20,
  lineHeight: 1,
};

const formGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
};

const fieldWrapperStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#1f2937',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  fontSize: 14,
};

const helperTextStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: '#64748b',
};

const fieldErrorStyle: CSSProperties = {
  color: '#b42318',
  fontSize: 12,
  lineHeight: 1.4,
};

const sectionBlockStyle: CSSProperties = {
  marginTop: 18,
  padding: 16,
  borderRadius: 18,
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
};

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginBottom: 14,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  color: '#0f172a',
};

const checkboxGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 12,
};

const checkboxCardBaseStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: 14,
  borderRadius: 16,
  border: '1px solid',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const defaultToggleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: 14,
  borderRadius: 16,
  backgroundColor: '#fff',
  border: '1px solid #dbe4f0',
};

const footerActionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 22,
};
