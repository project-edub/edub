import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { LessonPlanSummary } from '../../types/lessonPlan';
import type { ClassLessonPlanResponse, ClassLessonResponse } from '../../types/classLessonPlan';
import type { ApiError } from '../../types/common';
import * as lessonPlanService from '../../services/lessonPlanService';
import * as classLessonPlanService from '../../services/classLessonPlanService';
import { openAttachmentInViewer } from '../../services/lessonService';
import QuizPlayModal from './QuizPlayModal';

interface ClassLessonPlanTabProps {
  classId: number;
}

function extractError(err: unknown): string {
  const axiosErr = err as AxiosError<ApiError>;
  return axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClassLessonPlanTab({ classId }: ClassLessonPlanTabProps) {
  const [plans, setPlans] = useState<LessonPlanSummary[]>([]);
  const [assignedPlan, setAssignedPlan] = useState<ClassLessonPlanResponse | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLessonId, setExpandedLessonId] = useState<number | null>(null);
  const [playGameId, setPlayGameId] = useState<number | null>(null);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [planList, assigned] = await Promise.all([
        lessonPlanService.getAll(),
        classLessonPlanService.getAssignedPlan(classId),
      ]);
      setPlans(planList);
      setAssignedPlan(assigned);
      if (assigned) {
        setSelectedPlanId(assigned.lessonPlanId);
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAssign() {
    if (!selectedPlanId) return;
    setAssigning(true);
    setError('');
    try {
      const result = await classLessonPlanService.assignLessonPlan(classId, Number(selectedPlanId));
      setAssignedPlan(result);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign() {
    setUnassigning(true);
    setError('');
    try {
      await classLessonPlanService.unassignLessonPlan(classId);
      setAssignedPlan(null);
      setSelectedPlanId('');
      setConfirmUnassign(false);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setUnassigning(false);
    }
  }

  async function handleDateChange(lessonId: number, dateValue: string) {
    setError('');
    try {
      const scheduledDate = dateValue || null;
      const currentStatus = assignedPlan?.lessons.find((l) => l.id === lessonId)?.lessonStatus;
      const updated = await classLessonPlanService.updateLessonSchedule(classId, lessonId, scheduledDate, currentStatus);
      setAssignedPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lessons: prev.lessons.map((l) =>
            l.id === updated.id ? { ...l, scheduledDate: updated.scheduledDate, lessonStatus: updated.lessonStatus } : l,
          ),
        };
      });
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function handleStatusChange(lessonId: number, lessonStatus: 'finish' | 'unfinish' | 'pending') {
    setError('');
    try {
      const currentDate = assignedPlan?.lessons.find((l) => l.id === lessonId)?.scheduledDate ?? null;
      const updated = await classLessonPlanService.updateLessonSchedule(classId, lessonId, currentDate, lessonStatus);
      setAssignedPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lessons: prev.lessons.map((l) =>
            l.id === updated.id ? { ...l, scheduledDate: updated.scheduledDate, lessonStatus: updated.lessonStatus } : l,
          ),
        };
      });
    } catch (err) {
      setError(extractError(err));
    }
  }

  function toggleLesson(lessonId: number) {
    setExpandedLessonId((prev) => (prev === lessonId ? null : lessonId));
  }

  const filteredLessons = assignedPlan
    ? assignedPlan.lessons.filter((l) =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : [];

  if (loading) {
    return <p>Đang tải...</p>;
  }

  return (
    <div>
      {error && (
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Lesson plan selector */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <select
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value ? Number(e.target.value) : '')}
          style={{ padding: 8, minWidth: 300, backgroundColor: 'var(--edub-input-bg)', border: '1px solid var(--edub-input-border)', color: 'var(--edub-text-primary)', borderRadius: 8 }}
          aria-label="Chọn giáo án"
        >
          <option value="">Chọn giáo án</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.subject} - {p.grade} ({p.schoolYearStart}-{p.schoolYearEnd})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAssign}
          disabled={!selectedPlanId || assigning}
          className="btn btn-update"
        >
          {assigning ? 'Đang gán...' : 'Gán giáo án'}
        </button>
        {assignedPlan && (
          <button
            type="button"
            onClick={() => setConfirmUnassign(true)}
            disabled={unassigning}
            className="btn btn-delete"
          >
            Bỏ gán giáo án
          </button>
        )}
      </div>

      {/* Confirm unassign dialog */}
      {confirmUnassign && (
        <div
          role="dialog"
          aria-label="Xác nhận bỏ gán giáo án"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, maxWidth: 420 }}>
            <h3 style={{ marginTop: 0, color: '#d32f2f' }}>Bỏ gán giáo án?</h3>
            <p style={{ color: 'var(--edub-text-secondary)', marginBottom: 16 }}>
              ⚠️ Tất cả lưu trữ tiến độ giảng dạy (ngày dạy, trạng thái bài học) sẽ bị mất và không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirmUnassign(false)} disabled={unassigning} className="btn btn-neutral">
                Hủy
              </button>
              <button type="button" onClick={handleUnassign} disabled={unassigning} className="btn btn-delete">
                {unassigning ? 'Đang xóa...' : 'Xác nhận bỏ gán'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assigned plan content */}
      {assignedPlan ? (
        <div>
          <div style={{ marginBottom: 12 }}>
            <strong>{assignedPlan.subject}</strong> — {assignedPlan.grade} ({assignedPlan.schoolYearStart}-{assignedPlan.schoolYearEnd})
          </div>

          {/* Search */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Tìm kiếm bài học"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: 8, width: 300, backgroundColor: 'var(--edub-input-bg)', border: '1px solid var(--edub-input-border)', color: 'var(--edub-text-primary)', borderRadius: 8 }}
            />
          </div>

          {/* Scrollable lesson list */}
          <div style={{ maxHeight: 500, overflowY: 'auto', border: '1px solid var(--edub-border)', borderRadius: 4 }}>
            {filteredLessons.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--edub-text-secondary)' }}>Không tìm thấy bài học nào</p>
            ) : (
              filteredLessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  expanded={expandedLessonId === lesson.id}
                  onToggle={() => toggleLesson(lesson.id)}
                  onDateChange={(date) => handleDateChange(lesson.id, date)}
                  onStatusChange={(status) => handleStatusChange(lesson.id, status)}
                  onPlayGame={(gameId) => setPlayGameId(gameId)}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--edub-text-secondary)' }}>Chưa gán giáo án cho lớp này.</p>
      )}

      {/* Quiz Play Modal */}
      {playGameId != null && (
        <QuizPlayModal miniGameId={playGameId} onClose={() => setPlayGameId(null)} />
      )}
    </div>
  );
}

/* ---- Lesson Row Sub-component ---- */

interface LessonRowProps {
  lesson: ClassLessonResponse;
  expanded: boolean;
  onToggle: () => void;
  onDateChange: (date: string) => void;
  onStatusChange: (status: 'finish' | 'unfinish' | 'pending') => void;
  onPlayGame: (gameId: number) => void;
}

function LessonRow({ lesson, expanded, onToggle, onDateChange, onStatusChange, onPlayGame }: LessonRowProps) {
  const dateValue = lesson.scheduledDate ? lesson.scheduledDate.split('T')[0] : '';

  // Req 4: Status-based background color
  const statusBgColor =
    lesson.lessonStatus === 'finish' ? '#e8f5e9' :    // green for completed
    lesson.lessonStatus === 'pending' ? '#fff8e1' :   // yellow for in-progress
    'transparent';                                     // default for unfinish

  return (
    <div style={{ borderBottom: '1px solid var(--edub-border)' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 12, cursor: 'pointer',
          backgroundColor: statusBgColor,
          transition: 'background-color 200ms ease',
        }}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
      >
        <span style={{ minWidth: 20 }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ flex: 1, fontWeight: 500 }}>{lesson.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <label style={{ fontSize: 13, color: 'var(--edub-text-secondary)' }}>Ngày dạy</label>
          <input
            type="date"
            value={dateValue}
            onChange={(e) => onDateChange(e.target.value)}
            style={{ padding: 4 }}
            aria-label={`Ngày dạy ${lesson.name}`}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <label style={{ fontSize: 13, color: 'var(--edub-text-secondary)' }}>Trạng thái</label>
          <select
            value={lesson.lessonStatus}
            onChange={(e) => onStatusChange(e.target.value as 'finish' | 'unfinish' | 'pending')}
            aria-label={`Trạng thái ${lesson.name}`}
            style={{ padding: 4 }}
          >
            <option value="finish">Hoàn thành</option>
            <option value="unfinish">Chưa hoàn thành</option>
            <option value="pending">Đang dạy</option>
          </select>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 12px 44px' }}>
          {/* Documents */}
          <section style={{ marginBottom: 12 }}>
            <h4 style={{ margin: '0 0 6px' }}>Tài liệu</h4>
            {lesson.documents.length === 0 ? (
              <p style={{ color: 'var(--edub-text-secondary)', fontSize: 13 }}>Không có tài liệu</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Tên</th>
                    <th style={thStyle}>Liên kết</th>
                    <th style={thStyle}>Trang</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Attachments */}
          <section style={{ marginBottom: 12 }}>
            <h4 style={{ margin: '0 0 6px' }}>Tệp đính kèm</h4>
            {lesson.attachments.length === 0 ? (
              <p style={{ color: 'var(--edub-text-secondary)', fontSize: 13 }}>Không có tệp đính kèm</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Tên tệp</th>
                    <th style={thStyle}>Kích thước</th>
                  </tr>
                </thead>
                <tbody>
                  {lesson.attachments.map((att) => (
                    <tr key={att.id}>
                      <td style={tdStyle}>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            openAttachmentInViewer(att.id, att.fileName, att.fileUrl);
                          }}
                          style={{ color: '#1565c0', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {att.fileName}
                        </a>
                      </td>
                      <td style={tdStyle}>{formatFileSize(att.fileSize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Mini Games */}
          <section>
            <h4 style={{ margin: '0 0 6px' }}>Mini game</h4>
            {lesson.miniGames.length === 0 ? (
              <p style={{ color: 'var(--edub-text-secondary)', fontSize: 13 }}>Không có mini game</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
                        <button
                          type="button"
                          onClick={() => onPlayGame(game.id)}
                          className="btn btn-view"
                        >
                          Chơi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--edub-border)' };
const tdStyle: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid var(--edub-border)' };
