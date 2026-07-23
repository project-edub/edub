import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import Button from '@mui/material/Button';
import { CalendarRange } from 'lucide-react';
import type { LessonPlanSummary } from '../../types/lessonPlan';
import type { ClassLessonPlanResponse, ClassLessonResponse } from '../../types/classLessonPlan';
import type { SchoolYearHoliday } from '../../types/teachingSchedule';
import type { ApiError } from '../../types/common';
import * as lessonPlanService from '../../services/lessonPlanService';
import * as classLessonPlanService from '../../services/classLessonPlanService';
import * as teachingScheduleService from '../../services/teachingScheduleService';
import { openAttachmentInViewer } from '../../services/lessonService';
import QuizPlayModal from './QuizPlayModal';
import ScheduleSetupDialog from './class/ScheduleSetupDialog';
import TeachingDatesPreviewDialog from './class/TeachingDatesPreviewDialog';

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

  // Auto-fill teaching dates state
  const [scheduleSetupOpen, setScheduleSetupOpen] = useState(false);
  const [datesPreviewOpen, setDatesPreviewOpen] = useState(false);
  const [holidays, setHolidays] = useState<SchoolYearHoliday[]>([]);
  const [autoFillLoading, setAutoFillLoading] = useState(false);

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

  async function handleAutoFillDates() {
    if (!assignedPlan) return;
    setAutoFillLoading(true);
    setError('');
    try {
      // Check if schedule exists for this class + subject
      const schedule = await teachingScheduleService.getSchedule(classId, assignedPlan.subject);
      // Schedule exists — load holidays and open preview directly
      const holidayData = await teachingScheduleService.getCalendarHolidays(schedule.calendarId);
      setHolidays(holidayData);
      setDatesPreviewOpen(true);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      if (axiosErr.response?.status === 404) {
        // No schedule yet — open setup dialog first
        setScheduleSetupOpen(true);
      } else {
        setError(extractError(err));
      }
    } finally {
      setAutoFillLoading(false);
    }
  }

  async function handleScheduleSaved() {
    setScheduleSetupOpen(false);
    // After schedule is saved, load holidays and open dates preview
    if (!assignedPlan) return;
    setAutoFillLoading(true);
    try {
      const schedule = await teachingScheduleService.getSchedule(classId, assignedPlan.subject);
      const holidayData = await teachingScheduleService.getCalendarHolidays(schedule.calendarId);
      setHolidays(holidayData);
      setDatesPreviewOpen(true);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setAutoFillLoading(false);
    }
  }

  function handleDatesApplied() {
    setDatesPreviewOpen(false);
    // Refresh the lesson list to show new dates
    loadData();
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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <select
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value ? Number(e.target.value) : '')}
          style={{ padding: 8, width: 300, maxWidth: '100%', boxSizing: 'border-box', backgroundColor: 'var(--edub-input-bg)', border: '1px solid var(--edub-input-border)', color: 'var(--edub-text-primary)', borderRadius: 8 }}
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
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 'min(420px, calc(100% - 24px))', maxHeight: 'calc(100dvh - 24px)', boxSizing: 'border-box', overflowY: 'auto' }}>
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
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong>{assignedPlan.subject}</strong> — {assignedPlan.grade} ({assignedPlan.schoolYearStart}-{assignedPlan.schoolYearEnd})
            </div>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CalendarRange size={20} />}
              onClick={handleAutoFillDates}
              disabled={autoFillLoading || assignedPlan.lessons.length === 0}
            >
              {autoFillLoading ? 'Đang kiểm tra...' : 'Tự động điền ngày dạy'}
            </Button>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Tìm kiếm bài học"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: 8, width: 300, maxWidth: '100%', boxSizing: 'border-box', backgroundColor: 'var(--edub-input-bg)', border: '1px solid var(--edub-input-border)', color: 'var(--edub-text-primary)', borderRadius: 8 }}
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

      {/* Schedule Setup Dialog */}
      {assignedPlan && (
        <ScheduleSetupDialog
          open={scheduleSetupOpen}
          onClose={() => setScheduleSetupOpen(false)}
          classId={classId}
          subject={assignedPlan.subject}
          onSaved={handleScheduleSaved}
        />
      )}

      {/* Teaching Dates Preview Dialog */}
      {assignedPlan && (
        <TeachingDatesPreviewDialog
          open={datesPreviewOpen}
          onClose={() => setDatesPreviewOpen(false)}
          classId={classId}
          lessonPlanId={assignedPlan.lessonPlanId}
          holidays={holidays}
          onApplied={handleDatesApplied}
        />
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
        <ExpandedLessonContent lesson={lesson} onPlayGame={onPlayGame} />
      )}
    </div>
  );
}

/* ---- Helper: detect game links ---- */

function isGameLink(link: string): boolean {
  return /\/quiz\/|\/play\//.test(link);
}

/* ---- Expanded Lesson Content Sub-component ---- */

interface ExpandedLessonContentProps {
  lesson: ClassLessonResponse;
  onPlayGame: (gameId: number) => void;
}

function ExpandedLessonContent({ lesson, onPlayGame }: ExpandedLessonContentProps) {
  // Split documents into regular docs and game docs
  const regularDocs = lesson.documents.filter((doc) => !isGameLink(doc.link));
  const gameDocs = lesson.documents.filter((doc) => isGameLink(doc.link));

  // Categorize game docs into crosswords and quizzes
  const crosswordGames = gameDocs.filter((doc) => doc.link.includes('/play/'));
  const quizGames = gameDocs.filter((doc) => doc.link.includes('/quiz/'));

  return (
    <div style={{ padding: '0 12px 12px 44px' }}>
      {/* Đường dẫn tham khảo (FR-03: renamed from Tài liệu) */}
      <section style={{ marginBottom: 12 }}>
        <h4 style={{ margin: '0 0 6px' }}>Đường dẫn tham khảo</h4>
        {regularDocs.length === 0 ? (
          <p style={{ color: 'var(--edub-text-secondary)', fontSize: 13 }}>Không có đường dẫn</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Đường dẫn</th>
                <th style={thStyle}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {regularDocs.map((doc) => (
                <tr key={doc.id}>
                  <td style={tdStyle}>
                    <a href={doc.link} target="_blank" rel="noopener noreferrer">{doc.link}</a>
                  </td>
                  <td style={tdStyle}>{doc.name !== doc.link ? doc.name : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Trò chơi (FR-05: game documents separated) */}
      {gameDocs.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <h4 style={{ margin: '0 0 6px' }}>Trò chơi</h4>
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Ô chữ column */}
            <div style={{ flex: 1 }}>
              <h5 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600 }}>Ô chữ</h5>
              {crosswordGames.length === 0 ? (
                <p style={{ color: 'var(--edub-text-secondary)', fontSize: 13 }}>—</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                  {crosswordGames.map((doc) => (
                    <li key={doc.id}>
                      <a href={doc.link} target="_blank" rel="noopener noreferrer">{doc.name}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Câu hỏi trắc nghiệm column */}
            <div style={{ flex: 1 }}>
              <h5 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600 }}>Câu hỏi trắc nghiệm</h5>
              {quizGames.length === 0 ? (
                <p style={{ color: 'var(--edub-text-secondary)', fontSize: 13 }}>—</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                  {quizGames.map((doc) => (
                    <li key={doc.id}>
                      <a href={doc.link} target="_blank" rel="noopener noreferrer">{doc.name}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

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

      {/* Trò chơi - renamed from Mini game */}
      <section>
        <h4 style={{ margin: '0 0 6px' }}>Trò chơi</h4>
        {lesson.miniGames.length === 0 ? (
          <p style={{ color: 'var(--edub-text-secondary)', fontSize: 13 }}>Không có trò chơi</p>
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
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--edub-border)' };
const tdStyle: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid var(--edub-border)' };
