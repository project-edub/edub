import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
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

  useEffect(() => {
    if (activeTab === 'basic' && id) {
      classService.getById(Number(id)).then(setClassDetail).catch(() => {});
    }
  }, [activeTab, id]);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 2 }, display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        <Typography role="alert" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/lecturer/classes')}
          sx={{ minHeight: 44 }}
        >
          Quay lại danh sách
        </Button>
      </Box>
    );
  }

  if (!classDetail) {
    return null;
  }

  const basicInfo = [
    { label: 'Tên lớp', value: classDetail.name },
    { label: 'Năm học', value: classDetail.year },
    { label: 'Số học sinh', value: String(classDetail.studentCount) },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Button
        variant="outlined"
        onClick={() => navigate('/lecturer/classes')}
        sx={{ mb: 2, minHeight: 44 }}
      >
        ← Quay lại danh sách
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3, color: 'var(--edub-text-primary)' }}>
        {classDetail.name}
      </Typography>

      {/* Tab navigation — scrollable on mobile */}
      <Box
        sx={{
          display: 'flex',
          borderBottom: '2px solid var(--edub-border)',
          mb: 3,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            sx={{
              flex: { xs: '0 0 auto', md: 1 },
              minWidth: { xs: 'max-content', md: 0 },
              px: { xs: 2, md: 2.5 },
              py: 1.75,
              minHeight: 44,
              borderRadius: 0,
              borderBottom: activeTab === tab.key ? '3px solid #1a73e8' : '3px solid transparent',
              color: activeTab === tab.key ? '#1a73e8' : 'var(--edub-text-secondary)',
              fontWeight: activeTab === tab.key ? 600 : 500,
              fontSize: '0.875rem',
              textTransform: 'none',
              mb: '-2px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </Button>
        ))}
      </Box>

      {activeTab === 'basic' && (
        <>
          {/* Mobile card view */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {basicInfo.map((item) => (
              <Card key={item.label} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Desktop table view */}
          <Box component="table" sx={{ display: { xs: 'none', md: 'table' }, borderCollapse: 'collapse' }}>
            <Box component="tbody">
              {basicInfo.map((item) => (
                <Box component="tr" key={item.label}>
                  <Box
                    component="td"
                    sx={{
                      p: '8px 16px 8px 0',
                      fontWeight: 600,
                      color: 'var(--edub-text-secondary)',
                      verticalAlign: 'top',
                    }}
                  >
                    {item.label}
                  </Box>
                  <Box component="td" sx={{ p: '8px 0' }}>
                    {item.value}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      {activeTab === 'students' && (
        <StudentListTabs classId={classDetail.id} className={classDetail.name} />
      )}

      {activeTab === 'lessonPlan' && (
        <ClassLessonPlanTab classId={classDetail.id} />
      )}
    </Box>
  );
}
