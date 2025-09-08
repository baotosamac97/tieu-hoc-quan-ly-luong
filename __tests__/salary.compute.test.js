import { computeRaise } from '../js/salary/compute.js';

describe('computeRaise', () => {
  test('A1 3.33 at 01/11/2023 -> 01/11/2026', () => {
    const r = computeRaise({ HeSo: 3.33, Ngach: 'A1', NgayHuongHienTai: '01/11/2023' }, new Date('2023-11-01'));
    expect(r.NgayTangLuongKe).toBe('01/11/2026');
    expect(r.ConLaiThang).toBe(36);
  });

  test('A2.2 4.68 -> +36 months', () => {
    const r = computeRaise({ HeSo: 4.68, Ngach: 'A2.2', NgayHuongHienTai: '01/01/2020' }, new Date('2020-01-01'));
    expect(r.NgayTangLuongKe).toBe('01/01/2023');
    expect(r.ConLaiThang).toBe(36);
  });

  test('B 2.46 -> +24 months', () => {
    const r = computeRaise({ HeSo: 2.46, Ngach: 'B', NgayHuongHienTai: '15/05/2022' }, new Date('2022-05-15'));
    expect(r.NgayTangLuongKe).toBe('15/05/2024');
    expect(r.ConLaiThang).toBe(24);
  });

  test('A3 6.20 -> +48 months', () => {
    const r = computeRaise({ HeSo: 6.20, Ngach: 'A3', NgayHuongHienTai: '01/01/2020' }, new Date('2020-01-01'));
    expect(r.NgayTangLuongKe).toBe('01/01/2024');
    expect(r.ConLaiThang).toBe(48);
  });

  test('Retirement earlier than next raise', () => {
    const r = computeRaise({ HeSo: 3.33, Ngach: 'A1', NgayHuongHienTai: '01/01/2020', NgayNghiHuu: '01/01/2021' }, new Date('2020-01-01'));
    expect(r.NgayTangLuongKe).toBe('');
    expect(r.ConLaiThang).toBe(0);
  });

  test('Last step A1 4.98', () => {
    const r = computeRaise({ HeSo: 4.98, Ngach: 'A1', NgayHuongHienTai: '01/01/2020' }, new Date('2020-01-01'));
    expect(r.NgayTangLuongKe).toBe('');
    expect(r.ConLaiThang).toBe(0);
  });

  test('Comma decimal 5,70 parsed correctly', () => {
    const r = computeRaise({ HeSo: '5,70', Ngach: 'A2.2', NgayHuongHienTai: '01/01/2020' }, new Date('2020-01-01'));
    expect(r.NgayTangLuongKe).toBe('');
    expect(r.ConLaiThang).toBe(0);
  });
});
