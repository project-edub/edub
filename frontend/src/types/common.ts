export const AccountStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const ItemType = {
  File: 'File',
  Folder: 'Folder',
} as const;

export type ItemType = (typeof ItemType)[keyof typeof ItemType];

export const GameType = {
  Quiz: 'Quiz',
} as const;

export type GameType = (typeof GameType)[keyof typeof GameType];

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
