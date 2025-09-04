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

  const primary = rows[headerRow].map(h => String(h ?? "").trim());
  const next = rows[headerRow + 1] || [];
  let headers = primary;
  let dataStart = headerRow + 1;

  const hasEmpty = primary.some(h => !h);
  if (hasEmpty) {
    const firstCell = next[0];
    const nextIsData = next.length > 0 && (typeof firstCell === "number" || /^\d+$/.test(String(firstCell)));
    if (!nextIsData) {
      const secondary = next.map(h => String(h ?? "").trim());
      const maxLen = Math.max(primary.length, secondary.length);
      headers = [];
      let carry = "";
      for (let i = 0; i < maxLen; i++) {
        if (primary[i]) carry = primary[i];
        const top = carry;
        const bottom = secondary[i] || "";
        headers.push(`${top} ${bottom}`.trim());
      }
      dataStart = headerRow + 2;
    }
  }

  const expectNumericFirst = headers[0] && headers[0].toLowerCase() === "stt";
  const out = [];
  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r] || [];
    if (row.length === 0 || row.every(cell => cell == null || String(cell).trim() === "")) continue;
    if (expectNumericFirst) {
      const v = row[0];
      if (v == null || v === "" || Number.isNaN(Number(v))) continue;
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
