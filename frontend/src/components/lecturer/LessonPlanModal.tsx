import { useState, type FormEvent } from 'react';
import type { LessonPlan, CreateLessonPlanRequest, CreateLessonRequest } from '../../types/lessonPlan';

const GRADE_OPTIONS = [
  'Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6',
  'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12',
  'Đại học',
];

interface LessonPlanModalProps {
  mode: 'create' | 'edit';
  plan?: LessonPlan | null;
  loading: boolean;
  onSubmit: (data: CreateLessonPlanRequest) => void;
  onClose: () => void;
}

function getInitialLessons(mode: string, plan?: LessonPlan | null): CreateLessonRequest[] {
  if (mode === 'edit' && plan) {
    return plan.lessons.map((l) => ({ id: l.id, name: l.name, orderIndex: l.orderIndex }));
  }
  return [];
}

export default function LessonPlanModal({ mode, plan, loading, onSubmit, onClose }: LessonPlanModalProps) {
  const [subject, setSubject] = useState(mode === 'edit' && plan ? plan.subject : '');
  const [grade, setGrade] = useState(mode === 'edit' && plan ? plan.grade : GRADE_OPTIONS[0]);
  const [schoolYearStart, setSchoolYearStart] = useState(mode === 'edit' && plan ? plan.schoolYearStart : '');
  const [schoolYearEnd, setSchoolYearEnd] = useState(mode === 'edit' && plan ? plan.schoolYearEnd : '');
  const [lessons, setLessons] = useState<CreateLessonRequest[]>(() => getInitialLessons(mode, plan));
  const [formError, setFormError] = useState('');

  function handleAddLesson() {
    setLessons((prev) => [...prev, { name: '', orderIndex: prev.length + 1 }]);
  }

  function handleRemoveLesson(index: number) {
    setLessons((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((l, i) => ({ ...l, orderIndex: i + 1 }));
    });
  }

  function handleLessonNameChange(index: number, name: string) {
    setLessons((prev) => prev.map((l, i) => (i === index ? { ...l, name } : l)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!subject.trim() || !schoolYearStart.trim() || !schoolYearEnd.trim()) {
      setFormError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    onSubmit({
      subject: subject.trim(),
      grade,
      schoolYearStart: schoolYearStart.trim(),
      schoolYearEnd: schoolYearEnd.trim(),
      lessons,
    });
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginBottom: 16 }}>
          {mode === 'create' ? 'Thêm giáo án' : 'Sửa giáo án'}
        </h2>

        {formError && (
          <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="lp-subject" style={labelStyle}>Môn học</label>
            <input
              id="lp-subject"
              type="text"
              placeholder="Nhập môn học"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="lp-grade" style={labelStyle}>Khối lớp</label>
            <select
              id="lp-grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={inputStyle}
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="lp-year-start" style={labelStyle}>Năm bắt đầu</label>
              <input
                id="lp-year-start"
                type="text"
                placeholder="VD: 2024"
                value={schoolYearStart}
                onChange={(e) => setSchoolYearStart(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="lp-year-end" style={labelStyle}>Năm kết thúc</label>
              <input
                id="lp-year-end"
                type="text"
                placeholder="VD: 2025"
                value={schoolYearEnd}
                onChange={(e) => setSchoolYearEnd(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 'bold' }}>Bài học</span>
              <button type="button" onClick={handleAddLesson} className="btn btn-add" style={{ padding: '4px 12px' }}>
                Thêm bài học
              </button>
            </div>
            {lessons.length === 0 && (
              <p style={{ color: '#888', fontSize: 14 }}>Chưa có bài học nào</p>
            )}
            {lessons.map((lesson, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <span style={{ minWidth: 24 }}>{index + 1}.</span>
                <input
                  type="text"
                  placeholder="Tên bài học"
                  aria-label={`Bài học ${index + 1}`}
                  value={lesson.name}
                  onChange={(e) => handleLessonNameChange(index, e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLesson(index)}
                  className="btn btn-delete"
                  style={{ padding: '4px 8px' }}
                >
                  Xóa bài học
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-neutral"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-update"
            >
              {loading ? 'Đang xử lý...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
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
  minWidth: 500,
  maxWidth: 600,
  maxHeight: '80vh',
  overflowY: 'auto',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  boxSizing: 'border-box',
};
