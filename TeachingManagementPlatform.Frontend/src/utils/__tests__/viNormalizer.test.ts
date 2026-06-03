import { describe, it, expect } from 'vitest';
import { normalize, checkAnswer } from '../viNormalizer';

describe('normalize', () => {
  describe('Vietnamese diacritics → uppercase ASCII', () => {
    it('removes tone marks from vowels', () => {
      expect(normalize('áàảãạ')).toBe('AAAAA');
      expect(normalize('éèẻẽẹ')).toBe('EEEEE');
      expect(normalize('íìỉĩị')).toBe('IIIII');
      expect(normalize('óòỏõọ')).toBe('OOOOO');
      expect(normalize('úùủũụ')).toBe('UUUUU');
      expect(normalize('ýỳỷỹỵ')).toBe('YYYYY');
    });

    it('removes circumflex and hook marks from vowels', () => {
      expect(normalize('ăâ')).toBe('AA');
      expect(normalize('êế')).toBe('EE');
      expect(normalize('ôơ')).toBe('OO');
      expect(normalize('ư')).toBe('U');
    });

    it('handles combined diacritics (circumflex + tone)', () => {
      expect(normalize('ấầẩẫậ')).toBe('AAAAA');
      expect(normalize('ếềểễệ')).toBe('EEEEE');
      expect(normalize('ốồổỗộ')).toBe('OOOOO');
      expect(normalize('ứừửữự')).toBe('UUUUU');
    });

    it('converts full Vietnamese words to uppercase ASCII', () => {
      expect(normalize('Tiếng')).toBe('TIENG');
      expect(normalize('Việt')).toBe('VIET');
      expect(normalize('xin chào')).toBe('XINCHAO');
    });

    it('converts to uppercase', () => {
      expect(normalize('hello')).toBe('HELLO');
      expect(normalize('Hello World')).toBe('HELLOWORLD');
    });
  });

  describe('đ/Đ → D', () => {
    it('converts lowercase đ to D', () => {
      expect(normalize('đ')).toBe('D');
      expect(normalize('đường')).toBe('DUONG');
      expect(normalize('đẹp')).toBe('DEP');
    });

    it('converts uppercase Đ to D', () => {
      expect(normalize('Đ')).toBe('D');
      expect(normalize('Đường')).toBe('DUONG');
      expect(normalize('ĐẸP')).toBe('DEP');
    });

    it('handles multiple đ/Đ in one string', () => {
      expect(normalize('đồng đội')).toBe('DONGDOI');
      expect(normalize('Đồ Đạc')).toBe('DODAC');
    });
  });

  describe('special characters removal', () => {
    it('removes spaces', () => {
      expect(normalize('hello world')).toBe('HELLOWORLD');
    });

    it('removes numbers', () => {
      expect(normalize('abc123')).toBe('ABC');
    });

    it('removes punctuation', () => {
      expect(normalize('hello!')).toBe('HELLO');
      expect(normalize('a.b,c;d')).toBe('ABCD');
      expect(normalize('test@#$%')).toBe('TEST');
    });

    it('removes hyphens and other symbols', () => {
      expect(normalize('a-b+c=d')).toBe('ABCD');
      expect(normalize('(test)')).toBe('TEST');
    });
  });

  describe('underscore preservation', () => {
    it('preserves underscores in the output', () => {
      expect(normalize('HELLO_WORLD')).toBe('HELLO_WORLD');
    });

    it('preserves underscores mixed with other characters', () => {
      expect(normalize('a_b_c')).toBe('A_B_C');
    });

    it('preserves multiple consecutive underscores', () => {
      expect(normalize('a__b')).toBe('A__B');
    });

    it('preserves leading and trailing underscores', () => {
      expect(normalize('_test_')).toBe('_TEST_');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(normalize('')).toBe('');
    });

    it('handles string with only special characters', () => {
      expect(normalize('!@#$%^&*()')).toBe('');
    });

    it('handles already-normalized string', () => {
      expect(normalize('HELLO')).toBe('HELLO');
    });
  });
});

describe('checkAnswer', () => {
  describe('accepts both with-diacritics and without-diacritics', () => {
    it('matches Vietnamese input against normalized answer', () => {
      expect(checkAnswer('đường', 'DUONG')).toBe(true);
    });

    it('matches normalized input against Vietnamese answer', () => {
      expect(checkAnswer('DUONG', 'đường')).toBe(true);
    });

    it('matches two Vietnamese strings with same base', () => {
      expect(checkAnswer('Tiếng', 'tieng')).toBe(true);
    });

    it('matches input with diacritics against answer with diacritics', () => {
      expect(checkAnswer('đường', 'Đường')).toBe(true);
    });

    it('rejects non-matching strings', () => {
      expect(checkAnswer('sai', 'DUNG')).toBe(false);
      expect(checkAnswer('abc', 'xyz')).toBe(false);
    });
  });

  describe('case-insensitive', () => {
    it('matches lowercase to uppercase', () => {
      expect(checkAnswer('hello', 'HELLO')).toBe(true);
    });

    it('matches uppercase to lowercase', () => {
      expect(checkAnswer('HELLO', 'hello')).toBe(true);
    });

    it('matches mixed case', () => {
      expect(checkAnswer('HeLLo', 'hEllO')).toBe(true);
    });

    it('matches Vietnamese with different cases', () => {
      expect(checkAnswer('việt nam', 'VIETNAM')).toBe(true);
      expect(checkAnswer('VIETNAM', 'việt nam')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('matches two empty strings', () => {
      expect(checkAnswer('', '')).toBe(true);
    });

    it('matches strings that differ only in special characters', () => {
      expect(checkAnswer('hello!', 'hello')).toBe(true);
    });

    it('matches strings with underscores', () => {
      expect(checkAnswer('HELLO_WORLD', 'hello_world')).toBe(true);
    });
  });
});
