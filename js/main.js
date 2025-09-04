// Simplified web app for managing employee data
// Provides three core functions: import from Excel, edit in-place and export back to Excel.

let data = [];

const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const fileInput = document.getElementById('excelFile');
const tableContainer = document.getElementById('tableContainer');

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

/**
 * Detect the header row in an array-of-arrays extracted from a worksheet. The heuristic
 * chooses the row with the most non-empty cells (minimum of 3) among the first 20 rows.
 * Returns the index of the detected header row.
 */
function detectHeaderRow(rows) {
  let headerIndex = 0;
  let maxCount = 0;
  const maxSearch = Math.min(rows.length, 20);
  for (let i = 0; i < maxSearch; i++) {
    const row = rows[i];
    const count = row.filter((cell) => String(cell).trim() !== '').length;
    if (count >= 3 && count > maxCount) {
      maxCount = count;
      headerIndex = i;
    }
  }
  return headerIndex;
}

/**
 * Convert worksheet data (array-of-arrays) into an array of objects. Uses the provided
 * header index to determine column names; empty header values are replaced with
 * generic names like "Cột 1".
 */
function rowsToObjects(rows, headerIndex) {
  const headers = rows[headerIndex].map((cell, idx) => {
    const key = String(cell).trim();
    return key !== '' ? key : `Cột ${idx + 1}`;
  });
  const objs = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => String(cell).trim() === '')) continue;
    const obj = {};
    headers.forEach((key, idx) => {
      obj[key] = row[idx] !== undefined ? row[idx] : '';
    });
    objs.push(obj);
  }
  return objs;
}

/**
 * Handle importing an Excel file. Reads the file as an ArrayBuffer, parses it with
 * XLSX.read and converts the first sheet to a JSON array using header detection.
 */
function handleImport() {
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    alert('Vui lòng chọn file Excel trước!');
    return;
  }
  const reader = new FileReader();
  reader.onload = (evt) => {
    const arrayBuffer = evt.target.result;
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rows || rows.length === 0) {
        alert('Không tìm thấy dữ liệu trong file.');
        return;
      }
      const headerIndex = detectHeaderRow(rows);
      const extracted = rowsToObjects(rows, headerIndex);
      if (extracted.length === 0) {
        alert('Không tìm thấy dữ liệu hợp lệ sau hàng tiêu đề.');
        return;
      }
      data = extracted;
      renderTable();
    } catch (err) {
      console.error('Lỗi đọc file:', err);
      alert('File không hợp lệ hoặc không thể đọc.');
    }
  };
  reader.readAsArrayBuffer(file);
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