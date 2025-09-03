import { schoolLevelFromCode, parseRankText, rankFromCodeSuffix } from "./rank.js";

const isBadCoef = (s) =>
  s.includes("phu cap") || s.includes("pc ") || s.includes("chenh") || s.includes("vuot") || s.includes("khu vuc");

const norm = (s) => (s == null ? "" : String(s).trim());
const slug = (s) =>
  norm(s)
    .toLowerCase()
    .replace(/\r?\n+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseDate = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number") { const d = new Date(1900,0,1); d.setDate(d.getDate()+v-2); return isNaN(d)?null:d; }
  const d = new Date(v); if(!isNaN(d)) return d;
  const m = String(v).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) { const d2 = new Date(+m[3], +m[2]-1, +m[1]); return isNaN(d2)?null:d2; }
  return null;
};

function concatTopHeaders(aoa, n = 12) {
  const cols = Math.max(...aoa.slice(0, n).map((r) => r.length), 0);
  return Array.from({ length: cols }, (_, j) => {
    const parts = [];
    for (let i = 0; i < Math.min(n, aoa.length); i++) {
      const cell = aoa[i]?.[j];
      if (cell != null && String(cell).trim() !== "") parts.push(String(cell));
    }
    return parts.join(" ");
  });
}

function mapColumns(aoa) {
  const headers = concatTopHeaders(aoa, 12).map(slug);
  const idx = {};

  // Họ tên
  for (let j = 0; j < headers.length; j++) {
    const s = headers[j];
    if (s.includes("ho va ten") || s.includes("ho ten") || s.includes("hovaten") || s.includes("ten gv") || s === "ten" || s.includes("full name")) { idx.name = j; break; }
  }

  // Hệ số lương
  for (let j = 0; j < headers.length && idx.coefficient == null; j++) { const s = headers[j]; if (s.includes("he so") && s.includes("luong") && !isBadCoef(s)) idx.coefficient = j; }
  for (let j = 0; j < headers.length && idx.coefficient == null; j++) { const s = headers[j]; if ((s.includes("hsl") || s.includes("hs luong") || s === "he so") && !isBadCoef(s)) idx.coefficient = j; }

  // Cột khác
  headers.forEach((s, j) => {
    if (idx.role == null && (s.includes("chuc vu") || s.includes("chuc danh cong tac") || s.includes("chuc danh") || s.includes("vi tri cong tac"))) idx.role = j;
    if (idx.unit == null && (s.includes("don vi") || s.includes("truong tieu hoc") || (s.includes("co quan") && s.includes("don vi")))) idx.unit = j;
    if (idx.rank == null && (s.includes("cdnn") && s.includes("hang"))) idx.rank = j; // text hạng
    if (idx.rankCode == null && (s.includes("ma chuc danh nghe nghiep") || s.includes("ma cdnn") || s.includes("ma so cdnn"))) idx.rankCode = j;
    if (idx.effectiveDate == null && (s.includes("ngay huong") || s.includes("ngay ap dung"))) idx.effectiveDate = j;
    if (idx.note == null && s.includes("ghi chu")) idx.note = j;
  });

  return idx;
}

function findStartRow(aoa, nameCol, n = 12) {
  // bỏ qua các hàng tiêu đề/ghi chú
  for (let i = n; i < aoa.length; i++) {
    const v = slug(aoa[i]?.[nameCol]);
    if (v && !["ten", "ho va ten", "ho ten"].includes(v)) return i;
  }
  for (let i = 0; i < aoa.length; i++) {
    const v = slug(aoa[i]?.[nameCol]);
    if (v && !["ten", "ho va ten", "ho ten"].includes(v)) return i;
  }
  return null;
}

function pickBestSheet(wb) {
  let best = null;
  for (const sheet of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: true });
    if (!aoa || aoa.length === 0) continue;
    const idx = mapColumns(aoa);
    if (idx.name == null || idx.coefficient == null) continue;
    const start = findStartRow(aoa, idx.name, 12);
    if (start == null) continue;

    const rows = [];
    for (let i = start; i < aoa.length; i++) {
      const row = aoa[i] || [];
      const nameCell = row[idx.name];
      if (!nameCell || !String(nameCell).trim()) continue;      // chỉ bỏ nếu không có HỌ TÊN

      const rankCodeRaw = idx.rankCode != null ? norm(row[idx.rankCode]) : "";
      const rankTextRaw = idx.rank != null ? norm(row[idx.rank]) : "";

      const level = schoolLevelFromCode(rankCodeRaw);
      const rankTextClean = parseRankText(rankTextRaw);
      const rank = rankTextClean || rankFromCodeSuffix(rankCodeRaw);

      rows.push({
        name: norm(row[idx.name]),
        role: idx.role != null ? norm(row[idx.role]) : "",      // ✅ giữ nguyên Hiệu trưởng/PHT nếu có
        unit: idx.unit != null ? norm(row[idx.unit]) : "",
        level,                                                  // CẤP HỌC
        rank,                                                   // HẠNG
        rankCode: rankCodeRaw,
        coefficient: idx.coefficient != null && row[idx.coefficient] != null ? parseFloat(row[idx.coefficient]) : null,
        effectiveDate: idx.effectiveDate != null ? parseDate(row[idx.effectiveDate]) : null,
        note: idx.note != null ? norm(row[idx.note]) : "",
      });
    }
    if (rows.length) { best = { sheet, rows }; break; }
  }
  if (!best) throw new Error('Không tìm được sheet hợp lệ có đủ "Họ và tên" & "Hệ số lương".');
  return best;
}

export async function parseExcelFile(file) {
  if (typeof XLSX === "undefined") throw new Error("Chưa tải được XLSX.");
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  const { sheet, rows } = pickBestSheet(wb);
  console.log("Using sheet:", sheet, "records:", rows.length);
  return rows;
}
