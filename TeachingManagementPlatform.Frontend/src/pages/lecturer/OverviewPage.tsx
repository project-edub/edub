import { useState, useEffect, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import { AxiosError } from 'axios';
import { Image, Trash2 } from 'lucide-react';
import * as profileService from '../../services/profileService';
import AlertModal from '../../components/common/AlertModal';

type LecturerProfile = Awaited<ReturnType<typeof profileService.getProfile>>;
type UpdateProfileRequest = Parameters<typeof profileService.updateProfile>[0];
type ProfileExpertise = NonNullable<LecturerProfile['expertises']>[number];
type ProfileExperience = NonNullable<LecturerProfile['experiences']>[number];
type ProfileTeachingSkill = NonNullable<LecturerProfile['teachingSkills']>[number];

type ExpertiseRow = { specialty: string; degree: string; certificateImageUrls: string[]; sortOrder: number };
type ExperienceRow = { description: string; imageUrls: string[]; sortOrder: number };
type SkillRow = { description: string; imageUrls: string[]; sortOrder: number };
type NoteRow = { content: string; sortOrder: number };

function toExpertiseRows(items: ProfileExpertise[]): ExpertiseRow[] {
  return items.map((e) => ({ specialty: e.specialty, degree: e.degree, certificateImageUrls: e.certificateImageUrl ? e.certificateImageUrl.split('|').filter(Boolean) : [], sortOrder: e.sortOrder }));
}
function toExperienceRows(items: ProfileExperience[]): ExperienceRow[] {
  return items.map((e) => ({ description: e.description, imageUrls: e.imageUrl ? e.imageUrl.split('|').filter(Boolean) : [], sortOrder: e.sortOrder }));
}
function toSkillRows(items: ProfileTeachingSkill[]): SkillRow[] {
  return items.map((e) => ({ description: e.description, imageUrls: e.imageUrl ? e.imageUrl.split('|').filter(Boolean) : [], sortOrder: e.sortOrder }));
}

export default function OverviewPage() {
  const [profile, setProfile] = useState<LecturerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Editable state
  const [fullName, setFullName] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [location, setLocation] = useState('');
  const [expertises, setExpertises] = useState<ExpertiseRow[]>([]);
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      setError(axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  function startEditing() {
    if (!profile) return;
    setFullName(profile.fullName);
    setIntroduction(profile.introduction || '');
    setLocation(profile.teachingLocations.length > 0 ? profile.teachingLocations.map((l) => l.value).join(', ') : '');
    setExpertises(profile.expertises.length > 0 ? toExpertiseRows(profile.expertises) : [{ specialty: '', degree: '', certificateImageUrls: [], sortOrder: 0 }]);
    setExperiences(profile.experiences.length > 0 ? toExperienceRows(profile.experiences) : [{ description: '', imageUrls: [], sortOrder: 0 }]);
    setSkills(profile.teachingSkills.length > 0 ? toSkillRows(profile.teachingSkills) : [{ description: '', imageUrls: [], sortOrder: 0 }]);
    setNotes(profile.notes.length > 0 ? profile.notes.map((n) => ({ content: n.content, sortOrder: n.sortOrder })) : [{ content: '', sortOrder: 0 }]);
    setEditError('');
    setEditing(true);
  }

  function cancelEditing() { setEditing(false); setEditError(''); }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      await profileService.uploadAvatar(file);
      await loadProfile();
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      setEditError(axiosErr.response?.data?.error?.message || 'Lỗi tải ảnh đại diện.');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  async function handleExpertiseImageUpload(files: FileList, idx: number) {
    try {
      const uploadPromises = Array.from(files).map((f) => profileService.uploadProfileImage(f));
      const imageUrls = await Promise.all(uploadPromises);
      setExpertises((prev) => {
        const u = [...prev];
        u[idx] = { ...u[idx], certificateImageUrls: [...u[idx].certificateImageUrls, ...imageUrls] };
        return u;
      });
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      setEditError(axiosErr.response?.data?.error?.message || 'Lỗi tải ảnh.');
    }
  }

  async function handleExperienceImageUpload(files: FileList, idx: number) {
    try {
      const uploadPromises = Array.from(files).map((f) => profileService.uploadProfileImage(f));
      const imageUrls = await Promise.all(uploadPromises);
      setExperiences((prev) => {
        const u = [...prev];
        u[idx] = { ...u[idx], imageUrls: [...u[idx].imageUrls, ...imageUrls] };
        return u;
      });
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      setEditError(axiosErr.response?.data?.error?.message || 'Lỗi tải ảnh.');
    }
  }

  async function handleSkillImageUpload(files: FileList, idx: number) {
    try {
      const uploadPromises = Array.from(files).map((f) => profileService.uploadProfileImage(f));
      const imageUrls = await Promise.all(uploadPromises);
      setSkills((prev) => {
        const u = [...prev];
        u[idx] = { ...u[idx], imageUrls: [...u[idx].imageUrls, ...imageUrls] };
        return u;
      });
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      setEditError(axiosErr.response?.data?.error?.message || 'Lỗi tải ảnh.');
    }
  }

  async function handleSave() {
    setSaving(true);
    setEditError('');

    // Validate: entries with images must have a description
    const invalidExperience = experiences.find((e) => e.imageUrls.length > 0 && !e.description.trim());
    if (invalidExperience) {
      setAlertMessage('Vui lòng nhập mô tả cho tất cả mục Kinh nghiệm có ảnh.');
      setSaving(false);
      return;
    }
    const invalidSkill = skills.find((s) => s.imageUrls.length > 0 && !s.description.trim());
    if (invalidSkill) {
      setAlertMessage('Vui lòng nhập mô tả cho tất cả mục Kỹ năng có ảnh.');
      setSaving(false);
      return;
    }
    const invalidExpertise = expertises.find((e) => e.certificateImageUrls.length > 0 && !e.specialty.trim() && !e.degree.trim());
    if (invalidExpertise) {
      setAlertMessage('Vui lòng nhập chuyên ngành hoặc bằng cấp cho tất cả mục Chuyên môn có ảnh.');
      setSaving(false);
      return;
    }

    const data: UpdateProfileRequest = {
      fullName: fullName.trim(),
      introduction: introduction.trim() || null,
      teachingLocations: location.trim() ? [{ value: location.trim(), sortOrder: 0 }] : [],
      expertises: expertises.filter((e) => e.specialty.trim() || e.degree.trim()).map((e, i) => ({ specialty: e.specialty.trim(), degree: e.degree.trim(), certificateImageUrl: e.certificateImageUrls.filter(Boolean).join('|') || null, sortOrder: i })),
      experiences: experiences.filter((e) => e.description.trim()).map((e, i) => ({ description: e.description.trim(), imageUrl: e.imageUrls.filter(Boolean).join('|') || null, sortOrder: i })),
      teachingSkills: skills.filter((s) => s.description.trim()).map((s, i) => ({ description: s.description.trim(), imageUrl: s.imageUrls.filter(Boolean).join('|') || null, sortOrder: i })),
      notes: notes.filter((n) => n.content.trim()).map((n, i) => ({ content: n.content.trim(), sortOrder: i })),
    };
    try {
      await profileService.updateProfile(data);
      setEditing(false);
      await loadProfile();
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      setEditError(axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setSaving(false);
    }
  }

  // Helpers

  if (loading) return <Box sx={{ p: { xs: 1.5, md: 2 } }}>Đang tải...</Box>;
  if (error) return <Box sx={{ p: { xs: 1.5, md: 2 } }}><Box role="alert" sx={{ color: '#d32f2f' }}>{error}</Box></Box>;
  if (!profile) return null;

  const avatarSrc = profile.avatarUrl ? profileService.getImageUrl(profile.avatarUrl) : null;

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 2 },
        maxHeight: 'calc(100vh - 220px)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'center',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 3,
          position: 'relative',
        }}
      >
        <Box component="h1" sx={{ color: 'var(--edub-text-primary)', m: 0, textAlign: { xs: 'left', md: 'center' } }}>
          Thông tin cá nhân
        </Box>
        <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' }, position: { md: 'absolute' }, right: { md: 0 } }}>
        {!editing ? (
          <button type="button" className="btn btn-update" onClick={startEditing} style={{ minHeight: 44, width: '100%' }}>Chỉnh sửa</button>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, width: '100%' }}>
            <button type="button" className="btn btn-cancel" onClick={cancelEditing} disabled={saving} style={{ minHeight: 44, flex: 1 }}>Hủy</button>
            <button type="button" className="btn btn-save" onClick={handleSave} disabled={saving || !fullName.trim()} style={{ minHeight: 44, flex: 1 }}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </Box>
        )}
        </Box>
      </Box>
      {editError && <div role="alert" style={{ color: '#d32f2f', marginBottom: 12 }}>{editError}</div>}

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', border: '2px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', marginBottom: 8 }}>
          {avatarSrc ? (
            <img src={avatarSrc} alt="Ảnh đại diện" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 48, color: '#999' }}>👤</span>
          )}
        </div>
        {editing && (
          <>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            <button type="button" className="btn btn-update" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} style={{ minHeight: 44 }}>
              {uploadingAvatar ? 'Đang tải...' : 'Đổi ảnh đại diện'}
            </button>
          </>
        )}
      </div>

      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          mb: 2.5,
          '& tr': {
            display: { xs: 'block', md: 'table-row' },
            mb: { xs: 2, md: 0 },
            borderBottom: { xs: '1px solid var(--edub-border)', md: 'none' },
            pb: { xs: 2, md: 0 },
          },
          '& th': {
            display: { xs: 'block', md: 'table-cell' },
            width: { xs: '100%', md: '25%' },
            p: { xs: '0 0 8px', md: '12px 16px' },
            textAlign: 'left',
            verticalAlign: 'top',
            borderBottom: { md: '1px solid var(--edub-border)' },
            color: 'var(--edub-text-primary)',
            fontSize: { xs: 16, md: 20 },
            fontWeight: 700,
          },
          '& td': {
            display: { xs: 'block', md: 'table-cell' },
            width: { xs: '100%', md: '75%' },
            p: { xs: 0, md: '12px 16px' },
            verticalAlign: 'top',
            borderBottom: { md: '1px solid var(--edub-border)' },
            color: 'var(--edub-text-primary)',
          },
        }}
      >
        <tbody>
          {/* Họ và tên */}
          <Section label="Họ và tên">
            {editing ? <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} /> : <p style={plainTextStyle}>{profile.fullName}</p>}
          </Section>

          {/* Giới thiệu */}
          <Section label="Giới thiệu">
            {editing ? <textarea value={introduction} onChange={(e) => setIntroduction(e.target.value)} style={{ ...inputStyle, minHeight: 60, fontFamily: 'inherit', fontSize: 'inherit' }} /> : <p style={plainTextStyle}>{profile.introduction || '—'}</p>}
          </Section>



          {/* Nơi giảng dạy */}
          <Section label="Nơi giảng dạy">
            {editing ? (
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} placeholder="Nhập nơi giảng dạy" />
            ) : profile.teachingLocations.length > 0 ? (
              <p style={plainTextStyle}>{profile.teachingLocations.map((l) => l.value).join(', ')}</p>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>

          {/* Chuyên môn */}
          <Section label="Chuyên môn">
            {editing ? (
              <>
                {expertises.map((ex, i) => (
                  <div key={`expertise-${i}`} style={{ marginBottom: 8, padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, mb: 0.5 }}>
                      <input type="text" value={ex.specialty} onChange={(e) => { const u = [...expertises]; u[i] = { ...u[i], specialty: e.target.value }; setExpertises(u); }} style={{ ...inputStyle, flex: 1 }} placeholder="Chuyên ngành" />
                      <input type="text" value={ex.degree} onChange={(e) => { const u = [...expertises]; u[i] = { ...u[i], degree: e.target.value }; setExpertises(u); }} style={{ ...inputStyle, flex: 1 }} placeholder="Bằng cấp" />
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} title="Thêm ảnh">
                        <Image size={20} />
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { const files = e.target.files; if (files && files.length > 0) handleExpertiseImageUpload(files, i); }} />
                      </label>
                      <button type="button" onClick={() => { if (expertises.length > 1) setExpertises(expertises.filter((_, j) => j !== i)); }} disabled={expertises.length <= 1} style={{ background: 'none', border: 'none', cursor: expertises.length <= 1 ? 'not-allowed' : 'pointer', opacity: expertises.length <= 1 ? 0.4 : 1, display: 'inline-flex', alignItems: 'center' }} title="Xóa">
                        <Trash2 size={20} />
                      </button>
                    </Box>
                    {ex.certificateImageUrls.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {ex.certificateImageUrls.map((url, imgIdx) => (
                          <div key={`exp-img-${i}-${imgIdx}`} style={{ position: 'relative', display: 'inline-block' }}>
                            <img src={profileService.getImageUrl(url)} alt={`Chứng chỉ ${imgIdx + 1}`} style={{ ...thumbStyle, cursor: 'pointer' }} onClick={() => setExpandedImage(profileService.getImageUrl(url))} />
                            <button type="button" onClick={() => { const u = [...expertises]; u[i] = { ...u[i], certificateImageUrls: u[i].certificateImageUrls.filter((_, k) => k !== imgIdx) }; setExpertises(u); }} style={imgRemoveBtn} title="Xóa ảnh">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-add" onClick={() => setExpertises([...expertises, { specialty: '', degree: '', certificateImageUrls: [], sortOrder: expertises.length }])} style={addBtn}>+ Thêm chuyên môn</button>
              </>
            ) : profile.expertises.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>Chuyên ngành</th><th style={thStyle}>Bằng cấp</th><th style={thStyle}>Ảnh đính kèm</th></tr></thead>
                <tbody>{profile.expertises.map((e, i) => (
                  <tr key={`${e.id}-${i}`}><td style={tdStyle}>{e.specialty}</td><td style={tdStyle}>{e.degree}</td><td style={tdStyle}>{e.certificateImageUrl ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {e.certificateImageUrl.split('|').filter(Boolean).map((url, imgIdx) => (
                        <img key={`cert-view-${i}-${imgIdx}`} src={profileService.getImageUrl(url)} alt="Chứng chỉ" style={{ maxWidth: 120, maxHeight: 80, cursor: 'pointer', borderRadius: 4 }} onClick={() => setExpandedImage(profileService.getImageUrl(url))} />
                      ))}
                    </div>
                  ) : '—'}</td></tr>
                ))}</tbody>
              </table>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>

          {/* Kinh nghiệm */}
          <Section label="Kinh nghiệm">
            {editing ? (
              <>
                {experiences.map((ex, i) => (
                  <div key={`experience-${i}`} style={{ marginBottom: 8 }}>
                    <div style={rowStyle}>
                      <input type="text" value={ex.description} onChange={(e) => { const u = [...experiences]; u[i] = { ...u[i], description: e.target.value }; setExperiences(u); }} style={{ ...inputStyle, flex: 1 }} placeholder="Mô tả kinh nghiệm" />
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} title="Thêm ảnh">
                        <Image size={20} />
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { const files = e.target.files; if (files && files.length > 0) handleExperienceImageUpload(files, i); }} />
                      </label>
                      <button type="button" onClick={() => { if (experiences.length > 1) setExperiences(experiences.filter((_, j) => j !== i)); }} disabled={experiences.length <= 1} style={{ background: 'none', border: 'none', cursor: experiences.length <= 1 ? 'not-allowed' : 'pointer', opacity: experiences.length <= 1 ? 0.4 : 1, display: 'inline-flex', alignItems: 'center' }} title="Xóa">
                        <Trash2 size={20} />
                      </button>
                    </div>
                    {ex.imageUrls.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {ex.imageUrls.map((url, imgIdx) => (
                          <div key={`expr-img-${i}-${imgIdx}`} style={{ position: 'relative', display: 'inline-block' }}>
                            <img src={profileService.getImageUrl(url)} alt={`Kinh nghiệm ${imgIdx + 1}`} style={{ ...thumbStyle, cursor: 'pointer' }} onClick={() => setExpandedImage(profileService.getImageUrl(url))} />
                            <button type="button" onClick={() => { const u = [...experiences]; u[i] = { ...u[i], imageUrls: u[i].imageUrls.filter((_, k) => k !== imgIdx) }; setExperiences(u); }} style={imgRemoveBtn} title="Xóa ảnh">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setExperiences([...experiences, { description: '', imageUrls: [], sortOrder: experiences.length }])} style={addBtn}>+ Thêm kinh nghiệm</button>
              </>
            ) : profile.experiences.length > 0 ? (
              <div>{profile.experiences.map((e, i) => (
                <div key={`${e.id}-${i}`} style={{ marginBottom: 8, padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
                  <p style={plainTextStyle}>{e.description}</p>
                  {e.imageUrl && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {e.imageUrl.split('|').filter(Boolean).map((url, imgIdx) => (
                        <img key={`exp-view-${i}-${imgIdx}`} src={profileService.getImageUrl(url)} alt="Kinh nghiệm" style={{ maxWidth: 200, maxHeight: 120, cursor: 'pointer', borderRadius: 4 }} onClick={() => setExpandedImage(profileService.getImageUrl(url))} />
                      ))}
                    </div>
                  )}
                </div>
              ))}</div>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>

          {/* Kỹ năng giảng dạy */}
          <Section label="Kỹ năng">
            {editing ? (
              <>
                {skills.map((s, i) => (
                  <div key={`skill-${i}`} style={{ marginBottom: 8 }}>
                    <div style={rowStyle}>
                      <input type="text" value={s.description} onChange={(e) => { const u = [...skills]; u[i] = { ...u[i], description: e.target.value }; setSkills(u); }} style={{ ...inputStyle, flex: 1 }} placeholder="Mô tả kỹ năng" />
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} title="Thêm ảnh">
                        <Image size={20} />
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { const files = e.target.files; if (files && files.length > 0) handleSkillImageUpload(files, i); }} />
                      </label>
                      <button type="button" onClick={() => { if (skills.length > 1) setSkills(skills.filter((_, j) => j !== i)); }} disabled={skills.length <= 1} style={{ background: 'none', border: 'none', cursor: skills.length <= 1 ? 'not-allowed' : 'pointer', opacity: skills.length <= 1 ? 0.4 : 1, display: 'inline-flex', alignItems: 'center' }} title="Xóa">
                        <Trash2 size={20} />
                      </button>
                    </div>
                    {s.imageUrls.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {s.imageUrls.map((url, imgIdx) => (
                          <div key={`skill-img-${i}-${imgIdx}`} style={{ position: 'relative', display: 'inline-block' }}>
                            <img src={profileService.getImageUrl(url)} alt={`Kỹ năng ${imgIdx + 1}`} style={{ ...thumbStyle, cursor: 'pointer' }} onClick={() => setExpandedImage(profileService.getImageUrl(url))} />
                            <button type="button" onClick={() => { const u = [...skills]; u[i] = { ...u[i], imageUrls: u[i].imageUrls.filter((_, k) => k !== imgIdx) }; setSkills(u); }} style={imgRemoveBtn} title="Xóa ảnh">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setSkills([...skills, { description: '', imageUrls: [], sortOrder: skills.length }])} style={addBtn}>+ Thêm kỹ năng</button>
              </>
            ) : profile.teachingSkills.length > 0 ? (
              <div>{profile.teachingSkills.map((s, i) => (
                <div key={`${s.id}-${i}`} style={{ marginBottom: 8, padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
                  <p style={plainTextStyle}>{s.description}</p>
                  {s.imageUrl && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {s.imageUrl.split('|').filter(Boolean).map((url, imgIdx) => (
                        <img key={`skill-view-${i}-${imgIdx}`} src={profileService.getImageUrl(url)} alt="Kỹ năng" style={{ maxWidth: 200, maxHeight: 120, cursor: 'pointer', borderRadius: 4 }} onClick={() => setExpandedImage(profileService.getImageUrl(url))} />
                      ))}
                    </div>
                  )}
                </div>
              ))}</div>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>



          {/* Ghi chú */}
          <Section label="Ghi chú">
            {editing ? (
              <>
                {notes.map((n, i) => (
                  <div key={`${n.sortOrder}-${n.content || ''}-${i}`} style={rowStyle}>
                    <input type="text" value={n.content} onChange={(e) => { const u = [...notes]; u[i] = { ...u[i], content: e.target.value }; setNotes(u); }} style={{ ...inputStyle, flex: 1 }} placeholder="Nhập ghi chú" />
                    <button type="button" onClick={() => { if (notes.length > 1) setNotes(notes.filter((_, j) => j !== i)); }} disabled={notes.length <= 1} style={notes.length <= 1 ? delBtnDisabled : delBtn}>Xóa</button>
                  </div>
                ))}
                <button type="button" onClick={() => setNotes([...notes, { content: '', sortOrder: notes.length }])} style={addBtn}>+ Thêm ghi chú</button>
              </>
            ) : profile.notes.length > 0 ? (
              <ul style={listStyle}>{profile.notes.map((n, i) => <li key={`${n.id}-${n.content || ''}-${i}`}>{n.content}</li>)}</ul>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>
        </tbody>
        </Box>

      {/* Image lightbox */}
      {expandedImage && (
        <div style={lightboxOverlay} onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="" style={lightboxImg} />
        </div>
      )}

      <AlertModal open={!!alertMessage} message={alertMessage || ''} onClose={() => setAlertMessage(null)} />
    </Box>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{children}</td>
    </tr>
  );
}

const plainTextStyle: React.CSSProperties = { margin: 0 };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', color: 'var(--edub-text-secondary)' };
const tdStyle: React.CSSProperties = { padding: '12px 16px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: 8, boxSizing: 'border-box', backgroundColor: 'var(--edub-input-bg)', border: '1px solid var(--edub-input-border)', color: 'var(--edub-text-primary)', borderRadius: 8};
const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' };
const listStyle: React.CSSProperties = { margin: 0, paddingLeft: 20 };
const addBtn: React.CSSProperties = { padding: '4px 12px', cursor: 'pointer', marginTop: 4, backgroundColor: '#2e7d32', color: '#fff', border: '1px solid #2e7d32', borderRadius: 8, minHeight: 44 };
const delBtn: React.CSSProperties = { padding: '4px 10px', cursor: 'pointer', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, minHeight: 44 };
const delBtnDisabled: React.CSSProperties = { ...delBtn, backgroundColor: '#9ca3af', cursor: 'not-allowed' };
const imgRemoveBtn: React.CSSProperties = { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: '20px', textAlign: 'center', padding: 0 };
const thumbStyle: React.CSSProperties = { maxWidth: 80, maxHeight: 60, borderRadius: 4, objectFit: 'cover' };
const lightboxOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer' };
const lightboxImg: React.CSSProperties = { maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' };
