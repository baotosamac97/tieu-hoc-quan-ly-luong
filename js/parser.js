// js/parser.js
// Parse Excel → mảng {name, role, unit, level, rank, rankCode, coefficient, effectiveDate, note}
function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim();
}
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
  // Excel serial
  if (typeof v === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 86400000);
  }
  const s = String(v).trim();
  if (!s) return null;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  // yyyy-mm-dd or other formats parsable by Date
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);
  return null;
}
function unifyRole(raw) {
  const t = norm(raw);
  if (!t) return "";
  if (t.includes("pho hieu truong")) return "Phó Hiệu trưởng";
  if (t.includes("hieu truong")) return "Hiệu trưởng";
  if (t.includes("tpt") || t.includes("tong phu trach")) return "TPT Đội";
  if (t.includes("giao vien")) return "Giáo viên";
  return raw || "";
}
function splitCdnnHang(val) {
  // Ví dụ: "Tiểu học – 38808" hoặc "Tiểu học - 05/07/2010"
  const s = String(val ?? "").replace(/–/g, "-");
  const [p1, p2] = s.split("-").map(x => String(x || "").trim());
  let level = p1 || "";
  let rankCode = "";
  let possibleDate = null;
  if (p2) {
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(p2)) {
      possibleDate = parseDate(p2);
    } else if (/^\d{3,}$/.test(p2)) {
      rankCode = p2;
    }
  }
  return { level, rankCode, possibleDate };
}

export async function parseExcelFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  // tìm dòng header
  let hi = 0;
  const pick = (row, keys) => {
    const idx = {};
    row.forEach((cell, i) => {
      const n = norm(cell);
      keys.forEach(keyArr => {
        keyArr.forEach(k => {
          // Một số file Excel có thể ghi thêm chú thích vào tiêu đề,
          // ví dụ "Họ và tên (ghi chữ in hoa)". Ta dùng `includes` thay vì
          // so sánh tuyệt đối để bắt được các trường hợp như vậy.
          if (n.includes(norm(k))) idx[keyArr[0]] = i;
        });
      });
    });
    return idx;
  };

  const keys = [
    ["Họ và tên","Họ tên","Ho va ten","Ho ten"],
    ["Chức danh","Chuc danh","Chuc vu","Chức vụ","Chức danh nghề nghiệp","Chuc danh nghe nghiep"],
    ["Đơn vị","Don vi"],
    ["CDNN/Hạng","CDNN/Hang","CDNN","Hạng","Hang","CDNN - Hạng"],
    ["Mã CDNN","Ma CDNN","Mã số CDNN","Ma so CDNN","Mã số","Ma so"],
    ["Hệ số","He so","Hệ số lương","He so luong"],
    ["Ngày hưởng","Ngay huong","Ngày hiệu lực","Ngay hieu luc"],
    ["Cấp học","Cap hoc"],
    ["Ghi chú","Ghi chu","Ghi chú"]
  ];

  let map = {};
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    map = pick(rows[i], keys);
    if (map["Họ và tên"] != null) { hi = i; break; }
  }
  if (map["Họ và tên"] == null) throw new Error("Không tìm thấy cột 'Họ và tên'");

  const out = [];
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const name = String(row[map["Họ và tên"]] ?? "").trim();
    if (!name) continue;

    const rawRole = row[map["Chức danh"]];
    const unit = row[map["Đơn vị"]];
    const cdnnHang = row[map["CDNN/Hạng"]];
    const maCdnn = row[map["Mã CDNN"]];
    const coef = parseNumber(row[map["Hệ số"]]);
    const ngayHuongRaw = row[map["Ngày hưởng"]];
    const levelCol = row[map["Cấp học"]];
    const note = row[map["Ghi chú"]];

    let { level, rankCode, possibleDate } = splitCdnnHang(cdnnHang);
    if (!level && levelCol) level = String(levelCol);
    if (!rankCode && maCdnn) rankCode = String(maCdnn);

    const effectiveDate = parseDate(ngayHuongRaw) || possibleDate || null;

    out.push({
      name,
      role: unifyRole(rawRole),
      unit: unit || "",
      level: level || "",
      rank: "",            // nếu file sau này có cột Hạng riêng thì fill vào đây
      rankCode: rankCode || "",
      coefficient: coef,
      effectiveDate,
      note: note || ""
    });
  }
  return out;
}
