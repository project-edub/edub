import api from './api';
import type { ClassificationRange } from '../utils/scoreCalculation';

// ── Response/Request types ────────────────────────────────────────────────────

export interface ClassificationRangeResponse {
  id: number;
  studentListColumnId: number;
  minScore: number;
  maxScore: number;
  label: string;
  color: string;
  sortOrder: number;
}

export interface ClassificationRangeRequest {
  minScore: number;
  maxScore: number;
  label: string;
  color: string;
  sortOrder: number;
}

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * Get classification ranges for a specific average column.
 * GET /api/student-list-columns/{id}/classification-ranges
 */
export async function getClassificationRanges(
  columnId: number,
): Promise<ClassificationRange[]> {
  const response = await api.get<ClassificationRangeResponse[]>(
    `/student-list-columns/${columnId}/classification-ranges`,
  );
  return response.data.map(toClassificationRange);
}

/**
 * Replace all classification ranges for a specific average column.
 * PUT /api/student-list-columns/{id}/classification-ranges
 *
 * After this succeeds, the caller should recalculate classifications
 * for all students using the new ranges.
 */
export async function updateClassificationRanges(
  columnId: number,
  ranges: ClassificationRangeRequest[],
): Promise<ClassificationRange[]> {
  const response = await api.put<ClassificationRangeResponse[]>(
    `/student-list-columns/${columnId}/classification-ranges`,
    ranges,
  );
  return response.data.map(toClassificationRange);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toClassificationRange(dto: ClassificationRangeResponse): ClassificationRange {
  return {
    id: dto.id,
    columnId: dto.studentListColumnId,
    minScore: dto.minScore,
    maxScore: dto.maxScore,
    label: dto.label,
    color: dto.color,
    sortOrder: dto.sortOrder,
  };
}
