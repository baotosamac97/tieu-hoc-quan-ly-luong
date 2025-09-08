import { intervalMonthsFromNgach, inferNgachFromHeSo, isLastStep } from './raise-rules.js';
import { parseDMY, formatDMY, addMonthsClampEndOfMonth, fullMonthsBetween } from '../date/dmy.js';

export function computeRaise(row, today = new Date()) {
  const heSo = typeof row.HeSo === 'string'
    ? Number(row.HeSo.replace(',', '.'))
    : row.HeSo;
  const ngach = row.Ngach || inferNgachFromHeSo(heSo);
  const current = row.NgayHuongHienTai ? parseDMY(row.NgayHuongHienTai) : null;
  if (!current || (heSo == null && !ngach)) return { NgayTangLuongKe: '', ConLaiThang: 0 };
  if (isLastStep(heSo, ngach)) return { NgayTangLuongKe: '', ConLaiThang: 0 };
  const interval = ngach ? intervalMonthsFromNgach(ngach) : 36;
  const next = addMonthsClampEndOfMonth(current, interval);
  const retire = row.NgayNghiHuu ? parseDMY(row.NgayNghiHuu) : null;
  if (retire && retire < next) return { NgayTangLuongKe: '', ConLaiThang: 0 };
  const months = fullMonthsBetween(today, next);
  return { NgayTangLuongKe: formatDMY(next), ConLaiThang: months };
}

export { intervalMonthsFromNgach, inferNgachFromHeSo, isLastStep };
