import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import type { ClassDetail } from '../../types/class';
import type { ApiError } from '../../types/common';
import * as classService from '../../services/classService';
import StudentListTabs from '../../components/lecturer/StudentListTabs';
import ClassLessonPlanTab from '../../components/lecturer/ClassLessonPlanTab';

type TabKey = 'basic' | 'students' | 'lessonPlan';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'basic', label: 'Thông tin cơ bản' },
  { key: 'students', label: 'Danh sách học sinh' },
  { key: 'lessonPlan', label: 'Giáo án' },
];

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  const loadClass = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await classService.getById(Number(id));
      setClassDetail(data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadClass();
  }, [loadClass]);

  // Reload class detail when switching to basic tab (to refresh studentCount)
  useEffect(() => {
    if (activeTab === 'basic' && id) {
      classService.getById(Number(id)).then(setClassDetail).catch(() => {});
    }
  }, [activeTab, id]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div role="alert" style={{ color: '#d32f2f', marginBottom: 16 }}>{error}</div>
        <button type="button" onClick={() => navigate('/lecturer/classes')} className="btn btn-view">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (!classDetail) {
    return null;
  }

  return (
    <div style={{ padding: 24 }}>
      <button
        type="button"
        onClick={() => navigate('/lecturer/classes')}
        className="btn btn-view"
        style={{ marginBottom: 16, padding: '6px 12px' }}
      >
        ← Quay lại danh sách
      </button>

      <h1 style={{ marginBottom: 24, color: 'var(--edub-text-primary)' }}>{classDetail.name}</h1>

      {/* Google-style tab navigation - equal width tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--edub-border)', marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #1a73e8' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? '#1a73e8' : 'var(--edub-text-secondary)',
              fontWeight: activeTab === tab.key ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'color 200ms ease, border-color 200ms ease',
              textAlign: 'center',
              marginBottom: -2,
              fontFamily: '"Roboto Flex", "Segoe UI", sans-serif',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'basic' && (
        <div>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={labelStyle}>Tên lớp</td>
                <td style={valueStyle}>{classDetail.name}</td>
              </tr>
              <tr>
                <td style={labelStyle}>Niên khóa</td>
                <td style={valueStyle}>{classDetail.year}</td>
              </tr>
              <tr>
                <td style={labelStyle}>Số học sinh</td>
                <td style={valueStyle}>{classDetail.studentCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'students' && (
        <StudentListTabs classId={classDetail.id} className={classDetail.name} />
      )}

      {activeTab === 'lessonPlan' && (
        <ClassLessonPlanTab classId={classDetail.id} />
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  padding: '8px 16px 8px 0',
  fontWeight: 600,
  color: 'var(--edub-text-secondary)',
  verticalAlign: 'top',
};

const valueStyle: React.CSSProperties = {
  padding: '8px 0',
};
