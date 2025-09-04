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

describe('parseExcelFile special format', () => {
  test('parses table with gender columns', async () => {
    const aoa = [
      [], [], [], [], [],
      ["TT", "Họ và tên", "Ngày sinh", "", "Chức vụ", "Thuộc xã/phường", "Cơ quan", "Ngày bắt đầu giữ CDNN", "Mức lương hiện hưởng", "", "", "", "", "Ghi chú"],
      ["", "", "Nam", "Nữ", "", "", "", "", "Hạng tương đương", "Chức danh nghề nghiệp hiện hưởng", "Mã chức danh nghề nghiệp", "Hệ số lương", "Ngày hưởng", ""],
      [1, "Nguyen Van A", "02/03/2000", "", "Giáo viên", "Phường 1", "Trường A", "01/01/2015", "Tiểu học", "GV hạng II", "12345", "3,66", "01/04/2024", "Ghi chú A"],
      [2, "Tran Thi B", "", "03/03/2001", "Hiệu trưởng", "Xã 2", "Trường B", "01/09/2016", "Tiểu học", "Hiệu trưởng", "67890", "4", "01/05/2023", ""]
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    global.XLSX = XLSX;
    const fakeFile = { arrayBuffer: async () => buf };
    const parsed = await parseExcelFile(fakeFile);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      name: 'Nguyen Van A',
      gender: 'Nam',
      role: 'Giáo viên',
      rank: 'GV hạng II',
      rankCode: '12345'
    });
    expect(parsed[1]).toMatchObject({
      name: 'Tran Thi B',
      gender: 'Nữ',
      role: 'Hiệu trưởng',
      rank: 'Hiệu trưởng',
      rankCode: '67890'
    });
  });
});

