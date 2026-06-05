import api from './api';
import type {
  CrosswordUploadResponse,
  CrosswordEstimateResponse,
  CrosswordGenerateResponse,
  CrosswordGameDto,
  CrosswordListItemDto,
  CrosswordPlayerDto,
  CrosswordSubmitRequest,
  CrosswordSubmitResponse,
  GameConfig,
} from '../types/crossword';

// ── Request body types ────────────────────────────────────────────────────────

export interface CrosswordEstimateRequest {
  config: GameConfig;
}

export interface CrosswordGenerateRequest {
  gameId?: number;
  config: GameConfig;
}

export interface CrosswordUpdateRequest {
  title?: string;
  configJson?: string;
  gridJson?: string;
  deadline?: string | null;
  showAnswerAfterExpiry?: boolean;
  maxAttempts?: number | null;
  words?: Array<{
    id: number;
    direction: string;
    startRow: number;
    startCol: number;
    number: number;
  }>;
}

export interface CrosswordWordUpdateRequest {
  word?: string;
  displayWord?: string;
  clue?: string;
  difficulty?: string;
  sourceContext?: string | null;
}

export interface CrosswordPublishRequest {
  maxAttempts?: number | null;
  gridJson: string;
  deadline?: string | null;
}

// ── Error normalization helper ─────────────────────────────────────────────────

function normalizeError(err: any): never {
  const data = err?.response?.data;
  const server = data?.error;

  if (server) {
    throw { code: server.code, message: server.message, details: server };
  }

  // ASP.NET Core automatic model validation response shape
  if (data?.errors && typeof data.errors === 'object') {
    const allErrors = Object.values(data.errors)
      .flatMap((messages: any) => (Array.isArray(messages) ? messages : [String(messages)]))
      .filter(Boolean);
    throw {
      code: 'VALIDATION_ERROR',
      message: allErrors[0] ?? data?.title ?? 'Dữ liệu gửi lên không hợp lệ.',
      details: data,
    };
  }

  if (typeof data?.title === 'string') {
    throw {
      code: data?.status === 400 ? 'VALIDATION_ERROR' : 'ERROR',
      message: data.title,
      details: data,
    };
  }

  throw err;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * POST /api/crossword/upload
 * Upload one or more documents for text extraction.
 */
export async function uploadDocument(files: File[]): Promise<CrosswordUploadResponse> {
  try {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const response = await api.post<CrosswordUploadResponse>('/crossword/upload', formData);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * POST /api/crossword/estimate
 * Estimate ECoin cost for a given config without calling AI.
 */
export async function estimateEcoin(config: GameConfig): Promise<CrosswordEstimateResponse> {
  try {
    const payload: CrosswordEstimateRequest = { config };
    const response = await api.post<CrosswordEstimateResponse>('/crossword/estimate', payload);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * POST /api/crossword/generate
 * Generate a new crossword game using AI.
 */
export async function generateCrossword(payload: CrosswordGenerateRequest): Promise<CrosswordGenerateResponse> {
  try {
    const response = await api.post<CrosswordGenerateResponse>('/crossword/generate', payload);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * POST /api/crossword/regenerate/{gameId}
 * Regenerate a crossword game reusing the previously uploaded document.
 * Backend expects CrosswordGenerationConfig directly as the request body.
 */
export async function regenerateCrossword(
  gameId: number,
  config: GameConfig,
): Promise<CrosswordGenerateResponse> {
  try {
    const response = await api.post<CrosswordGenerateResponse>(
      `/crossword/regenerate/${gameId}`,
      config,
    );
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * GET /api/crossword/{gameId}
 * Fetch full game details (teacher view, answers visible).
 */
export async function getCrossword(gameId: number): Promise<CrosswordGameDto> {
  try {
    const response = await api.get<CrosswordGameDto>(`/crossword/${gameId}`);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * PUT /api/crossword/{gameId}
 * Update the full game (title, config, grid, publish settings).
 */
export async function updateCrossword(
  gameId: number,
  payload: CrosswordUpdateRequest,
): Promise<CrosswordGameDto> {
  try {
    const response = await api.put<CrosswordGameDto>(`/crossword/${gameId}`, payload);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * PATCH /api/crossword/{gameId}/word/{wordId}
 * Update a single word's clue or answer.
 */
export async function updateWord(
  gameId: number,
  wordId: number,
  payload: CrosswordWordUpdateRequest,
): Promise<void> {
  try {
    await api.patch(`/crossword/${gameId}/word/${wordId}`, payload);
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * POST /api/crossword/{gameId}/publish
 * Publish the game so students can access it via slug.
 */
export async function publishCrossword(
  gameId: number,
  payload: CrosswordPublishRequest,
): Promise<CrosswordGameDto> {
  try {
    const response = await api.post<CrosswordGameDto>(`/crossword/${gameId}/publish`, payload);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * GET /api/crossword
 * Fetch the list of crossword games created by the current teacher.
 */
export async function getCrosswordList(): Promise<CrosswordListItemDto[]> {
  try {
    const response = await api.get<CrosswordListItemDto[]>('/crossword');
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * DELETE /api/crossword/{gameId}
 * Delete a crossword game.
 */
export async function deleteCrossword(gameId: number): Promise<void> {
  try {
    await api.delete(`/crossword/${gameId}`);
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * GET /api/play/{slug}
 * Fetch the public player view of a game (answers hidden).
 */
export async function getPlayerGame(slug: string): Promise<CrosswordPlayerDto> {
  try {
    const response = await api.get<CrosswordPlayerDto>(`/play/${slug}`);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}

/**
 * POST /api/play/{slug}/submit
 * Submit student answers and receive per-word correctness results.
 */
export async function submitAnswers(
  slug: string,
  payload: CrosswordSubmitRequest,
): Promise<CrosswordSubmitResponse> {
  try {
    const response = await api.post<CrosswordSubmitResponse>(`/play/${slug}/submit`, payload);
    return response.data;
  } catch (err: any) {
    normalizeError(err);
  }
}
