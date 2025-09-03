import { parseExcelFile } from "./parser.js";
import { saveCache, loadCache, applySearch, applySort } from "./state.js";
import { renderKpis, renderTable, exportToExcel } from "./ui.js";
import { showVerifyModal } from "./verify.js";
import { setupAuthUI } from "./auth.js";
import { saveDatasetToFirebase, loadLatestDatasetFromFirebase } from "./repo.js";

let fullRecords = loadCache();
let viewRecords = [];
let sortState = { key: null, dir: 1 };

function refresh() {
  const q = document.getElementById("searchInput")?.value || "";
  viewRecords = applySearch(fullRecords, q);
  viewRecords = applySort(viewRecords, sortState);
  renderKpis(viewRecords, document.getElementById("rankChips"), document.getElementById("excelKpis"));
  renderTable(viewRecords, sortState);
}

document.getElementById("uploadExcelBtn")?.addEventListener("click", async () => {
  const file = document.getElementById("excelFileInput").files?.[0];
  if (!file) { alert("Vui lòng chọn file Excel!"); return; }
  try {
    const parsed = await parseExcelFile(file);
    // VERIFY trước khi đổ vào UI
    showVerifyModal(parsed, () => {
      fullRecords = parsed;
      saveCache(fullRecords);
      sortState = { key: null, dir: 1 };
      document.getElementById("searchInput").value = "";
      refresh();
      alert(`✅ Đã import ${fullRecords.length} dòng.`);
    }, () => {});
  } catch (err) {
    console.error(err);
    alert("Lỗi import: " + (err?.message || err));
  }
});

document.getElementById("exportExcelBtn")?.addEventListener("click", () => exportToExcel(viewRecords));
document.getElementById("searchInput")?.addEventListener("input", refresh);

window.addEventListener("sortChange", (e) => {
  const key = e.detail;
  if (sortState.key === key) sortState.dir *= -1;
  else { sortState.key = key; sortState.dir = 1; }
  refresh();
});

// Firebase buttons (enable theo role)
const saveBtn = document.getElementById("saveFirebaseBtn");
const loadBtn = document.getElementById("loadFirebaseBtn");

saveBtn?.addEventListener("click", async ()=>{
  try{
    if (!fullRecords.length) { alert("Chưa có dữ liệu để lưu."); return; }
    const id = await saveDatasetToFirebase(fullRecords, { note: "manual save" });
    alert(`☁️ Đã lưu dataset (id: ${id}).`);
  }catch(e){ alert("Lỗi lưu Firebase: "+(e?.message||e)); }
});

loadBtn?.addEventListener("click", async ()=>{
  try{
    const snap = await loadLatestDatasetFromFirebase();
    if (!snap) { alert("Chưa có dataset nào trên Firebase."); return; }
    fullRecords = snap.rows || [];
    saveCache(fullRecords);
    sortState = { key: null, dir: 1 };
    document.getElementById("searchInput").value = "";
    refresh();
    alert(`☁️ Đã tải dataset: ${fullRecords.length} dòng.`);
  }catch(e){ alert("Lỗi tải Firebase: "+(e?.message||e)); }
});

// Auth & role
setupAuthUI((session)=>{
  const role = session?.role || "viewer";
  const canWrite = (role === "editor" || role === "admin");
  if (saveBtn) saveBtn.disabled = !canWrite;
  if (loadBtn) loadBtn.disabled = !session;
});

// khởi động
refresh();

// tiện ích: hiển thị lỗi JS nếu có để debug nhanh
window.addEventListener("error", (e)=>{
  const msg = String(e?.error?.message || e.message || e);
  console.error("JS error:", msg);
});
