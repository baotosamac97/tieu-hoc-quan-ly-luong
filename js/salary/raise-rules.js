const HE_SO_TABLE = {
  B: [1.86, 2.06, 2.26, 2.46, 2.66, 2.86, 3.06, 3.26, 3.46, 3.66, 3.86, 4.06],
  A0: [2.10, 2.41, 2.72, 3.03, 3.34, 3.65],
  A1: [2.34, 2.67, 3.00, 3.33, 3.66, 3.99, 4.32, 4.65, 4.98],
  'A2.2': [4.00, 4.34, 4.68, 5.02, 5.36, 5.70],
  A3: [6.20, 6.56, 6.92, 7.28, 7.64, 8.00]
};

export function intervalMonthsFromNgach(ngach) {
  switch (ngach) {
    case 'B':
      return 24;
    case 'A3':
      return 48;
    default:
      return 36;
  }
}

function parseHeSo(heso) {
  if (typeof heso === 'number') return heso;
  if (typeof heso === 'string') {
    const n = Number(heso.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function inferNgachFromHeSo(heso) {
  const n = parseHeSo(heso);
  if (n == null) return null;
  for (const [ngach, arr] of Object.entries(HE_SO_TABLE)) {
    if (arr.some(v => Math.abs(v - n) <= 0.001)) return ngach;
  }
  return null;
}

export function isLastStep(heso, ngach) {
  const n = parseHeSo(heso);
  if (n == null) return false;
  const g = ngach || inferNgachFromHeSo(n);
  if (!g || !HE_SO_TABLE[g]) return false;
  const arr = HE_SO_TABLE[g];
  return Math.abs(arr[arr.length - 1] - n) <= 0.001;
}

export { HE_SO_TABLE };
