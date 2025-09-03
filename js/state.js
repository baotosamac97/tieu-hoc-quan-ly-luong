export const STORAGE_KEY = "gv_records_cached_v4";

export function saveCache(records) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      records.map((r) => ({
        ...r,
        effectiveDate: r.effectiveDate ? r.effectiveDate.toISOString() : null,
      }))
    )
  );
}
export function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return arr.map((r) => ({ ...r, effectiveDate: r.effectiveDate ? new Date(r.effectiveDate) : null }));
  } catch {
    return [];
  }
}

export function applySearch(records, q) {
  const key = (q || "").toLowerCase();
  if (!key) return [...records];
  return records.filter((r) =>
    [r.name, r.role, r.unit, r.level, r.rank, r.rankCode].join(" ").toLowerCase().includes(key)
  );
}

export function applySort(records, sortState) {
  if (!sortState.key) return records;
  const { key, dir } = sortState;
  return [...records].sort((a, b) => {
    const va = a[key] == null ? "" : a[key];
    const vb = b[key] == null ? "" : b[key];
    if (key === "coefficient") return ((va || 0) - (vb || 0)) * dir;
    if (key === "effectiveDate") {
      const da = a[key] ? a[key].getTime() : 0;
      const db = b[key] ? b[key].getTime() : 0;
      return (da - db) * dir;
    }
    return String(va).localeCompare(String(vb), "vi") * dir;
  });
}
