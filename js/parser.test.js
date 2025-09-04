import { parseNumber, parseDate } from './parser.js';

describe('parseNumber', () => {
  test('parses 1,234.56 correctly', () => {
    expect(parseNumber('1,234.56')).toBeCloseTo(1234.56);
  });

  test('parses 1.234,56 correctly', () => {
    expect(parseNumber('1.234,56')).toBeCloseTo(1234.56);
  });

  test('parses thousand separated integer', () => {
    expect(parseNumber('1,234')).toBe(1234);
    expect(parseNumber('1.234')).toBe(1234);
  });

  test('returns null for invalid numbers', () => {
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('parseDate', () => {
  function assertDate(d, y, m, day) {
    expect(d).not.toBeNull();
    expect(d.getFullYear()).toBe(y);
    expect(d.getMonth()).toBe(m);
    expect(d.getDate()).toBe(day);
  }

  test('parses dd/mm/yyyy', () => {
    const d = parseDate('02/03/2024');
    assertDate(d, 2024, 2, 2);
  });

  test('parses dd-mm-yyyy', () => {
    const d = parseDate('02-03-2024');
    assertDate(d, 2024, 2, 2);
  });

  test('parses Excel serial number', () => {
    const d = parseDate(44927);
    assertDate(d, 2023, 0, 1);
  });
});

