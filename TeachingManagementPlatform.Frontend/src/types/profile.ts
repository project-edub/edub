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
  teachingLocations: ProfileTeachingLocation[];
  expertises: ProfileExpertise[];
  experiences: ProfileExperience[];
  teachingSkills: ProfileTeachingSkill[];
  notes: ProfileNote[];
}

export interface PublicExpertise {
  specialty: string;
  degree: string;
  certificateImageUrl?: string | null;
}

export interface PublicTeachingLocation {
  value: string;
}

export interface PublicExperience {
  description: string;
  imageUrl?: string | null;
}

export interface PublicTeachingSkill {
  description: string;
  imageUrl?: string | null;
}

export interface PublicNote {
  content: string;
}

export interface PublicLecturerProfile {
  id: number;
  fullName: string;
  introduction?: string | null;
  avatarUrl?: string | null;
  teachingLocations: PublicTeachingLocation[];
  expertises: PublicExpertise[];
  experiences?: PublicExperience[];
  teachingSkills?: PublicTeachingSkill[];
  notes?: PublicNote[];
}

export interface UpdateProfileRequest {
  fullName: string;
  introduction?: string | null;
  teachingLocations: Omit<ProfileTeachingLocation, 'id' | 'profileId'>[];
  expertises: Omit<ProfileExpertise, 'id' | 'profileId'>[];
  experiences: Omit<ProfileExperience, 'id' | 'profileId'>[];
  teachingSkills: Omit<ProfileTeachingSkill, 'id' | 'profileId'>[];
  notes: Omit<ProfileNote, 'id' | 'profileId'>[];
}
