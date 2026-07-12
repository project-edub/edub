import { useState, useEffect, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import { AxiosError } from 'axios';
import * as profileService from '../../services/profileService';

type LecturerProfile = Awaited<ReturnType<typeof profileService.getProfile>>;
type UpdateProfileRequest = Parameters<typeof profileService.updateProfile>[0];
type ProfileExpertise = NonNullable<LecturerProfile['expertises']>[number];
type ProfileExperience = NonNullable<LecturerProfile['experiences']>[number];
type ProfileTeachingSkill = NonNullable<LecturerProfile['teachingSkills']>[number];

type ExpertiseRow = { specialty: string; degree: string; certificateImageUrl: string; sortOrder: number };
type ExperienceRow = { description: string; imageUrl: string; sortOrder: number };
type SkillRow = { description: string; imageUrl: string; sortOrder: number };
type SimpleRow = { value: string; sortOrder: number };
type FeeRow = { description: string; sortOrder: number };
type NoteRow = { content: string; sortOrder: number };

function toExpertiseRows(items: ProfileExpertise[]): ExpertiseRow[] {
  return items.map((e) => ({ specialty: e.specialty, degree: e.degree, certificateImageUrl: e.certificateImageUrl || '', sortOrder: e.sortOrder }));
}
function toExperienceRows(items: ProfileExperience[]): ExperienceRow[] {
  return items.map((e) => ({ description: e.description, imageUrl: e.imageUrl || '', sortOrder: e.sortOrder }));
}
function toSkillRows(items: ProfileTeachingSkill[]): SkillRow[] {
  return items.map((e) => ({ description: e.description, imageUrl: e.imageUrl || '', sortOrder: e.sortOrder }));
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

  // Editable state
  const [fullName, setFullName] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [occupations, setOccupations] = useState<SimpleRow[]>([]);
  const [locations, setLocations] = useState<SimpleRow[]>([]);
  const [expertises, setExpertises] = useState<ExpertiseRow[]>([]);
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
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
    setOccupations(profile.occupations.length > 0 ? profile.occupations.map((o) => ({ value: o.value, sortOrder: o.sortOrder })) : [{ value: '', sortOrder: 0 }]);
    setLocations(profile.teachingLocations.length > 0 ? profile.teachingLocations.map((l) => ({ value: l.value, sortOrder: l.sortOrder })) : [{ value: '', sortOrder: 0 }]);
    setExpertises(profile.expertises.length > 0 ? toExpertiseRows(profile.expertises) : [{ specialty: '', degree: '', certificateImageUrl: '', sortOrder: 0 }]);
    setExperiences(profile.experiences.length > 0 ? toExperienceRows(profile.experiences) : [{ description: '', imageUrl: '', sortOrder: 0 }]);
    setSkills(profile.teachingSkills.length > 0 ? toSkillRows(profile.teachingSkills) : [{ description: '', imageUrl: '', sortOrder: 0 }]);
    setFees(profile.tuitionFees.length > 0 ? profile.tuitionFees.map((f) => ({ description: f.description, sortOrder: f.sortOrder })) : [{ description: '', sortOrder: 0 }]);
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

  async function handleExpertiseImageUpload(file: File, idx: number) {
    try {
      const imageUrl = await profileService.uploadProfileImage(file);
      const u = [...expertises]; u[idx] = { ...u[idx], certificateImageUrl: imageUrl }; setExpertises(u);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      setEditError(axiosErr.response?.data?.error?.message || 'Lỗi tải ảnh.');
    }
  }

  async function handleExperienceImageUpload(file: File, idx: number) {
    try {
      const imageUrl = await profileService.uploadProfileImage(file);
      const u = [...experiences]; u[idx] = { ...u[idx], imageUrl }; setExperiences(u);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      setEditError(axiosErr.response?.data?.error?.message || 'Lỗi tải ảnh.');
    }
  }

  async function handleSkillImageUpload(file: File, idx: number) {
    try {
      const imageUrl = await profileService.uploadProfileImage(file);
      const u = [...skills]; u[idx] = { ...u[idx], imageUrl }; setSkills(u);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      setEditError(axiosErr.response?.data?.error?.message || 'Lỗi tải ảnh.');
    }
  }

  async function handleSave() {
    setSaving(true);
    setEditError('');
    const data: UpdateProfileRequest = {
      fullName: fullName.trim(),
      introduction: introduction.trim() || null,
      occupations: occupations.filter((o) => o.value.trim()).map((o, i) => ({ value: o.value.trim(), sortOrder: i })),
      teachingLocations: locations.filter((l) => l.value.trim()).map((l, i) => ({ value: l.value.trim(), sortOrder: i })),
      expertises: expertises.filter((e) => e.specialty.trim() || e.degree.trim()).map((e, i) => ({ specialty: e.specialty.trim(), degree: e.degree.trim(), certificateImageUrl: e.certificateImageUrl.trim() || null, sortOrder: i })),
      experiences: experiences.filter((e) => e.description.trim()).map((e, i) => ({ description: e.description.trim(), imageUrl: e.imageUrl.trim() || null, sortOrder: i })),
      teachingSkills: skills.filter((s) => s.description.trim()).map((s, i) => ({ description: s.description.trim(), imageUrl: s.imageUrl.trim() || null, sortOrder: i })),
      tuitionFees: fees.filter((f) => f.description.trim()).map((f, i) => ({ description: f.description.trim(), sortOrder: i })),
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
  function updateSimpleRow(setter: React.Dispatch<React.SetStateAction<SimpleRow[]>>, list: SimpleRow[], idx: number, value: string) {
    const u = [...list]; u[idx] = { ...u[idx], value }; setter(u);
  }
  function addSimpleRow(setter: React.Dispatch<React.SetStateAction<SimpleRow[]>>, list: SimpleRow[]) {
    setter([...list, { value: '', sortOrder: list.length }]);
  }
  function removeSimpleRow(setter: React.Dispatch<React.SetStateAction<SimpleRow[]>>, list: SimpleRow[], idx: number) {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== idx));
  }

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

          {/* Nghề nghiệp */}
          <Section label="Nghề nghiệp hiện tại">
            {editing ? (
              <>
                {occupations.map((o, i) => (
                  <div key={`occupation-${i}`} style={rowStyle}>
                    <input type="text" value={o.value} onChange={(e) => updateSimpleRow(setOccupations, occupations, i, e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Nhập nghề nghiệp" />
                    <button type="button" className="btn btn-delete" onClick={() => removeSimpleRow(setOccupations, occupations, i)} disabled={occupations.length <= 1} style={occupations.length <= 1 ? delBtnDisabled : delBtn}>Xóa</button>
                  </div>
                ))}
                <button type="button" className="btn btn-add" onClick={() => addSimpleRow(setOccupations, occupations)}>+ Thêm</button>
              </>
            ) : profile.occupations.length > 0 ? (
              <ul style={listStyle}>{profile.occupations.map((o, i) => <li key={`${o.id}-${o.value || ''}-${i}`}>{o.value}</li>)}</ul>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>

          {/* Nơi giảng dạy */}
          <Section label="Nơi giảng dạy">
            {editing ? (
              <>
                {locations.map((l, i) => (
                  <div key={`location-${i}`} style={rowStyle}>
                    <input type="text" value={l.value} onChange={(e) => updateSimpleRow(setLocations, locations, i, e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Nhập nơi giảng dạy" />
                    <button type="button" onClick={() => removeSimpleRow(setLocations, locations, i)} disabled={locations.length <= 1} style={locations.length <= 1 ? delBtnDisabled : delBtn}>Xóa</button>
                  </div>
                ))}
                <button type="button" className="btn btn-add" onClick={() => addSimpleRow(setLocations, locations)} style={addBtn}>+ Thêm</button>
              </>
            ) : profile.teachingLocations.length > 0 ? (
              <ul style={listStyle}>{profile.teachingLocations.map((l, i) => <li key={`${l.id}-${l.value || ''}-${i}`}>{l.value}</li>)}</ul>
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
                    </Box>
                    <div style={rowStyle}>
                      <label style={fileLabelStyle}>
                        Chọn ảnh chứng chỉ
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExpertiseImageUpload(f, i); }} />
                      </label>
                      {ex.certificateImageUrl && <img src={profileService.getImageUrl(ex.certificateImageUrl)} alt="Chứng chỉ" style={thumbStyle} />}
                      <button type="button" onClick={() => { if (expertises.length > 1) setExpertises(expertises.filter((_, j) => j !== i)); }} disabled={expertises.length <= 1} style={expertises.length <= 1 ? delBtnDisabled : delBtn}>Xóa</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-add" onClick={() => setExpertises([...expertises, { specialty: '', degree: '', certificateImageUrl: '', sortOrder: expertises.length }])} style={addBtn}>+ Thêm chuyên môn</button>
              </>
            ) : profile.expertises.length > 0 ? (
              <>
                <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                  {profile.expertises.map((e, i) => (
                    <Box key={`${e.id}-${i}-mobile`} sx={{ p: 1.5, border: '1px solid #eee', borderRadius: 1 }}>
                      <Box sx={{ mb: 1 }}>
                        <Box component="span" sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>Chuyên ngành: </Box>
                        {e.specialty}
                      </Box>
                      <Box sx={{ mb: 1 }}>
                        <Box component="span" sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>Bằng cấp: </Box>
                        {e.degree}
                      </Box>
                      {e.certificateImageUrl ? (
                        <img src={profileService.getImageUrl(e.certificateImageUrl)} alt="Chứng chỉ" style={{ maxWidth: '100%', maxHeight: 80 }} />
                      ) : (
                        <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>
                      )}
                    </Box>
                  ))}
                </Box>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    display: { xs: 'none', md: 'table' },
                  }}
                >
                  <Box component="thead">
                    <Box component="tr">
                      <Box component="th" sx={{ textAlign: 'left', p: '8px 12px', borderBottom: '2px solid var(--edub-border)' }}>Chuyên ngành</Box>
                      <Box component="th" sx={{ textAlign: 'left', p: '8px 12px', borderBottom: '2px solid var(--edub-border)' }}>Bằng cấp</Box>
                      <Box component="th" sx={{ textAlign: 'left', p: '8px 12px', borderBottom: '2px solid var(--edub-border)' }}>Ảnh đính kèm</Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {profile.expertises.map((e, i) => (
                      <Box component="tr" key={`${e.id}-${i}`}>
                        <Box component="td" sx={{ p: '8px 12px', borderBottom: '1px solid var(--edub-border)' }}>{e.specialty}</Box>
                        <Box component="td" sx={{ p: '8px 12px', borderBottom: '1px solid var(--edub-border)' }}>{e.degree}</Box>
                        <Box component="td" sx={{ p: '8px 12px', borderBottom: '1px solid var(--edub-border)' }}>
                          {e.certificateImageUrl ? <img src={profileService.getImageUrl(e.certificateImageUrl)} alt="Chứng chỉ" style={{ maxWidth: 120, maxHeight: 80 }} /> : '—'}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>

          {/* Kinh nghiệm */}
          <Section label="Kinh nghiệm">
            {editing ? (
              <>
                {experiences.map((ex, i) => (
                  <div key={`experience-${i}`} style={{ marginBottom: 8, padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
                    <input type="text" value={ex.description} onChange={(e) => { const u = [...experiences]; u[i] = { ...u[i], description: e.target.value }; setExperiences(u); }} style={{ ...inputStyle, marginBottom: 4 }} placeholder="Mô tả kinh nghiệm" />
                    <div style={rowStyle}>
                      <label style={fileLabelStyle}>
                        Chọn ảnh
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExperienceImageUpload(f, i); }} />
                      </label>
                      {ex.imageUrl && <img src={profileService.getImageUrl(ex.imageUrl)} alt="Kinh nghiệm" style={thumbStyle} />}
                      <button type="button" onClick={() => { if (experiences.length > 1) setExperiences(experiences.filter((_, j) => j !== i)); }} disabled={experiences.length <= 1} style={experiences.length <= 1 ? delBtnDisabled : delBtn}>Xóa</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setExperiences([...experiences, { description: '', imageUrl: '', sortOrder: experiences.length }])} style={addBtn}>+ Thêm kinh nghiệm</button>
              </>
            ) : profile.experiences.length > 0 ? (
              <div>{profile.experiences.map((e, i) => (
                <div key={`${e.id}-${i}`} style={{ marginBottom: 8, padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
                  <p style={plainTextStyle}>{e.description}</p>
                  {e.imageUrl && <img src={profileService.getImageUrl(e.imageUrl)} alt="Kinh nghiệm" style={{ maxWidth: 200, maxHeight: 120, marginTop: 4 }} />}
                </div>
              ))}</div>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>

          {/* Kỹ năng giảng dạy */}
          <Section label="Kỹ năng giảng dạy khác">
            {editing ? (
              <>
                {skills.map((s, i) => (
                  <div key={`skill-${i}`} style={{ marginBottom: 8, padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
                    <input type="text" value={s.description} onChange={(e) => { const u = [...skills]; u[i] = { ...u[i], description: e.target.value }; setSkills(u); }} style={{ ...inputStyle, marginBottom: 4 }} placeholder="Mô tả kỹ năng" />
                    <div style={rowStyle}>
                      <label style={fileLabelStyle}>
                        Chọn ảnh
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSkillImageUpload(f, i); }} />
                      </label>
                      {s.imageUrl && <img src={profileService.getImageUrl(s.imageUrl)} alt="Kỹ năng" style={thumbStyle} />}
                      <button type="button" onClick={() => { if (skills.length > 1) setSkills(skills.filter((_, j) => j !== i)); }} disabled={skills.length <= 1} style={skills.length <= 1 ? delBtnDisabled : delBtn}>Xóa</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setSkills([...skills, { description: '', imageUrl: '', sortOrder: skills.length }])} style={addBtn}>+ Thêm kỹ năng</button>
              </>
            ) : profile.teachingSkills.length > 0 ? (
              <div>{profile.teachingSkills.map((s, i) => (
                <div key={`${s.id}-${i}`} style={{ marginBottom: 8, padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
                  <p style={plainTextStyle}>{s.description}</p>
                  {s.imageUrl && <img src={profileService.getImageUrl(s.imageUrl)} alt="Kỹ năng" style={{ maxWidth: 200, maxHeight: 120, marginTop: 4 }} />}
                </div>
              ))}</div>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>

          {/* Học phí */}
          <Section label="Học phí">
            {editing ? (
              <>
                {fees.map((f, i) => (
                  <div key={`fee-${i}`} style={rowStyle}>
                    <input type="text" value={f.description} onChange={(e) => { const u = [...fees]; u[i] = { ...u[i], description: e.target.value }; setFees(u); }} style={{ ...inputStyle, flex: 1 }} placeholder="Mô tả học phí" />
                    <button type="button" onClick={() => { if (fees.length > 1) setFees(fees.filter((_, j) => j !== i)); }} disabled={fees.length <= 1} style={fees.length <= 1 ? delBtnDisabled : delBtn}>Xóa</button>
                  </div>
                ))}
                <button type="button" onClick={() => setFees([...fees, { description: '', sortOrder: fees.length }])} style={addBtn}>+ Thêm</button>
              </>
            ) : profile.tuitionFees.length > 0 ? (
              <ul style={listStyle}>{profile.tuitionFees.map((f, i) => <li key={`${f.id}-${f.description || ''}-${i}`}>{f.description}</li>)}</ul>
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
                <button type="button" onClick={() => setNotes([...notes, { content: '', sortOrder: notes.length }])} style={addBtn}>+ Thêm</button>
              </>
            ) : profile.notes.length > 0 ? (
              <ul style={listStyle}>{profile.notes.map((n, i) => <li key={`${n.id}-${n.content || ''}-${i}`}>{n.content}</li>)}</ul>
            ) : <p style={plainTextStyle}>—</p>}
          </Section>
        </tbody>
      </Box>
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
const inputStyle: React.CSSProperties = { width: '100%', padding: 8, boxSizing: 'border-box', backgroundColor: 'var(--edub-input-bg)', border: '1px solid var(--edub-input-border)', color: 'var(--edub-text-primary)', borderRadius: 8};
const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' };
const listStyle: React.CSSProperties = { margin: 0, paddingLeft: 20 };
const addBtn: React.CSSProperties = { padding: '4px 12px', cursor: 'pointer', marginTop: 4, backgroundColor: '#2e7d32', color: '#fff', border: '1px solid #2e7d32', borderRadius: 8, minHeight: 44 };
const delBtn: React.CSSProperties = { padding: '4px 10px', cursor: 'pointer', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, minHeight: 44 };
const delBtnDisabled: React.CSSProperties = { ...delBtn, backgroundColor: '#9ca3af', cursor: 'not-allowed' };
const fileLabelStyle: React.CSSProperties = { padding: '4px 12px', cursor: 'pointer', backgroundColor: '#d49a00', color: '#201a11', border: '1px solid #d49a00', borderRadius: 8, fontSize: 14, display: 'inline-block' };
const thumbStyle: React.CSSProperties = { maxWidth: 80, maxHeight: 60, borderRadius: 4, objectFit: 'cover' };
