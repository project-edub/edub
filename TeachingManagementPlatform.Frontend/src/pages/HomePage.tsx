import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import type { PublicLecturerProfile } from '../types/profile';
import type { ApiError } from '../types/common';
import * as publicService from '../services/publicService';
import { getApiOrigin } from '../services/apiConfig';
import { useColorMode } from '../theme/ColorModeContext';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types/auth';
import Pagination, { usePagination } from '../components/common/Pagination';

function resolveImageUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const origin = getApiOrigin();
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeTextList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];

  const values = items
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return '';

      const candidate = item as Record<string, unknown>;
      const value =
        candidate.value ??
        candidate.name ??
        candidate.title ??
        candidate.label ??
        candidate.description;

      return typeof value === 'string' ? value.trim() : '';
    })
    .filter(Boolean);

  return Array.from(new Set(values));
}

function normalizeExpertises(items: unknown): { specialty: string; degree: string; certificateImageUrl?: string }[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (typeof item === 'string') {
        const raw = item.trim();
        return raw ? { specialty: raw, degree: '' } : null;
      }

      if (!item || typeof item !== 'object') return null;

      const candidate = item as Record<string, unknown>;
      const specialtyRaw = candidate.specialty ?? candidate.subject ?? candidate.value;
      const degreeRaw = candidate.degree ?? candidate.level ?? '';
      const certUrlRaw = candidate.certificateImageUrl ?? '';

      const specialty = typeof specialtyRaw === 'string' ? specialtyRaw.trim() : '';
      const degree = typeof degreeRaw === 'string' ? degreeRaw.trim() : '';
      const certificateImageUrl = typeof certUrlRaw === 'string' && certUrlRaw.trim() ? certUrlRaw.trim() : undefined;

      if (!specialty && !degree) return null;
      return { specialty, degree, certificateImageUrl };
    })
    .filter((item): item is { specialty: string; degree: string; certificateImageUrl?: string } => Boolean(item));
}

function normalizeDescriptionList(items: unknown): { description: string; imageUrl?: string }[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') return item.trim() ? { description: item.trim() } : null;
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const desc = candidate.description ?? candidate.value ?? '';
      const imgUrlRaw = candidate.imageUrl ?? '';
      const imageUrl = typeof imgUrlRaw === 'string' && imgUrlRaw.trim() ? imgUrlRaw.trim() : undefined;
      return typeof desc === 'string' && desc.trim() ? { description: desc.trim(), imageUrl } : null;
    })
    .filter((item): item is { description: string; imageUrl?: string } => Boolean(item));
}

function normalizeContentList(items: unknown): { content: string }[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') return item.trim() ? { content: item.trim() } : null;
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const content = candidate.content ?? candidate.value ?? '';
      return typeof content === 'string' && content.trim() ? { content: content.trim() } : null;
    })
    .filter((item): item is { content: string } => Boolean(item));
}

function normalizeLecturer(input: unknown, fallbackId: number): PublicLecturerProfile {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const id = typeof source.id === 'number' ? source.id : fallbackId;
  const fullName =
    typeof source.fullName === 'string' && source.fullName.trim()
      ? source.fullName.trim()
      : 'Giáo viên chưa cập nhật tên';
  const introduction = typeof source.introduction === 'string' ? source.introduction.trim() : null;

  return {
    id,
    fullName,
    introduction,
    avatarUrl: resolveImageUrl(source.avatarUrl),
    teachingLocations: normalizeTextList(source.teachingLocations).map((value) => ({ value })),
    expertises: normalizeExpertises(source.expertises),
    experiences: normalizeDescriptionList(source.experiences),
    teachingSkills: normalizeDescriptionList(source.teachingSkills),
    notes: normalizeContentList(source.notes),
  };
}

function normalizeSearchResponse(response: unknown): PublicLecturerProfile[] {
  const list = Array.isArray(response)
    ? response
    : response && typeof response === 'object' && Array.isArray((response as { lecturers?: unknown[] }).lecturers)
      ? (response as { lecturers: unknown[] }).lecturers
      : [];

  return list.map((item, index) => normalizeLecturer(item, index + 1));
}

/** Client-side filter: matches search query against all profile text fields */
function matchesSearch(lecturer: PublicLecturerProfile, query: string): boolean {
  if (!query.trim()) return true;
  const lowerQuery = query.toLowerCase().trim();

  const searchableTexts: string[] = [
    lecturer.fullName,
    lecturer.introduction || '',
    ...lecturer.teachingLocations.map((l) => l.value),
    ...lecturer.expertises.map((e) => `${e.specialty} ${e.degree}`),
    ...(lecturer.experiences || []).map((e) => e.description),
    ...(lecturer.teachingSkills || []).map((s) => s.description),
    ...(lecturer.notes || []).map((n) => n.content),
  ];

  return searchableTexts.some((text) => text.toLowerCase().includes(lowerQuery));
}

const PAGE_SIZE = 9;

export default function HomePage() {
  const { mode, toggleMode } = useColorMode();
  const { isAuthenticated, email, role } = useAuth();
  const navigate = useNavigate();
  const [lecturers, setLecturers] = useState<PublicLecturerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLecturer, setSelectedLecturer] = useState<PublicLecturerProfile | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const searchLecturers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await publicService.searchLecturers(
        searchQuery || undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );

      setLecturers(normalizeSearchResponse(response));

    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      setLecturers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    searchLecturers();
  }, [searchLecturers]);

  // Client-side filtering across all profile fields
  const filteredLecturers = useMemo(() => {
    const safeLecturers = Array.isArray(lecturers) ? lecturers : [];
    return safeLecturers.filter((lecturer) => matchesSearch(lecturer, searchQuery));
  }, [lecturers, searchQuery]);

  // Pagination
  const {
    paginatedItems: paginatedLecturers,
    currentPage,
    pageSize,
    totalItems,
    setCurrentPage,
    setPageSize,
  } = usePagination(filteredLecturers, PAGE_SIZE);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrentPage(1);
    searchLecturers();
  };

  const handleOpenProfile = (lecturer: PublicLecturerProfile) => {
    setSelectedLecturer(lecturer);
  };

  const handleCloseProfile = () => {
    setSelectedLecturer(null);
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          backgroundImage: 'none',
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, fontWeight: 700, textDecoration: 'none', color: 'inherit' }}
          >
            EduB
          </Typography>
          <Button component={Link} to="/" variant="text" sx={{ whiteSpace: 'nowrap' }}>
            Trang chủ
          </Button>
          <Button component={Link} to="/teachers" variant="text" sx={{ whiteSpace: 'nowrap' }}>
            Tìm giáo viên
          </Button>
          {!isAuthenticated ? (
            <>
              <IconButton
                onClick={toggleMode}
                aria-label={mode === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
                size="large"
                sx={{ p: 0.5 }}
              >
                {mode === 'light' ? '🌙' : '☀️'}
              </IconButton>
              <Button component={Link} to="/login" variant="outlined">Đăng nhập</Button>
              <Button component={Link} to="/register" variant="contained">Đăng ký</Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => navigate(role === Role.Admin ? '/admin/accounts' : '/lecturer/overview')}
                variant="text"
                sx={{ whiteSpace: 'nowrap' }}
              >
                Bảng điều khiển
              </Button>

              <IconButton
                onClick={toggleMode}
                aria-label={mode === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
                size="large"
                sx={{ p: 0.5 }}
              >
                {mode === 'light' ? '🌙' : '☀️'}
              </IconButton>

              <IconButton
                aria-label="Tài khoản"
                size="large"
                sx={{ p: 0.5 }}
              >
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>{email ? email.charAt(0).toUpperCase() : 'U'}</Avatar>
              </IconButton>

              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </Typography>

              <Button
                onClick={() => {
                  localStorage.removeItem('token');
                  navigate('/login', { replace: true });
                }}
                variant="outlined"
                color="error"
                sx={{ whiteSpace: 'nowrap' }}
              >
                Đăng xuất
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
        <Box
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 8,
            background: 'linear-gradient(140deg, #c48a10 0%, #e2b23a 100%)',
            color: '#fff',
            mb: 3,
          }}
        >
          <Typography variant="h2" sx={{ color: '#fff', mb: 0.5 }}>Tìm giáo viên phù hợp</Typography>
          <Typography sx={{ opacity: 0.86 }}>Khám phá giảng viên chất lượng với chuyên môn đúng nhu cầu học tập.</Typography>
        </Box>

        <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              fullWidth
              placeholder="Tìm theo tên, chuyên môn, địa điểm, kinh nghiệm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" variant="contained" sx={{ whiteSpace: 'nowrap', px: 4 }}>
              Tìm kiếm
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 3 }} />}

        {!loading && (
          <Typography variant="h6" sx={{ mb: 2 }}>
            {filteredLecturers.length} giáo viên được tìm thấy
          </Typography>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}>
          {paginatedLecturers.map((lecturer) => (
            <Box key={lecturer.id}>
              <LecturerCard lecturer={lecturer} onViewProfile={() => handleOpenProfile(lecturer)} />
            </Box>
          ))}
        </Box>

        {!loading && filteredLecturers.length === 0 && (
          <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', textAlign: 'center', mt: 2 }}>
            <CardContent>
              <Typography color="text.secondary">
                Không tìm thấy giáo viên nào phù hợp với tiêu chí tìm kiếm.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {!loading && filteredLecturers.length > 0 && (
          <Pagination
            totalItems={totalItems}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}

        {/* Teacher profile modal */}
        <Dialog open={Boolean(selectedLecturer)} onClose={handleCloseProfile} maxWidth="sm" fullWidth>
          <DialogTitle>Thông tin giáo viên</DialogTitle>
          <DialogContent dividers>
            {selectedLecturer && (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Avatar
                    src={selectedLecturer.avatarUrl || undefined}
                    sx={{ width: 56, height: 56, bgcolor: 'secondary.main' }}
                  >
                    <PersonRoundedIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{selectedLecturer.fullName}</Typography>
                  </Box>
                </Stack>

                {selectedLecturer.introduction && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Giới thiệu</Typography>
                    <Typography>{selectedLecturer.introduction}</Typography>
                  </Box>
                )}

                {selectedLecturer.teachingLocations.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.8 }}>Địa điểm giảng dạy</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedLecturer.teachingLocations.map((l) => (
                        <Chip key={`${selectedLecturer.id}-loc-${l.value}`} label={l.value} />
                      ))}
                    </Stack>
                  </Box>
                )}

                {selectedLecturer.expertises.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.8 }}>Chuyên môn</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedLecturer.expertises.map((e, index) => (
                        <Box key={`${selectedLecturer.id}-exp-${index}-${e.specialty}`}>
                          <Chip
                            color="primary"
                            variant="outlined"
                            label={e.degree ? `${e.specialty} (${e.degree})` : e.specialty}
                          />
                          {e.certificateImageUrl && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {e.certificateImageUrl.split('|').filter(Boolean).map((url, imgIdx) => (
                                <img key={`cert-${index}-${imgIdx}`} src={resolveImageUrl(url)} alt="" style={{ maxWidth: 200, borderRadius: 8, display: 'block', cursor: 'pointer' }} onClick={() => setExpandedImage(resolveImageUrl(url))} />
                              ))}
                            </div>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {selectedLecturer.experiences && selectedLecturer.experiences.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.8 }}>Kinh nghiệm</Typography>
                    <Stack spacing={0.5}>
                      {selectedLecturer.experiences.map((exp, index) => (
                        <Box key={`${selectedLecturer.id}-experience-${index}`}>
                          <Typography variant="body2">• {exp.description}</Typography>
                          {exp.imageUrl && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {exp.imageUrl.split('|').filter(Boolean).map((url, imgIdx) => (
                                <img key={`exp-${index}-${imgIdx}`} src={resolveImageUrl(url)} alt="" style={{ maxWidth: 200, borderRadius: 8, cursor: 'pointer' }} onClick={() => setExpandedImage(resolveImageUrl(url))} />
                              ))}
                            </div>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {selectedLecturer.teachingSkills && selectedLecturer.teachingSkills.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.8 }}>Kỹ năng giảng dạy</Typography>
                    <Stack spacing={0.5}>
                      {selectedLecturer.teachingSkills.map((skill, index) => (
                        <Box key={`${selectedLecturer.id}-skill-${index}`}>
                          <Typography variant="body2">• {skill.description}</Typography>
                          {skill.imageUrl && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {skill.imageUrl.split('|').filter(Boolean).map((url, imgIdx) => (
                                <img key={`skill-${index}-${imgIdx}`} src={resolveImageUrl(url)} alt="" style={{ maxWidth: 200, borderRadius: 8, cursor: 'pointer' }} onClick={() => setExpandedImage(resolveImageUrl(url))} />
                              ))}
                            </div>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {selectedLecturer.notes && selectedLecturer.notes.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.8 }}>Ghi chú</Typography>
                    <Stack spacing={0.5}>
                      {selectedLecturer.notes.map((note, index) => (
                        <Typography key={`${selectedLecturer.id}-note-${index}`} variant="body2">
                          • {note.content}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
          </DialogContent>
        </Dialog>
        {/* Image lightbox */}
        <Dialog open={Boolean(expandedImage)} onClose={() => setExpandedImage(null)} maxWidth="md">
          <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {expandedImage && (
              <img src={expandedImage} alt="" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }} />
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
}

interface LecturerCardProps {
  lecturer: PublicLecturerProfile;
  onViewProfile: () => void;
}

function LecturerCard({ lecturer, onViewProfile }: LecturerCardProps) {
  const locationText = lecturer.teachingLocations.map((l) => l.value).join(', ');

  return (
    <Card elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1.2 }}>
        <Stack direction="row" spacing={1.4} sx={{ mb: 1.3, alignItems: 'center' }}>
          <Avatar src={lecturer.avatarUrl || undefined} sx={{ width: 48, height: 48, bgcolor: 'secondary.main' }}>
            <PersonRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{lecturer.fullName}</Typography>
          </Box>
        </Stack>

        {lecturer.introduction && (
          <Typography
            color="text.secondary"
            sx={{
              mb: 1.2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {lecturer.introduction}
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary">ĐỊA ĐIỂM</Typography>
        <Typography variant="body2" sx={{ mb: 1.2 }}>{locationText || 'Chưa cập nhật'}</Typography>

        <Typography variant="caption" color="text.secondary">CHUYÊN MÔN</Typography>
        <Typography variant="body2">
          {lecturer.expertises.map((e) => (e.degree ? `${e.specialty} (${e.degree})` : e.specialty)).join(', ') || 'Chưa cập nhật'}
        </Typography>
      </CardContent>

      <CardActions sx={{ mt: 'auto', pt: 0, px: 2, pb: 2 }}>
        <Button variant="contained" fullWidth onClick={onViewProfile}>Xem hồ sơ</Button>
      </CardActions>
    </Card>
  );
}
