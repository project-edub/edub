import axios from 'axios';
import type { PublicLecturerProfile } from '../types/profile';

const API_BASE = '/api/public';

export async function searchLecturers(
  search?: string,
  location?: string,
  subject?: string,
  experience?: string,
  rating?: string
): Promise<PublicLecturerProfile[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (location) params.append('location', location);
  if (subject) params.append('subject', subject);
  if (experience) params.append('experience', experience);
  if (rating) params.append('rating', rating);

  const response = await axios.get(`${API_BASE}/lecturers`, {
    params: Object.fromEntries(params.entries())
  });

  return response.data as PublicLecturerProfile[];
}
