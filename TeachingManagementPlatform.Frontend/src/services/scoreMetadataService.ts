import api from './api';
import type { ScoreColumnConfig } from '../utils/scoreCalculation';

// ── Request/Response types ────────────────────────────────────────────────────

export interface UpdateScoreColumnMetadataRequest {
  coefficient: number | null;
  isAverageColumn: boolean;
  sourceColumnIds: number[];
}

export interface ScoreColumnMetadataResponse {
  id: number;
  studentListColumnId: number;
  coefficient: number | null;
  isAverageColumn: boolean;
  sourceColumnIds: number[];
}

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * Update score metadata for a specific column.
 * PUT /api/student-list-columns/{id}/score-metadata
 */
export async function updateScoreColumnMetadata(
  columnId: number,
  data: UpdateScoreColumnMetadataRequest,
): Promise<ScoreColumnMetadataResponse> {
  const response = await api.put<ScoreColumnMetadataResponse>(
    `/student-list-columns/${columnId}/score-metadata`,
    data,
  );
  return response.data;
}

/**
 * Get all score metadata for columns in a student list.
 * GET /api/student-lists/{id}/score-metadata
 */
export async function getScoreMetadata(
  studentListId: number,
): Promise<ScoreColumnMetadataResponse[]> {
  const response = await api.get<ScoreColumnMetadataResponse[]>(
    `/student-lists/${studentListId}/score-metadata`,
  );
  return response.data;
}

/**
 * Convert API response array to a Map<columnId, ScoreColumnConfig> for use in ScoreGrid.
 */
export function toColumnConfigMap(
  metadataList: ScoreColumnMetadataResponse[],
): Map<number, ScoreColumnConfig> {
  const map = new Map<number, ScoreColumnConfig>();
  for (const meta of metadataList) {
    map.set(meta.studentListColumnId, {
      columnId: meta.studentListColumnId,
      coefficient: meta.coefficient,
      isAverageColumn: meta.isAverageColumn,
      sourceColumnIds: meta.sourceColumnIds,
    });
  }
  return map;
}
