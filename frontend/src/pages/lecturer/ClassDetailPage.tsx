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

      <h1 style={{ marginBottom: 24, color: '#000' }}>{classDetail.name}</h1>

      {/* Tab navigation */}
      <div style={{ display: 'flex', borderBottom: '2px solid #ccc', marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="btn btn-view"
            style={{
              padding: '10px 20px',
              borderBottom: activeTab === tab.key ? '3px solid #007fff' : '3px solid transparent',
              background: activeTab === tab.key ? '#f0f8ff' : 'none',
              fontWeight: activeTab === tab.key ? 600 : 400,
              marginBottom: -2,
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
                <td style={labelStyle}>Năm học</td>
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
        <StudentListTabs classId={classDetail.id} />
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
  color: '#555',
  verticalAlign: 'top',
};

const valueStyle: React.CSSProperties = {
  padding: '8px 0',
};
