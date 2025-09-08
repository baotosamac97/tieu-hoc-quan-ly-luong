// js/parser.js
// Simple utilities to parse numbers, dates and convert an Excel sheet into a
// JSON array based on the first row headers.

export function parseNumber(x) {
  if (x == null || x === "") return null;
  let s = String(x).trim();
  if (!s) return null;
  s = s.replace(/\s+/g, "");
  let sign = 1;
  if (s.startsWith("-")) { sign = -1; s = s.slice(1); }
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "");
      const lastComma = s.lastIndexOf(",");
      s = s.replace(/,/g, (m, i) => i === lastComma ? "." : "");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    const last = parts[parts.length - 1];
    if (last.length === 3 && parts.length > 1) {
      s = parts.join("");
    } else {
      s = parts.slice(0, -1).join("") + "." + last;
    }
  } else if (hasDot) {
    const parts = s.split(".");
    const last = parts[parts.length - 1];
    if (last.length === 3 && parts.length > 1) {
      s = parts.join("");
    } else {
      s = parts.slice(0, -1).join("") + "." + last;
    }
  }
  const n = Number(s) * sign;
  return Number.isFinite(n) ? n : null;
}

export function parseDate(v) {
  if (!v) return null;
  if (typeof v === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 86400000);
  }
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);
  return null;
}

export async function parseExcelFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  if (rows.length === 0) return [];

  // Find the header row (usually contains terms like 'STT' or 'Họ tên').
  let headerRow = rows.findIndex(row =>
    row.some(cell => {
      if (typeof cell !== "string") return false;
      const s = cell.toLowerCase();
      return s.includes("stt") || s.includes("họ") || s.includes("ho tên") || s.includes("name");
    })
  );
  if (headerRow === -1) headerRow = 0;

  // Collect all header rows until a row appears to contain data. This allows
  // parsing sheets whose headers span more than two rows.
  const headerRows = [];
  let dataStart = headerRow + 1;
  for (let r = headerRow; r < rows.length; r++) {
    const row = rows[r] || [];
    const trimmed = row.map(h => String(h ?? "").trim());
    headerRows.push(trimmed);

    if (r > headerRow) {
      const looksData = row.some(cell => {
        if (typeof cell === "number") return true;
        if (typeof cell === "string" && /\d/.test(cell)) return true;
        return false;
      });
      if (looksData) {
        headerRows.pop();
        dataStart = r;
        break;
      }
    }
  }

  const maxLen = Math.max(...headerRows.map(r => r.length));
  const filled = [];
  for (let idx = 0; idx < headerRows.length; idx++) {
    const row = headerRows[idx];
    const out = [];
    let carry = "";
    for (let i = 0; i < maxLen; i++) {
      let cell = row[i] ?? "";
      cell = String(cell).trim();
      if (cell) {
        carry = cell;
      } else if (idx === 0) {
        cell = carry;
      } else if (idx !== headerRows.length - 1 && i > 0 && filled[idx - 1][i] === filled[idx - 1][i - 1]) {
        cell = carry;
      } else {
        carry = "";
      }
      out.push(cell);
    }
    filled.push(out);
  }

  const headers = [];
  for (let c = 0; c < maxLen; c++) {
    const parts = [];
    for (let r = 0; r < filled.length; r++) {
      const cell = filled[r][c];
      if (cell && (parts.length === 0 || parts[parts.length - 1] !== cell)) {
        parts.push(cell);
      }
    }
    headers[c] = parts.join(" ").trim();
  }

  const firstHeader = headers[0] ? headers[0].toLowerCase() : "";
  const expectNumericFirst = firstHeader === "stt" || firstHeader === "tt";
  const out = [];
  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r] || [];
    if (row.length === 0 || row.every(cell => cell == null || String(cell).trim() === "")) continue;

    // If the first column is "STT" but contains non-numeric values, keep the row
    // and attempt to coerce any digits. Previously such rows were skipped entirely
    // which caused "Không tìm thấy dữ liệu" errors for sheets where the STT column
    // was blank or used non-number markers.
    if (expectNumericFirst) {
      const raw = row[0];
      if (raw != null && String(raw).trim() !== "") {
        const digits = String(raw).replace(/[^0-9]/g, "");
        if (digits) {
          const n = Number(digits);
          if (!Number.isNaN(n)) row[0] = n;
        }
      }
    }

    const obj = {};
    headers.forEach((h, i) => {
      const key = h || `Column${i + 1}`;
      obj[key] = row[i] ?? "";
    });
    out.push(obj);
  }
  return out;
}
