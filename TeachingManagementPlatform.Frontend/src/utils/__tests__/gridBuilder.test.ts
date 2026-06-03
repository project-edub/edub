import { describe, it, expect } from 'vitest';
import { buildGrid } from '../gridBuilder';
import type { PlacedWordInput } from '../gridBuilder';
import { Direction } from '../../types/crossword';

describe('buildGrid', () => {
  describe('first word placed horizontally at center', () => {
    it('places the longest word horizontally', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO' }];
      const size = 15;
      const result = buildGrid(words, size);

      expect(result.placedWords).toHaveLength(1);
      expect(result.placedWords[0].direction).toBe(Direction.Across);
    });

    it('places the first word at the center row', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO' }];
      const size = 15;
      const result = buildGrid(words, size);

      // Center row of a 15-grid is Math.floor(15/2) = 7
      // After compaction, startRow should be 0 (only one word, one row)
      expect(result.placedWords[0].startRow).toBe(0);
    });

    it('centers the word horizontally within the grid', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO' }];
      const size = 15;
      const result = buildGrid(words, size);

      // After compaction, startCol = 0
      expect(result.placedWords[0].startCol).toBe(0);
    });

    it('sorts by length and places longest word first', () => {
      const words: PlacedWordInput[] = [
        { word: 'CAT' },
        { word: 'ELEPHANT' },
        { word: 'DOG' },
      ];
      const size = 15;
      const result = buildGrid(words, size);

      // ELEPHANT is longest → placed first → across
      const elephant = result.placedWords.find((w) => w.word === 'ELEPHANT');
      expect(elephant).toBeDefined();
      expect(elephant!.direction).toBe(Direction.Across);
    });
  });

  describe('words sharing letters placed at correct intersecting positions', () => {
    it('places a second word perpendicularly through a shared letter', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO' }, { word: 'HELP' }];
      const size = 15;
      const result = buildGrid(words, size);

      expect(result.placedWords).toHaveLength(2);
      expect(result.unplacedWords).toHaveLength(0);

      const hello = result.placedWords.find((w) => w.word === 'HELLO');
      const help = result.placedWords.find((w) => w.word === 'HELP');
      expect(hello).toBeDefined();
      expect(help).toBeDefined();

      // One should be across, the other down (perpendicular)
      const directions = result.placedWords.map((w) => w.direction);
      expect(directions).toContain(Direction.Across);
      expect(directions).toContain(Direction.Down);
    });

    it('shared letters at intersection cells match', () => {
      const words: PlacedWordInput[] = [{ word: 'CROSS' }, { word: 'ROADS' }];
      const size = 15;
      const result = buildGrid(words, size);

      if (result.placedWords.length === 2) {
        // Find the intersection: both words should share at least one cell
        const getCells = (pw: (typeof result.placedWords)[0]) => {
          const cells: Array<{ row: number; col: number; letter: string }> = [];
          for (let i = 0; i < pw.word.length; i++) {
            if (pw.direction === Direction.Across) {
              cells.push({ row: pw.startRow, col: pw.startCol + i, letter: pw.word[i] });
            } else {
              cells.push({ row: pw.startRow + i, col: pw.startCol, letter: pw.word[i] });
            }
          }
          return cells;
        };

        const cells1 = getCells(result.placedWords[0]);
        const cells2 = getCells(result.placedWords[1]);

        // Find intersections
        const intersections = cells1.filter((c1) =>
          cells2.some((c2) => c1.row === c2.row && c1.col === c2.col),
        );

        // At intersections, letters must match
        for (const inter of intersections) {
          const matchingCell = cells2.find(
            (c) => c.row === inter.row && c.col === inter.col,
          );
          expect(matchingCell!.letter).toBe(inter.letter);
        }
      }
    });

    it('places multiple words with shared letters', () => {
      const words: PlacedWordInput[] = [
        { word: 'SCHOOL' },
        { word: 'CHALK' },
        { word: 'LEARN' },
      ];
      const size = 15;
      const result = buildGrid(words, size);

      // SCHOOL and CHALK share 'C', 'H'; SCHOOL and LEARN share 'L'
      // At least 2 should be placeable
      expect(result.placedWords.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('words with no common letters go into unplacedWords', () => {
    it('puts words with no shared letters into unplacedWords', () => {
      // 'AAAA' and 'BBBB' share no common letters
      const words: PlacedWordInput[] = [{ word: 'AAAA' }, { word: 'BBBB' }];
      const size = 15;
      const result = buildGrid(words, size);

      expect(result.placedWords).toHaveLength(1);
      expect(result.unplacedWords).toHaveLength(1);
      expect(result.unplacedWords).toContain('BBBB');
    });

    it('places words that share letters and rejects those that do not', () => {
      const words: PlacedWordInput[] = [
        { word: 'HELLO' },
        { word: 'WORLD' },  // shares L, O with HELLO
        { word: 'ZZZZZ' }, // shares no letters with HELLO or WORLD
      ];
      const size = 15;
      const result = buildGrid(words, size);

      // ZZZZZ cannot intersect with any placed word
      expect(result.unplacedWords).toContain('ZZZZZ');
    });

    it('handles case where multiple words cannot be placed', () => {
      const words: PlacedWordInput[] = [
        { word: 'ABCDE' },
        { word: 'FGHIJ' },
        { word: 'KLMNO' },
      ];
      const size = 15;
      const result = buildGrid(words, size);

      // Only the first word can be placed; others share no letters with 'ABCDE'
      // (FGHIJ has no letter in common with ABCDE; KLMNO has no letter in common)
      expect(result.placedWords).toHaveLength(1);
      expect(result.unplacedWords).toHaveLength(2);
    });
  });

  describe('numbers assigned in reading order (left→right, top→bottom)', () => {
    it('assigns number 1 to the first word when only one word is placed', () => {
      const words: PlacedWordInput[] = [{ word: 'TEST' }];
      const size = 15;
      const result = buildGrid(words, size);

      expect(result.placedWords[0].number).toBe(1);
    });

    it('assigns numbers in reading order for multiple words', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO' }, { word: 'HELP' }];
      const size = 15;
      const result = buildGrid(words, size);

      if (result.placedWords.length === 2) {
        const numbers = result.placedWords.map((w) => w.number);
        // Numbers should be positive integers
        numbers.forEach((n) => expect(n).toBeGreaterThan(0));

        // Numbers should be sequential starting from 1
        const sorted = [...numbers].sort((a, b) => a - b);
        expect(sorted[0]).toBe(1);
        expect(sorted[sorted.length - 1]).toBeLessThanOrEqual(result.placedWords.length);
      }
    });

    it('assigns earlier numbers to words starting at earlier positions (top then left)', () => {
      const words: PlacedWordInput[] = [
        { word: 'SCHOOL' },
        { word: 'CLASS' },
        { word: 'TEACH' },
      ];
      const size = 15;
      const result = buildGrid(words, size);

      if (result.placedWords.length >= 2) {
        // Verify reading order: sort placed words by (startRow, startCol)
        const sortedByPosition = [...result.placedWords].sort((a, b) => {
          if (a.startRow !== b.startRow) return a.startRow - b.startRow;
          return a.startCol - b.startCol;
        });

        // Words at same start cell share the same number
        // Words at earlier positions should have lower or equal numbers
        for (let i = 0; i < sortedByPosition.length - 1; i++) {
          const current = sortedByPosition[i];
          const next = sortedByPosition[i + 1];
          if (
            current.startRow < next.startRow ||
            (current.startRow === next.startRow && current.startCol < next.startCol)
          ) {
            expect(current.number).toBeLessThanOrEqual(next.number);
          }
        }
      }
    });

    it('words starting at the same cell share the same number', () => {
      // Create a scenario where two words start at the same cell
      // This happens when an across word and down word start at the same position
      const words: PlacedWordInput[] = [
        { word: 'CROSS' },
        { word: 'CROWN' },
      ];
      const size = 15;
      const result = buildGrid(words, size);

      if (result.placedWords.length === 2) {
        const [w1, w2] = result.placedWords;
        if (w1.startRow === w2.startRow && w1.startCol === w2.startCol) {
          expect(w1.number).toBe(w2.number);
        }
      }
    });
  });

  describe('grid compaction to (0,0)', () => {
    it('minimum startRow is 0 after compaction', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO' }, { word: 'HELP' }];
      const size = 15;
      const result = buildGrid(words, size);

      const minRow = Math.min(...result.placedWords.map((w) => w.startRow));
      expect(minRow).toBe(0);
    });

    it('minimum startCol is 0 after compaction', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO' }, { word: 'HELP' }];
      const size = 15;
      const result = buildGrid(words, size);

      const minCol = Math.min(...result.placedWords.map((w) => w.startCol));
      expect(minCol).toBe(0);
    });

    it('grid dimensions match the actual word coverage', () => {
      const words: PlacedWordInput[] = [{ word: 'WORLD' }];
      const size = 15;
      const result = buildGrid(words, size);

      // Single horizontal word of length 5 → grid should be 1 row × 5 cols
      expect(result.grid).toHaveLength(1);
      expect(result.grid[0]).toHaveLength(5);
    });

    it('grid dimensions grow appropriately with perpendicular words', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO' }, { word: 'HELP' }];
      const size = 15;
      const result = buildGrid(words, size);

      if (result.placedWords.length === 2) {
        // Grid should accommodate both words
        const maxRow = Math.max(
          ...result.placedWords.map((w) =>
            w.direction === Direction.Down ? w.startRow + w.word.length - 1 : w.startRow,
          ),
        );
        const maxCol = Math.max(
          ...result.placedWords.map((w) =>
            w.direction === Direction.Across ? w.startCol + w.word.length - 1 : w.startCol,
          ),
        );
        expect(result.grid.length).toBe(maxRow + 1);
        expect(result.grid[0].length).toBe(maxCol + 1);
      }
    });

    it('all placed word positions are non-negative after compaction', () => {
      const words: PlacedWordInput[] = [
        { word: 'PYTHON' },
        { word: 'TYPE' },
        { word: 'NODE' },
      ];
      const size = 15;
      const result = buildGrid(words, size);

      for (const pw of result.placedWords) {
        expect(pw.startRow).toBeGreaterThanOrEqual(0);
        expect(pw.startCol).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = buildGrid([], 15);

      expect(result.placedWords).toHaveLength(0);
      expect(result.unplacedWords).toHaveLength(0);
      expect(result.grid).toHaveLength(15);
      expect(result.grid[0]).toHaveLength(15);
    });

    it('handles a single word', () => {
      const words: PlacedWordInput[] = [{ word: 'SINGLE' }];
      const size = 15;
      const result = buildGrid(words, size);

      expect(result.placedWords).toHaveLength(1);
      expect(result.unplacedWords).toHaveLength(0);
      expect(result.placedWords[0].word).toBe('SINGLE');
      expect(result.placedWords[0].direction).toBe(Direction.Across);
      expect(result.placedWords[0].number).toBe(1);
    });

    it('handles all words being unplaceable after the first', () => {
      const words: PlacedWordInput[] = [
        { word: 'AAAA' },
        { word: 'BBBB' },
        { word: 'CCCC' },
        { word: 'DDDD' },
      ];
      const size = 15;
      const result = buildGrid(words, size);

      expect(result.placedWords).toHaveLength(1);
      expect(result.unplacedWords).toHaveLength(3);
    });

    it('preserves word ids in the result', () => {
      const words: PlacedWordInput[] = [
        { word: 'HELLO', id: 42 },
        { word: 'HELP', id: 7 },
      ];
      const size = 15;
      const result = buildGrid(words, size);

      const hello = result.placedWords.find((w) => w.word === 'HELLO');
      expect(hello?.id).toBe(42);

      if (result.placedWords.length === 2) {
        const help = result.placedWords.find((w) => w.word === 'HELP');
        expect(help?.id).toBe(7);
      }
    });

    it('grid cells have correct letters for placed words', () => {
      const words: PlacedWordInput[] = [{ word: 'CAT' }];
      const size = 15;
      const result = buildGrid(words, size);

      // Single across word: grid[0][0]='C', grid[0][1]='A', grid[0][2]='T'
      expect(result.grid[0][0].letter).toBe('C');
      expect(result.grid[0][1].letter).toBe('A');
      expect(result.grid[0][2].letter).toBe('T');
      expect(result.grid[0][0].isBlack).toBe(false);
    });

    it('cells not part of any word are marked as black', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO' }, { word: 'WORLD' }];
      const size = 15;
      const result = buildGrid(words, size);

      if (result.placedWords.length === 2) {
        // Find a cell that is not covered by any word
        const wordCells = new Set<string>();
        for (const pw of result.placedWords) {
          for (let i = 0; i < pw.word.length; i++) {
            if (pw.direction === Direction.Across) {
              wordCells.add(`${pw.startRow},${pw.startCol + i}`);
            } else {
              wordCells.add(`${pw.startRow + i},${pw.startCol}`);
            }
          }
        }

        // Check some cell outside word coverage is black
        let foundBlack = false;
        for (let r = 0; r < result.grid.length; r++) {
          for (let c = 0; c < result.grid[r].length; c++) {
            if (!wordCells.has(`${r},${c}`)) {
              expect(result.grid[r][c].isBlack).toBe(true);
              expect(result.grid[r][c].letter).toBe('');
              foundBlack = true;
              break;
            }
          }
          if (foundBlack) break;
        }
      }
    });

    it('handles words with underscore characters', () => {
      const words: PlacedWordInput[] = [{ word: 'HELLO_WORLD' }];
      const size = 15;
      const result = buildGrid(words, size);

      expect(result.placedWords).toHaveLength(1);
      expect(result.placedWords[0].word).toBe('HELLO_WORLD');
      expect(result.grid[0][5].letter).toBe('_');
    });
  });
});
