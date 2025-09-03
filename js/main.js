import { parseExcelFile } from "./parser.js";
import { saveCache, loadCache, applySearch, applySort } from "./state.js";
import { renderKpis, renderCharts, renderTable, exportToExcel } from "./ui.js";
import { showVerifyModal } from "./verify.js";
import { setupAuthUI } from "./auth.js";
import { saveDatasetToFirebase, loadLatestDatasetFromFirebase } from "./repo.js";

let fullRecords = loadCache();
let viewRecords = [];
let sortState = { key: null, dir: 1 };
let currentUser = null;

function refresh() {
  const q = document.getElementById("searchInput").value;
  viewRecords = applySearch(fullRecords, q);
  viewRecords = applySort(viewRecords, sortState);
  renderKpis(viewRecords, document.getElementById("rankChips"), document.getElementById("excelKpis"));
  renderCharts(viewRecords);
  renderTable(viewRecords, sortState);
}

document.getElementById("uploadExcelBtn")?.addEventListener("click", async () => {
  const file = document.getElementById("excelFileInput").files?.[0];
  if (!file) { alert("Vui lòng chọn file Excel!"); return; }
  try {
    const parsed = await parseExcelFile(file);

    // VERIFY STEP
    showVerifyModal(parsed,
      // confirm
      ()=>{
        fullRecords = parsed;
        saveCache(fullRecords);
        sortState = { key: null, dir: 1 };
        document.getElementById("searchInput").value = "";
        refresh();
        alert(`✅ Đã import ${fullRecords.length} dòng.`);
      },
      // cancel
      ()=>{}
    );

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
    alert(`☁️ Đã lưu dataset lên Firebase (id: ${id}).`);
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
    alert(`☁️ Đã tải dataset từ Firebase: ${fullRecords.length} dòng.`);
  }catch(e){ alert("Lỗi tải Firebase: "+(e?.message||e)); }
});

// Auth & role
setupAuthUI((session)=>{
  currentUser = session;
  const role = session?.role || "viewer";
  // viewer: chỉ xem; editor/admin: được lưu/tải
  const canWrite = (role === "editor" || role === "admin");
  saveBtn.disabled = !canWrite;
  loadBtn.disabled = !session; // cho phép mọi user đã đăng nhập  tải dataset của chính họ
});

// khởi động từ cache
refresh();
