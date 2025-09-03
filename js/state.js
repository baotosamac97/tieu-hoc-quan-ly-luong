const KEY = "qlLuongDatasetV1";

const slug = (s) => String(s ?? "")
  .toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim();

export function saveCache(rows) {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {}
}
export function loadCache() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function applySearch(rows, q) {
  const s = slug(q || "");
  if (!s) return [...rows];
  return rows.filter(r => {
    const hay = [
      r.name, r.role, r.unit, r.level, r.rank,
      r.rankCode, r.coefficient, r.note
    ].map(x => slug(String(x ?? ""))).join(" ");
    return hay.includes(s);
  });
}

export function applySort(rows, sort) {
  const { key, dir } = sort || {};
  if (!key) return [...rows];
  const arr = [...rows];
  arr.sort((a,b)=>{
    const va = a?.[key], vb = b?.[key];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    // ngày
    if (va instanceof Date || vb instanceof Date) {
      return dir * ((va?.getTime?.()||0) - (vb?.getTime?.()||0));
    }
    // số
    if (typeof va === "number" || typeof vb === "number") {
      return dir * ((Number(va)||0)-(Number(vb)||0));
    }
    // chuỗi
    return dir * String(va).localeCompare(String(vb), "vi", { sensitivity:"base" });
  });
  return arr;
}
