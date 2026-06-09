import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import type { StudentEntry, StudentListColumn } from '../../types/studentList';
import type { ScoreColumnConfig, ClassificationRange } from '../../utils/scoreCalculation';
import { calculateAverage, classifyScore } from '../../utils/scoreCalculation';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreSummaryBarProps {
  /** All student entries (with current data) */
  entries: StudentEntry[];
  /** All columns in the list */
  columns: StudentListColumn[];
  /** Column configurations (coefficient, isAverage, sourceColumnIds) */
  columnConfigs: Map<number, ScoreColumnConfig>;
  /** Classification ranges for the average column */
  classificationRanges: ClassificationRange[];
}

export interface SummaryStats {
  /** Class average (mean of individual averages, skipping incomplete) */
  classAverage: number | null;
  /** Number of students with complete scores (ĐTB available) */
  completeCount: number;
  /** Number of students with incomplete scores (missing data) */
  incompleteCount: number;
  /** Percentage breakdown per classification level */
  levelBreakdown: LevelStat[];
}

export interface LevelStat {
  label: string;
  color: string;
  count: number;
  percentage: number;
}

// ── Calculation Logic ─────────────────────────────────────────────────────────

/**
 * Computes summary statistics for the score grid.
 *
 * - ĐTB lớp = mean of individual ĐTB (skipping students without complete scores)
 * - % per level = count of students in each classification range / total complete students
 * - Incomplete = students with at least one empty source column (average is null)
 */
export function computeSummaryStats(
  entries: StudentEntry[],
  columns: StudentListColumn[],
  columnConfigs: Map<number, ScoreColumnConfig>,
  classificationRanges: ClassificationRange[],
): SummaryStats {
  // Find the average column config
  const avgColumnConfig = Array.from(columnConfigs.values()).find(
    (config) => config.isAverageColumn,
  );

  if (!avgColumnConfig) {
    return {
      classAverage: null,
      completeCount: 0,
      incompleteCount: entries.length,
      levelBreakdown: [],
    };
  }

  const columnsInfo = columns.map((c) => ({ id: c.id, name: c.name }));

  // Calculate individual averages
  const individualAverages: number[] = [];
  let incompleteCount = 0;

  // Track counts per classification label
  const levelCounts = new Map<string, { count: number; color: string; sortOrder: number }>();

  // Initialize level counts from ranges
  for (const range of classificationRanges) {
    if (!levelCounts.has(range.label)) {
      levelCounts.set(range.label, { count: 0, color: range.color, sortOrder: range.sortOrder });
    }
  }

  for (const entry of entries) {
    const { average } = calculateAverage(
      entry.data,
      avgColumnConfig.sourceColumnIds,
      columnsInfo,
      columnConfigs,
    );

    if (average === null) {
      incompleteCount++;
    } else {
      individualAverages.push(average);

      // Classify this student's average
      const classification = classifyScore(average, classificationRanges);
      if (classification) {
        const existing = levelCounts.get(classification.label);
        if (existing) {
          existing.count++;
        } else {
          levelCounts.set(classification.label, { count: 1, color: classification.color, sortOrder: 0 });
        }
      }
    }
  }

  // Compute class average = mean of individual averages
  let classAverage: number | null = null;
  if (individualAverages.length > 0) {
    const sum = individualAverages.reduce((acc, val) => acc + val, 0);
    classAverage = Math.round((sum / individualAverages.length) * 100) / 100;
  }

  // Compute percentage breakdown
  const completeCount = individualAverages.length;
  const levelBreakdown: LevelStat[] = Array.from(levelCounts.entries())
    .map(([label, { count, color, sortOrder }]) => ({
      label,
      color,
      count,
      percentage: completeCount > 0 ? Math.round((count / completeCount) * 1000) / 10 : 0,
      sortOrder,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _, ...rest }) => rest);

  return {
    classAverage,
    completeCount,
    incompleteCount,
    levelBreakdown,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Summary statistics bar displayed at the bottom of the score grid.
 * Shows: class average, percentage per classification level, and count of
 * students with incomplete scores.
 *
 * Requirements: 9.1, 9.2, 9.3
 */
export default function ScoreSummaryBar({
  entries,
  columns,
  columnConfigs,
  classificationRanges,
}: ScoreSummaryBarProps) {
  const stats = useMemo(
    () => computeSummaryStats(entries, columns, columnConfigs, classificationRanges),
    [entries, columns, columnConfigs, classificationRanges],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        mt: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        backgroundColor: 'grey.50',
        flexWrap: 'wrap',
      }}
      role="region"
      aria-label="Thống kê tổng hợp điểm"
    >
      {/* Class average */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          ĐTB lớp:
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {stats.classAverage !== null ? stats.classAverage : '–'}
        </Typography>
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* Classification level percentages */}
      {stats.levelBreakdown.map((level) => (
        <Chip
          key={level.label}
          label={`${level.label}: ${level.percentage}%`}
          size="small"
          sx={{
            backgroundColor: `${level.color}20`,
            color: level.color,
            fontWeight: 500,
            border: `1px solid ${level.color}40`,
          }}
        />
      ))}

      {stats.levelBreakdown.length > 0 && <Divider orientation="vertical" flexItem />}

      {/* Incomplete students count */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          Chưa đủ điểm:
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }} color="warning.main">
          {stats.incompleteCount}
        </Typography>
      </Box>
    </Box>
  );
}
