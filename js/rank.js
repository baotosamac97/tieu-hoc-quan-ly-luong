// Logic nhận diện Cấp học + Hạng và làm sạch dữ liệu hạng

export function schoolLevelFromCode(code = "") {
  const c = (code || "").toUpperCase();
  if (c.includes("V.07.02")) return "Mầm non";
  if (c.includes("V.07.03")) return "Tiểu học";
  if (c.includes("V.07.04")) return "THCS";
  if (c.includes("V.07.05")) return "THPT";
  return "";
}

// Nhận diện "Hạng I/II/III" từ chuỗi tự do (tránh số/Ngày)
export function parseRankText(text = "") {
  const t = String(text || "").trim();
  if (!t) return "";
  // Loại bỏ trường hợp là số thuần hoặc ngày
  if (/^[0-9\s]+$/.test(t)) return "";
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(t)) return "";

  const s = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // chấp nhận "hang i", "hạng ii", "I/II/III"…
  if (/(^|\s)hang\s*i(\s|$)|(^|\s)i(\s|$)/.test(s)) return "Hạng I";
  if (/(^|\s)hang\s*ii(\s|$)|(^|\s)ii(\s|$)/.test(s)) return "Hạng II";
  if (/(^|\s)hang\s*iii(\s|$)|(^|\s)iii(\s|$)/.test(s)) return "Hạng III";
  return "";
}

// SUY HẠNG từ 2 số cuối mã (thêm cặp 27/28/29 và 30/31/32)
export function rankFromCodeSuffix(code = "") {
  const c = (code || "").toUpperCase().replace(/\s+/g, "");
  if (/\.(27|30)$/.test(c)) return "Hạng I";
  if (/\.(28|31)$/.test(c)) return "Hạng II";
  if (/\.(29|32)$/.test(c)) return "Hạng III";
  return "";
}
