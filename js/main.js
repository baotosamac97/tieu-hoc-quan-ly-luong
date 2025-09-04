// Simplified web app for managing employee data
// Provides three core functions: import from Excel, edit in-place and export back to Excel.

import { parseExcelFile } from './parser.js';

let data = [];

const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const fileInput = document.getElementById('excelFile');
const tableContainer = document.getElementById('tableContainer');
const importStatus = document.getElementById('importStatus');

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

/**
 * Render the current `data` array as a table with editable cells. Tailwind classes are used
 * for basic styling. When a cell loses focus (blur event), the underlying data array is
 * updated with the new value.
 */
function renderTable() {
  if (!Array.isArray(data) || data.length === 0) {
    tableContainer.innerHTML = '<p class="text-gray-500">Chưa có dữ liệu.</p>';
    return;
  }
  const headers = Object.keys(data[0]);
  let html = '<table class="min-w-full border divide-y divide-gray-200">';
  html += '<thead class="bg-gray-50"><tr>';
  headers.forEach((h) => {
    html += `<th class="px-3 py-2 text-left text-sm font-medium text-gray-700">${h}</th>`;
  });
  html += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';
  data.forEach((row, rowIndex) => {
    html += '<tr>';
    headers.forEach((key) => {
      const cellValue = row[key] !== undefined ? row[key] : '';
      html += `<td contenteditable="true" data-row="${rowIndex}" data-key="${key}" class="px-3 py-2 text-sm whitespace-nowrap">${cellValue}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  tableContainer.innerHTML = html;
  // Bind blur handlers to update data
  tableContainer.querySelectorAll('td[contenteditable="true"]').forEach((td) => {
    td.addEventListener('blur', () => {
      const rowIndex = parseInt(td.dataset.row, 10);
      const key = td.dataset.key;
      data[rowIndex][key] = td.innerText;
    });
  });
}

async function handleImport() {
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    setStatus('Vui lòng chọn file Excel trước!', 'error');
    return;
  }
  try {
    setStatus('Đang đọc file...', 'info');
    const parsed = await parseExcelFile(file);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      setStatus('Không tìm thấy dữ liệu hợp lệ trong file.', 'error');
      return;
    }
    data = parsed;
    renderTable();
    setStatus(`Đã nhập ${data.length} dòng dữ liệu.`, 'success');
  } catch (err) {
    console.error('Lỗi đọc file:', err);
    setStatus(`Định dạng file không hợp lệ: ${err.message}`, 'error');
  }
}

/**
 * Export the current `data` array into an Excel file. Uses xlsx utils to
 * convert JSON to sheet, then triggers download.
 */
function handleExport() {
  if (!Array.isArray(data) || data.length === 0) {
    alert('Không có dữ liệu để xuất.');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, 'export.xlsx');
}

// Attach event listeners
importBtn.addEventListener('click', handleImport);
exportBtn.addEventListener('click', handleExport);
