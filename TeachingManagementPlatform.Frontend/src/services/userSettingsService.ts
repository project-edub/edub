import api from './api';

export interface UserSettings {
  themeColor: string | null;
  onboardingCompleted: boolean;
}

export async function getUserSettings(): Promise<UserSettings> {
  const response = await api.get<UserSettings>('/user/settings');
  return response.data;
}

export async function updateUserSettings(settings: { themeColor: string }): Promise<void> {
  await api.put('/user/settings', settings);
}

export async function updateOnboardingStatus(completed: boolean): Promise<void> {
  await api.put('/user/settings/onboarding', { completed });
}
