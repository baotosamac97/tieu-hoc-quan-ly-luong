import { parseExcelFile } from "./parser.js";
import { saveCache, loadCache, applySearch, applySort, applyFilters } from "./state.js";
import { renderKpis, renderTable, exportToExcel } from "./ui.js";
import { showVerifyDiffModal } from "./verify.js";
import { setupAuthUI } from "./auth.js";
import { saveDatasetToFirebase, loadLatestDatasetFromFirebase } from "./repo.js";

let fullRecords = loadCache();
let viewRecords = [];
let sortState = { key: null, dir: 1 };
let filters = { role: "", level: "", rank: "" };

const $ = (id)=>document.getElementById(id);

function uniqueVals(rows, key){
  return [...new Set(rows.map(r => (r[key]||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi",{sensitivity:"base"}));
}
function populateFilters(){
  const roles  = uniqueVals(fullRecords, "role");
  const levels = uniqueVals(fullRecords, "level");
  const ranks  = uniqueVals(fullRecords, "rank");

  const fill = (sel, arr) => {
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">— Tất cả —</option>` + arr.map(v=>`<option>${v}</option>`).join("");
    if (arr.includes(cur)) sel.value = cur; else sel.value = "";
  };

  fill($("filterRole"), roles);
  fill($("filterLevel"), levels);
  fill($("filterRank"), ranks);
}

function refresh(){
  let rows = [...fullRecords];
  rows = applyFilters(rows, filters);
  rows = applySearch(rows, $("searchInput")?.value || "");
  rows = applySort(rows, sortState);
  viewRecords = rows;
  renderKpis(viewRecords, $("rankChips"), $("excelKpis"));
  renderTable(viewRecords, sortState);
}

$("filterRole")?.addEventListener("change", e => { filters.role  = e.target.value || ""; refresh(); });
$("filterLevel")?.addEventListener("change", e => { filters.level = e.target.value || ""; refresh(); });
$("filterRank")?.addEventListener("change", e => { filters.rank  = e.target.value || ""; refresh(); });

$("uploadExcelBtn")?.addEventListener("click", async ()=>{
  const file = $("excelFileInput").files?.[0];
  if (!file){ alert("Vui lòng chọn file Excel!"); return; }
  try{
    const parsed = await parseExcelFile(file);
    showVerifyDiffModal(fullRecords, parsed, (merged) => {
      fullRecords = merged;
      saveCache(fullRecords);
      sortState = { key:null, dir:1 };
      filters = { role:"", level:"", rank:"" };
      $("searchInput").value = "";
      populateFilters();
      refresh();
      alert(`✅ Đã áp dụng thay đổi. Tổng bản ghi: ${fullRecords.length}`);
    }, () => {});
  }catch(err){
    console.error(err);
    alert("Lỗi import: " + (err?.message || err));
  }
});

$("exportExcelBtn")?.addEventListener("click", ()=>exportToExcel(viewRecords));
$("searchInput")?.addEventListener("input", refresh);

window.addEventListener("sortChange", (e)=>{
  const key = e.detail;
  if (sortState.key === key) sortState.dir *= -1;
  else { sortState.key = key; sortState.dir = 1; }
  refresh();
});

// Firebase actions (như trước)
const saveBtn = $("saveFirebaseBtn");
const loadBtn = $("loadFirebaseBtn");

saveBtn?.addEventListener("click", async ()=>{
  if (!fullRecords.length){ alert("Chưa có dữ liệu để lưu."); return; }
  try{
    const id = await saveDatasetToFirebase(fullRecords, { note:"manual save" });
    alert(`☁️ Đã lưu dataset (id: ${id}).`);
  }catch(e){ alert("Lỗi lưu Firebase: " + (e?.message||e)); }
});
loadBtn?.addEventListener("click", async ()=>{
  try{
    const snap = await loadLatestDatasetFromFirebase();
    if (!snap){ alert("Chưa có dataset nào trên Firebase."); return; }
    fullRecords = snap.rows || [];
    saveCache(fullRecords);
    sortState = { key:null, dir:1 };
    filters = { role:"", level:"", rank:"" };
    $("searchInput").value = "";
    populateFilters();
    refresh();
    alert(`☁️ Đã tải dataset: ${fullRecords.length} dòng.`);
  }catch(e){ alert("Lỗi tải Firebase: " + (e?.message||e)); }
});

// Auth & role
setupAuthUI((session)=>{
  const role = session?.role || "viewer";
  const canWrite = (role === "editor" || role === "admin");
  if (saveBtn) saveBtn.disabled = !canWrite;
  if (loadBtn) loadBtn.disabled = !session;
});

// init
populateFilters();
refresh();
