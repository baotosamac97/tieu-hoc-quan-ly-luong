/* UI renderers tối thiểu: KPI + Bảng + Export */

export function renderKpis(rows, chipsHost, kpiHost) {
  const total = rows.length;
  const roles = countBy(rows, r => (r.role||"").toLowerCase());
  const hieuTruong = sumKeys(roles, ["hieu truong","hiệu trưởng"]);
  const phoHieuTruong = sumKeys(roles, ["pho hieu truong","phó hiệu trưởng"]);
  const giaoVien = sumKeys(roles, ["giao vien","giáo viên"]);

  kpiHost.innerHTML = `
    ${kpi("Tổng số lượng", total, "bg-indigo-50 text-indigo-700")}
    ${kpi("Giáo viên", giaoVien, "bg-emerald-50 text-emerald-700")}
    ${kpi("Hiệu trưởng", hieuTruong, "bg-rose-50 text-rose-700")}
    ${kpi("Phó Hiệu trưởng", phoHieuTruong, "bg-amber-50 text-amber-700")}
  `;

  // chips theo hạng (nếu bạn muốn filter sau này)
  const byRank = countBy(rows, r => r.rank || "Khác");
  chipsHost.innerHTML = Object.entries(byRank)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,8)
    .map(([k,v])=>`
      <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">${k}: ${v}</span>
    `).join("");
}

function kpi(label, value, cls) {
  return `
    <div class="p-4 rounded-xl border border-slate-100 ${cls}">
      <div class="text-sm opacity-70">${label}</div>
      <div class="text-2xl font-bold mt-1">${value}</div>
    </div>`;
}

function countBy(arr, fn){
  const m = {};
  for (const it of arr) {
    const k = fn(it) || "";
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}
function sumKeys(obj, keys){
  return keys.reduce((s,k)=> s + (obj[k]||0), 0);
}

export function renderTable(rows, sortState) {
  const root = document.getElementById("tableRoot");
  if (!root) return;

  const headers = [
    ["name","Họ và tên"], ["role","Chức danh"], ["unit","Đơn vị"],
    ["level","Cấp học"], ["rank","Hạng"], ["rankCode","Mã CDNN"],
    ["coefficient","Hệ số"], ["effectiveDate","Ngày hưởng"], ["note","Ghi chú"]
  ];

  const thead = `
    <thead class="bg-slate-50 sticky top-0">
      <tr>
        ${headers.map(([key,label])=>`
          <th class="px-3 py-2 text-left text-sm font-semibold text-slate-700 cursor-pointer"
              data-sort="${key}">
            ${label}
            ${sortState.key === key ? (sortState.dir>0 ? "▲" : "▼") : ""}
          </th>`).join("")}
      </tr>
    </thead>`;

  const rowsHtml = rows.map(r => `
    <tr class="border-b hover:bg-slate-50">
      <td class="px-3 py-2">${safe(r.name)}</td>
      <td class="px-3 py-2">${safe(r.role)}</td>
      <td class="px-3 py-2">${safe(r.unit)}</td>
      <td class="px-3 py-2">${safe(r.level)}</td>
      <td class="px-3 py-2">${safe(r.rank)}</td>
      <td class="px-3 py-2">${safe(r.rankCode)}</td>
      <td class="px-3 py-2">${r.coefficient ?? ""}</td>
      <td class="px-3 py-2">${r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString("vi-VN") : ""}</td>
      <td class="px-3 py-2">${safe(r.note)}</td>
    </tr>`).join("");

  root.innerHTML = `
    <table class="min-w-full text-sm">
      ${thead}
      <tbody>${rowsHtml || `<tr><td class="px-3 py-6 text-slate-500" colspan="9">Chưa có dữ liệu</td></tr>`}</tbody>
    </table>`;

  // gắn click sort
  root.querySelectorAll("[data-sort]").forEach(th=>{
    th.addEventListener("click", ()=>{
      window.dispatchEvent(new CustomEvent("sortChange", { detail: th.dataset.sort }));
    });
  });
}

function safe(s){ return (s==null? "": String(s)).replace(/[<>&]/g, c=>({ "<":"&lt;",">":"&gt;","&":"&amp;" }[c])); }

export function exportToExcel(rows){
  if (!rows?.length) { alert("Không có dữ liệu để xuất."); return; }
  if (typeof XLSX === "undefined") { alert("Thiếu thư viện XLSX."); return; }
  const data = rows.map(r=>({
    "Họ và tên": r.name || "",
    "Chức danh": r.role || "",
    "Đơn vị": r.unit || "",
    "Cấp học": r.level || "",
    "Hạng": r.rank || "",
    "Mã CDNN": r.rankCode || "",
    "Hệ số": r.coefficient ?? "",
    "Ngày hưởng": r.effectiveDate ? new Date(r.effectiveDate).toISOString().slice(0,10) : "",
    "Ghi chú": r.note || ""
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Du lieu");
  XLSX.writeFile(wb, `DuLieu_${new Date().toISOString().slice(0,10)}.xlsx`);
}
