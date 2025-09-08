import { parseExcelFile, parseDate, parseNumber } from './parser.js';
import { computeRaise } from './salary/compute.js';
import { formatDMY, parseDMY } from './date/dmy.js';

let data = [];
let view = [];
let editingIndex = -1;

const fileInput = document.getElementById('excelFile');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const importStatus = document.getElementById('importStatus');
const kpiHost = document.getElementById('kpiHost');
const tableRoot = document.getElementById('tableRoot');
const searchInput = document.getElementById('searchInput');
const filterRole = document.getElementById('filterRole');
const filterStep = document.getElementById('filterStep');
const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');

const editModal = document.getElementById('editModal');
const mName = document.getElementById('mName');
const mRole = document.getElementById('mRole');
const mStep = document.getElementById('mStep');
const mCoef = document.getElementById('mCoef');
const mCurrent = document.getElementById('mCurrent');
const mBirth = document.getElementById('mBirth');
const mNote = document.getElementById('mNote');
const mNext = document.getElementById('mNext');
const mRemain = document.getElementById('mRemain');
const mRetire = document.getElementById('mRetire');
const mCancel = document.getElementById('mCancel');
const mSave = document.getElementById('mSave');

function setStatus(message, type = 'info') {
  if (!importStatus) return;
  const cls = {
    info: 'text-slate-600',
    error: 'text-red-600',
    success: 'text-green-600'
  }[type] || 'text-slate-600';
  importStatus.className = `text-sm mb-4 ${cls}`;
  importStatus.textContent = message;
}

function parseRoman(str) {
  if (!str) return null;
  const roman = String(str).trim().toUpperCase();
  const map = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
  let prev = 0, total = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const val = map[roman[i]];
    if (!val) return null;
    if (val < prev) total -= val; else { total += val; prev = val; }
  }
  return total || null;
}

function toRoman(num) {
  if (!num || num <= 0) return '';
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const romans = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let n = num;
  let out = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { out += romans[i]; n -= vals[i]; }
  }
  return out;
}

// init step options
for (let i = 1; i <= 12; i++) {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = `Bậc ${toRoman(i)}`;
  filterStep.appendChild(opt);
}

function render() {
  view = getFiltered();
  renderKpis(view);
  renderTable(view);
  populateRoleOptions();
}

function getFiltered() {
  let rows = data.map((r, i) => ({ ...r, _idx: i }));
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    rows = rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)));
  }
  const role = filterRole.value;
  if (role) rows = rows.filter(r => r.role === role);
  const step = filterStep.value;
  if (step) rows = rows.filter(r => String(r.salaryStep) === step);
  const from = filterFrom.value ? new Date(filterFrom.value) : null;
  const to = filterTo.value ? new Date(filterTo.value) : null;
  if (from) rows = rows.filter(r => r.nextDate && new Date(r.nextDate) >= from);
  if (to) rows = rows.filter(r => r.nextDate && new Date(r.nextDate) <= to);
  return rows;
}

function populateRoleOptions() {
  const current = filterRole.value;
  const roles = Array.from(new Set(data.map(r => r.role).filter(Boolean)));
  filterRole.innerHTML = '<option value="">Chức danh</option>' + roles.map(r => `<option value="${r}">${r}</option>`).join('');
  filterRole.value = current;
}

function renderKpis(rows) {
  const total = rows.length;
  const roles = countBy(rows, r => (r.role || '').toLowerCase());
  const giaoVien = sumKeys(roles, ['giao vien', 'giáo viên']);
  const lanhDao = sumKeys(roles, ['hieu truong', 'hiệu trưởng', 'pho hieu truong', 'phó hiệu trưởng']);
  kpiHost.innerHTML = `
    ${kpi('Tổng nhân sự', total, 'bg-indigo-50 text-indigo-700')}
    ${kpi('Giáo viên', giaoVien, 'bg-emerald-50 text-emerald-700')}
    ${kpi('Lãnh đạo', lanhDao, 'bg-amber-50 text-amber-700')}
  `;
}

function renderTable(rows) {
  const headers = [
    ['stt', 'TT'],
    ['name', 'Họ tên'],
    ['role', 'Chức danh'],
    ['salaryStep', 'Bậc lương'],
    ['coefficient', 'Hệ số'],
    ['currentDate', 'Ngày hưởng hiện tại'],
    ['birthDate', 'Ngày sinh'],
    ['nextDate', 'Ngày tăng lương kế'],
    ['monthsLeft', 'Còn lại (tháng)'],
    ['retireDate', 'Ngày nghỉ hưu'],
    ['note', 'Ghi chú']
  ];
  const thead = `<thead class="bg-slate-50 sticky top-0"><tr>
    ${headers.map(([k, l]) => `<th class="px-3 py-2 text-left text-sm font-semibold text-slate-700">${l}</th>`).join('')}
  </tr></thead>`;
  const rowsHtml = rows.map(r => `
    <tr class="border-b hover:bg-slate-50 cursor-pointer" data-idx="${r._idx}">
      <td class="px-3 py-2">${r.stt ?? ''}</td>
      <td class="px-3 py-2">${safe(r.name)}</td>
      <td class="px-3 py-2">${safe(r.role)}</td>
      <td class="px-3 py-2">${r.salaryStep ? toRoman(r.salaryStep) : ''}</td>
      <td class="px-3 py-2">${r.coefficient ?? ''}</td>
      <td class="px-3 py-2">${r.currentDate ? new Date(r.currentDate).toLocaleDateString('vi-VN') : ''}</td>
      <td class="px-3 py-2">${r.birthDate ? new Date(r.birthDate).toLocaleDateString('vi-VN') : ''}</td>
      <td class="px-3 py-2">${r.nextDate ? new Date(r.nextDate).toLocaleDateString('vi-VN') : ''}</td>
      <td class="px-3 py-2">${r.monthsLeft ?? ''}</td>
      <td class="px-3 py-2">${r.retireDate ? new Date(r.retireDate).toLocaleDateString('vi-VN') : ''}</td>
      <td class="px-3 py-2">${safe(r.note)}</td>
    </tr>`).join('');
  tableRoot.innerHTML = `<table class="min-w-full text-sm">${thead}<tbody>${rowsHtml || `<tr><td class="px-3 py-6 text-slate-500" colspan="${headers.length}">Chưa có dữ liệu</td></tr>`}</tbody></table>`;
  tableRoot.querySelectorAll('tr[data-idx]').forEach(tr => {
    tr.addEventListener('click', () => openModal(Number(tr.dataset.idx)));
  });
}

function openModal(idx) {
  editingIndex = idx;
  const r = data[idx];
  mName.value = r.name || '';
  mRole.value = r.role || '';
  mStep.value = r.salaryStep || '';
  mCoef.value = r.coefficient ?? '';
  mCurrent.value = r.currentDate ? isoDate(r.currentDate) : '';
  mBirth.value = r.birthDate ? isoDate(r.birthDate) : '';
  mNote.value = r.note || '';
  updateModalDerived();
  editModal.classList.remove('hidden');
  editModal.classList.add('flex');
}

function closeModal() {
  editModal.classList.add('hidden');
  editModal.classList.remove('flex');
}

function updateModalDerived() {
  const temp = {
    salaryStep: mStep.value ? Number(mStep.value) : '',
    coefficient: mCoef.value ? Number(mCoef.value) : '',
    currentDate: mCurrent.value ? new Date(mCurrent.value) : null,
    birthDate: mBirth.value ? new Date(mBirth.value) : null,
    retireDate: editingIndex >= 0 ? data[editingIndex].retireDate : null,
    ngach: editingIndex >= 0 ? data[editingIndex].ngach : undefined
  };
  const d = computeDerived(temp);
  mNext.textContent = d.nextDate ? d.nextDate.toLocaleDateString('vi-VN') : '';
  mRetire.textContent = d.retireDate ? d.retireDate.toLocaleDateString('vi-VN') : '';
  mRemain.textContent = d.monthsLeft !== '' ? d.monthsLeft : '';
}

[mStep, mCurrent, mBirth].forEach(el => el.addEventListener('input', updateModalDerived));

mCancel.addEventListener('click', closeModal);
mSave.addEventListener('click', () => {
  if (editingIndex < 0) return;
  const r = data[editingIndex];
  r.name = mName.value.trim();
  r.role = mRole.value.trim();
  r.salaryStep = mStep.value ? Number(mStep.value) : '';
  r.coefficient = mCoef.value ? Number(mCoef.value) : '';
  r.currentDate = mCurrent.value ? new Date(mCurrent.value) : null;
  r.birthDate = mBirth.value ? new Date(mBirth.value) : null;
  r.note = mNote.value.trim();
  const d = computeDerived(r);
  r.nextDate = d.nextDate;
  r.monthsLeft = d.monthsLeft;
  r.retireDate = d.retireDate;
  closeModal();
  render();
});

function computeDerived(r) {
  const retireDate = r.retireDate || calcRetire(r.birthDate);
  const out = computeRaise({
    HeSo: r.coefficient,
    NgayHuongHienTai: r.currentDate ? formatDMY(r.currentDate) : undefined,
    NgayNghiHuu: retireDate ? formatDMY(retireDate) : undefined,
    BacLuong: r.salaryStep,
    Ngach: r.ngach
  });
  return {
    nextDate: out.NgayTangLuongKe ? parseDMY(out.NgayTangLuongKe) : null,
    monthsLeft: out.ConLaiThang,
    retireDate
  };
}

function calcRetire(birth) {
  if (!birth) return null;
  const d = new Date(birth);
  d.setFullYear(d.getFullYear() + 60);
  return d;
}

function isoDate(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    out[key] = v;
    if (key.startsWith('hangtuongduong')) out.hangtuongduong = v;
  }
  return out;
}

function pickString(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function pickNumber(obj, keys, max = Infinity) {
  for (const k of keys) {
    const n = parseNumber(obj[k]);
    if (n != null && n < max) return n;
  }
  return '';
}

function pickStep(obj, keys, max = Infinity) {
  for (const k of keys) {
    const v = obj[k];
    if (v == null || String(v).trim() === '') continue;
    const roman = parseRoman(v);
    if (roman != null && roman < max) return roman;
    const n = parseNumber(v);
    if (n != null && n < max) return n;
  }
  return '';
}

function pickDate(obj, keys) {
  for (const k of keys) {
    const d = parseDate(obj[k]);
    if (d) return d;
  }
  return null;
}

function pickCoefficient(obj) {
  const keys = Object.keys(obj).filter(k =>
    k.includes('heso') || k.includes('hesoluong') || k.includes('coefficient')
  );
  for (const k of keys) {
    const n = parseNumber(obj[k]);
    if (n != null && n < 20) return n;
  }
  return '';
}

importBtn.addEventListener('click', async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) { setStatus('Vui lòng chọn file Excel trước!', 'error'); return; }
  try {
    setStatus('Đang đọc file...', 'info');
    const parsed = await parseExcelFile(file);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      setStatus('Không tìm thấy dữ liệu trong file Excel.', 'error');
      return;
    }
    setStatus('Đang xử lý dữ liệu...', 'info');
    data = parsed
      .map(raw => {
        const r = normalizeRow(raw);
        const obj = {
          stt: parseNumber(r.tt ?? r.stt) ?? '',
          name: pickString(r, ['name','hoten','hovaten','ten']),
          role: pickString(r, [
            'role',
            'chucdanh',
            'chucvu',
            'chucvuhoacchucdanhcongtac',
            'chucdanhnghenghiep',
            'vitri',
            'vitricongtac',
            'vitricongviec',
            'vitricongvieclam',
            'vitrivieclam'
          ]),
          salaryStep: pickStep(r, ['salarystep','bac','bacluong','bacluonghienhuong','hangtuongduong'], 20),
          coefficient: pickCoefficient(r),
          currentDate: pickDate(r, ['effectivedate','ngayhuonghientai','tungay','ngayhienhuong','ngayhuong']),
          birthDate: pickDate(r, ['birthdate','ngaysinh','ngaysinhnhat','ngaythangnamsinh']),
          ngach: pickString(r, ['ngach','nhomngach','mangach']),
          retireDate: pickDate(r, ['ngaynghihuu']),
          nextDate: null,
          monthsLeft: '',
          note: pickString(r, ['note','ghichu'])
        };
        if (!obj.name) return null;
        return { ...obj, ...computeDerived(obj) };
      })
      .filter(Boolean);
    populateRoleOptions();
    render();
    setStatus(`Đã nhập ${data.length} dòng dữ liệu.`, 'success');
  } catch (e) {
    console.error(e);
    setStatus('Lỗi đọc file: ' + e.message, 'error');
  }
});

exportBtn.addEventListener('click', () => exportToExcel(data));

[searchInput, filterRole, filterStep, filterFrom, filterTo].forEach(el => {
  el.addEventListener('input', render);
});

function kpi(label, value, cls) {
  return `<div class="p-4 rounded-xl border border-slate-100 ${cls}">
    <div class="text-sm opacity-70">${label}</div>
    <div class="text-2xl font-bold mt-1">${value}</div>
  </div>`;
}

function countBy(arr, fn) {
  const m = {};
  for (const it of arr) {
    const k = fn(it) || '';
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

function sumKeys(obj, keys) {
  return keys.reduce((s, k) => s + (obj[k] || 0), 0);
}

function safe(s) {
  return (s == null ? '' : String(s)).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

function exportToExcel(rows) {
  if (!rows.length) { alert('Không có dữ liệu để xuất.'); return; }
  const data = rows.map(r => ({
    'TT': r.stt || '',
    'Họ tên': r.name || '',
    'Chức danh': r.role || '',
    'Bậc lương': r.salaryStep ? toRoman(r.salaryStep) : '',
    'Hệ số': r.coefficient ?? '',
    'Ngày hưởng hiện tại': r.currentDate ? formatDMY(r.currentDate) : '',
    'Ngày sinh': r.birthDate ? formatDMY(r.birthDate) : '',
    'Ngày tăng lương kế': r.nextDate ? formatDMY(r.nextDate) : '',
    'Còn lại (tháng)': r.monthsLeft ?? '',
    'Ngày nghỉ hưu': r.retireDate ? formatDMY(r.retireDate) : '',
    'Ghi chú': r.note || ''
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'NhanVien');
  XLSX.writeFile(wb, `NhanVien_${new Date().toISOString().slice(0,10)}.xlsx`);
}

render();
