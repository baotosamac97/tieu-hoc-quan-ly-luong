import { parseNumber, parseDate, parseExcelFile } from './parser.js';
import XLSX from 'xlsx';

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

describe('parseExcelFile simple format', () => {
  test('uses first row as headers', async () => {
    const aoa = [
      ['Name', 'Age', 'Note'],
      ['Alice', 30, 'A'],
      ['Bob', '', 'B']
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    global.XLSX = XLSX;
    const fakeFile = { arrayBuffer: async () => buf };
    const parsed = await parseExcelFile(fakeFile);

    expect(parsed).toEqual([
      { Name: 'Alice', Age: 30, Note: 'A' },
      { Name: 'Bob', Age: '', Note: 'B' }
    ]);
  });
});

