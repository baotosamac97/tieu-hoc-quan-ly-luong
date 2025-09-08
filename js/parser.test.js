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

describe('parseExcelFile with multi-row headers', () => {
  test('skips top metadata and merges header rows', async () => {
    const aoa = [
      ['UBND something', 'Trường A'],
      ['Some other line'],
      ['STT', 'Họ tên', 'Ngày sinh', 'Chức vụ', 'Trường/Đơn vị', 'Phụ cấp', '', 'Hệ số lương', '', 'Ghi chú'],
      ['', '', '', '', '', 'Chức vụ', 'Ngày hưởng', 'Hiện hưởng', 'Ngày hưởng hiện tại', ''],
      [1, 'Nguyễn Văn A', '01/01/1980', 'Giáo viên', 'Trường A', '0.2', '01/01/2020', 3.0, '01/01/2020', ''],
      [2, 'Trần Thị B', '02/02/1985', 'Giáo viên', 'Trường B', '0.3', '01/03/2021', 3.1, '01/03/2021', 'ghi chú']
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    global.XLSX = XLSX;
    const fakeFile = { arrayBuffer: async () => buf };
    const parsed = await parseExcelFile(fakeFile);

    expect(parsed).toEqual([
      {
        'STT': 1,
        'Họ tên': 'Nguyễn Văn A',
        'Ngày sinh': '01/01/1980',
        'Chức vụ': 'Giáo viên',
        'Trường/Đơn vị': 'Trường A',
        'Phụ cấp Chức vụ': '0.2',
        'Phụ cấp Ngày hưởng': '01/01/2020',
        'Hệ số lương Hiện hưởng': 3.0,
        'Hệ số lương Ngày hưởng hiện tại': '01/01/2020',
        'Ghi chú': ''
      },
      {
        'STT': 2,
        'Họ tên': 'Trần Thị B',
        'Ngày sinh': '02/02/1985',
        'Chức vụ': 'Giáo viên',
        'Trường/Đơn vị': 'Trường B',
        'Phụ cấp Chức vụ': '0.3',
        'Phụ cấp Ngày hưởng': '01/03/2021',
        'Hệ số lương Hiện hưởng': 3.1,
        'Hệ số lương Ngày hưởng hiện tại': '01/03/2021',
        'Ghi chú': 'ghi chú'
      }
    ]);
  });
});

describe('parseExcelFile without numeric STT', () => {
  test('includes rows even when STT column is blank or non-numeric', async () => {
    const aoa = [
      ['STT', 'Họ tên', 'Tuổi'],
      ['', 'Alice', 30],
      ['N/A', 'Bob', 25]
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    global.XLSX = XLSX;
    const fakeFile = { arrayBuffer: async () => buf };
    const parsed = await parseExcelFile(fakeFile);

    expect(parsed).toEqual([
      { 'STT': '', 'Họ tên': 'Alice', 'Tuổi': 30 },
      { 'STT': 'N/A', 'Họ tên': 'Bob', 'Tuổi': 25 }
    ]);
  });
});

describe('parseExcelFile with three header rows', () => {
  test('merges nested headers deeper than two rows', async () => {
    const aoa = [
      ['Meta1'],
      ['Meta2'],
      ['TT', 'Họ tên', 'Thông tin lương', '', '', '', 'Phụ cấp', '', 'Ghi chú'],
      ['', '', 'Ngạch', 'Bậc', 'Hệ số', 'Hệ số', 'Chức vụ', 'Ngày hưởng', ''],
      ['', '', '', '', 'Hiện hưởng', 'Ngày hưởng', '', '', ''],
      [1, 'Nguyễn Văn A', 'A1', 1, 3.0, '01/01/2020', 'GV', '02/02/2021', ''],
      [2, 'Trần Thị B', 'A2', 2, 3.1, '03/03/2022', 'PHT', '04/04/2023', 'ghi chú']
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    global.XLSX = XLSX;
    const fakeFile = { arrayBuffer: async () => buf };
    const parsed = await parseExcelFile(fakeFile);

    expect(parsed).toEqual([
      {
        'TT': 1,
        'Họ tên': 'Nguyễn Văn A',
        'Thông tin lương Ngạch': 'A1',
        'Thông tin lương Bậc': 1,
        'Thông tin lương Hệ số Hiện hưởng': 3.0,
        'Thông tin lương Hệ số Ngày hưởng': '01/01/2020',
        'Phụ cấp Chức vụ': 'GV',
        'Phụ cấp Ngày hưởng': '02/02/2021',
        'Ghi chú': ''
      },
      {
        'TT': 2,
        'Họ tên': 'Trần Thị B',
        'Thông tin lương Ngạch': 'A2',
        'Thông tin lương Bậc': 2,
        'Thông tin lương Hệ số Hiện hưởng': 3.1,
        'Thông tin lương Hệ số Ngày hưởng': '03/03/2022',
        'Phụ cấp Chức vụ': 'PHT',
        'Phụ cấp Ngày hưởng': '04/04/2023',
        'Ghi chú': 'ghi chú'
      }
    ]);
  });
});

