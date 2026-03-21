import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import type { PublicLecturerProfile } from '../types/profile';
import type { ApiError } from '../types/common';
import * as publicService from '../services/publicService';

export default function HomePage() {
  const [lecturers, setLecturers] = useState<PublicLecturerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [selectedLecturer, setSelectedLecturer] = useState<PublicLecturerProfile | null>(null);

  const searchLecturers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await publicService.searchLecturers(
        searchQuery || undefined,
        locationFilter || undefined,
        subjectFilter || undefined,
        experienceFilter || undefined,
        ratingFilter || undefined
      );

      // Data may be array or wrapper object; normalize to array
      let lecturersArray: PublicLecturerProfile[] = [];
      if (Array.isArray(response)) {
        lecturersArray = response;
      } else if (response && typeof response === 'object' && 'lecturers' in response) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maybe = response as any;
        if (Array.isArray(maybe.lecturers)) {
          lecturersArray = maybe.lecturers;
        }
      }

      if (!Array.isArray(lecturersArray)) {
        console.warn('HomePage: API returned non-array data:', response);
      }

      setLecturers(lecturersArray);

    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(axiosErr.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      setLecturers([]); // Ensure lecturers is always an array
    } finally {
      setLoading(false);
    }
  }, [searchQuery, locationFilter, subjectFilter, experienceFilter, ratingFilter]);

  useEffect(() => {
    searchLecturers();
  }, [searchLecturers]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    searchLecturers();
  };

  const handleOpenProfile = (lecturer: PublicLecturerProfile) => {
    setSelectedLecturer(lecturer);
  };

  const handleCloseProfile = () => {
    setSelectedLecturer(null);
  };

  const safeLecturers = Array.isArray(lecturers) ? lecturers : [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #e1e5e9',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
          Teaching Platform
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/login" style={{
            padding: '8px 16px',
            color: '#374151',
            textDecoration: 'none',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}>Đăng nhập</Link>
          <Link to="/register" style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500
          }}>Đăng ký</Link>
        </div>
      </header>

      {/* Search Section */}
      <div style={{
        padding: '64px 32px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px', color: '#1f2937' }}>
          Tìm gia sư phù hợp
        </h2>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 32px' }}>
          Khám phá hàng nghìn gia sư chuyên nghiệp
        </p>

        {/* Search Form */}
        <form onSubmit={handleSearch} style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '32px'
        }}>
          <input
            type="text"
            placeholder="Tìm theo tên gia sư..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              backgroundColor: '#fff'
            }}
          >
            <option value="">Tất cả địa điểm</option>
            <option value="Hà Nội">Hà Nội</option>
            <option value="TP.HCM">TP.HCM</option>
            <option value="Đà Nẵng">Đà Nẵng</option>
            <option value="Hải Phòng">Hải Phòng</option>
            <option value="Cần Thơ">Cần Thơ</option>
          </select>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              backgroundColor: '#fff'
            }}
          >
            <option value="">Tất cả môn học</option>
            <option value="Toán">Toán học</option>
            <option value="Tiếng Anh">Tiếng Anh</option>
            <option value="Vật lý">Vật lý</option>
            <option value="Hóa học">Hóa học</option>
            <option value="Ngữ văn">Ngữ văn</option>
            <option value="Lịch sử">Lịch sử</option>
            <option value="Tin học">Tin học</option>
            <option value="Lập trình">Lập trình</option>
          </select>
          <select
            value={experienceFilter}
            onChange={(e) => setExperienceFilter(e.target.value)}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              backgroundColor: '#fff'
            }}
          >
            <option value="">Tất cả kinh nghiệm</option>
            <option value="1-3">1-3 năm</option>
            <option value="3-5">3-5 năm</option>
            <option value="5-10">5-10 năm</option>
            <option value="10+">10+ năm</option>
          </select>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              backgroundColor: '#fff'
            }}
          >
            <option value="">Tất cả đánh giá</option>
            <option value="4.5+">4.5+ sao</option>
            <option value="4.0+">4.0+ sao</option>
            <option value="3.5+">3.5+ sao</option>
            <option value="3.0+">3.0+ sao</option>
          </select>
          <button type="submit" style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer'
          }}>
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Results */}
      <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {error && (
          <div style={{
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#6b7280' }}>Đang tìm kiếm...</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: 600 }}>
                {safeLecturers.length} gia sư được tìm thấy
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {safeLecturers.map((lecturer) => (
                <LecturerCard key={lecturer.id} lecturer={lecturer} onViewProfile={() => handleOpenProfile(lecturer)} />
              ))}
            </div>

            {safeLecturers.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <p>Không tìm thấy gia sư nào phù hợp với tiêu chí tìm kiếm.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface LecturerCardProps {
  lecturer: PublicLecturerProfile;
  onViewProfile: () => void;
}

function LecturerCard({ lecturer, onViewProfile }: LecturerCardProps) {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'box-shadow 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          flexShrink: 0
        }}>
          {lecturer.avatarUrl ? (
            <img
              src={lecturer.avatarUrl}
              alt={lecturer.fullName}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '20px', color: '#6b7280' }}>👤</span>
          )}
        </div>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
            {lecturer.fullName}
          </h3>
          {lecturer.occupations.length > 0 && (
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              {lecturer.occupations.join(', ')}
            </p>
          )}
        </div>
      </div>

      {lecturer.introduction && (
        <p style={{
          margin: '0 0 16px',
          color: '#374151',
          fontSize: '14px',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {lecturer.introduction}
        </p>
      )}

      <div style={{ marginBottom: '16px' }}>
        {lecturer.teachingLocations.length > 0 && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Địa điểm
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1f2937' }}>
              {lecturer.teachingLocations.join(', ')}
            </p>
          </div>
        )}

        {lecturer.expertises.length > 0 && (
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Chuyên môn
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1f2937' }}>
              {lecturer.expertises.map(e => `${e.specialty} (${e.degree})`).join(', ')}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onViewProfile}
        style={{
          width: '100%',
          padding: '10px 16px',
          backgroundColor: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease'
        }}
      >
        Xem hồ sơ
      </button>
    </div>
  );
}