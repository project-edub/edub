export interface ProfileOccupation {
  id: number;
  profileId: number;
  value: string;
  sortOrder: number;
}

export interface ProfileTeachingLocation {
  id: number;
  profileId: number;
  value: string;
  sortOrder: number;
}

export interface ProfileExpertise {
  id: number;
  profileId: number;
  specialty: string;
  degree: string;
  certificateImageUrl?: string | null;
  sortOrder: number;
}

export interface ProfileExperience {
  id: number;
  profileId: number;
  description: string;
  imageUrl?: string | null;
  sortOrder: number;
}

export interface ProfileTeachingSkill {
  id: number;
  profileId: number;
  description: string;
  imageUrl?: string | null;
  sortOrder: number;
}

export interface ProfileTuitionFee {
  id: number;
  profileId: number;
  description: string;
  sortOrder: number;
}

export interface ProfileNote {
  id: number;
  profileId: number;
  content: string;
  sortOrder: number;
}

export interface LecturerProfile {
  id: number;
  userId: number;
  fullName: string;
  introduction?: string | null;
  avatarUrl?: string | null;
  occupations: ProfileOccupation[];
  teachingLocations: ProfileTeachingLocation[];
  expertises: ProfileExpertise[];
  experiences: ProfileExperience[];
  teachingSkills: ProfileTeachingSkill[];
  tuitionFees: ProfileTuitionFee[];
  notes: ProfileNote[];
}

export interface PublicExpertise {
  specialty: string;
  degree: string;
}

export interface PublicOccupation {
  value: string;
}

export interface PublicTeachingLocation {
  value: string;
}

export interface PublicLecturerProfile {
  id: number;
  fullName: string;
  introduction?: string | null;
  avatarUrl?: string | null;
  occupations: PublicOccupation[];
  teachingLocations: PublicTeachingLocation[];
  expertises: PublicExpertise[];
}

export interface UpdateProfileRequest {
  fullName: string;
  introduction?: string | null;
  occupations: Omit<ProfileOccupation, 'id' | 'profileId'>[];
  teachingLocations: Omit<ProfileTeachingLocation, 'id' | 'profileId'>[];
  expertises: Omit<ProfileExpertise, 'id' | 'profileId'>[];
  experiences: Omit<ProfileExperience, 'id' | 'profileId'>[];
  teachingSkills: Omit<ProfileTeachingSkill, 'id' | 'profileId'>[];
  tuitionFees: Omit<ProfileTuitionFee, 'id' | 'profileId'>[];
  notes: Omit<ProfileNote, 'id' | 'profileId'>[];
}
