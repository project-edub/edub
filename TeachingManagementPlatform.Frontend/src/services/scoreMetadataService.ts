import api from './api';
import type { ScoreColumnConfig } from '../utils/scoreCalculation';

// ── Request/Response types ────────────────────────────────────────────────────

export interface UpdateScoreColumnMetadataRequest {
  coefficient: number | null;
  isAverageColumn: boolean;
  sourceColumnIds: number[];
}

export interface ScoreColumnMetadataResponse {
  id?: number;
  studentListColumnId?: number;
  /** @deprecated Old field name — use studentListColumnId */
  columnId?: number;
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

/** Resolve the column ID from the response (handles both old and new field names) */
function resolveColumnId(meta: ScoreColumnMetadataResponse): number {
  return meta.studentListColumnId ?? meta.columnId ?? 0;
}

/**
 * Convert API response array to a Map<columnId, ScoreColumnConfig> for use in ScoreGrid.
 */
export function toColumnConfigMap(
  metadataList: ScoreColumnMetadataResponse[],
): Map<number, ScoreColumnConfig> {
  const map = new Map<number, ScoreColumnConfig>();
  for (const meta of metadataList) {
    const colId = resolveColumnId(meta);
    if (!colId) continue;
    map.set(colId, {
      columnId: colId,
      coefficient: meta.coefficient,
      isAverageColumn: meta.isAverageColumn,
      sourceColumnIds: meta.sourceColumnIds,
    });
  }
  return map;
}
