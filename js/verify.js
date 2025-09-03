export function showVerifyModal(parsedRows, onConfirm, onCancel){
  const modal = document.getElementById("verifyModal");
  const sumEl = document.getElementById("verifySummary");
  const thead = document.getElementById("verifyThead");
  const tbody = document.getElementById("verifyTbody");
  const warn = document.getElementById("verifyWarnings");

  // summary
  const total = parsedRows.length;
  const uniqueNames = new Set(parsedRows.map(r=>r.name)).size;
  const countTeachers = parsedRows.filter(r => (r.role||"").toLowerCase().includes("giáo viên")).length;
  const countHT = parsedRows.filter(r => (r.role||"").toLowerCase().includes("hiệu trưởng")).length;
  const countPHT = parsedRows.filter(r => (r.role||"").toLowerCase().includes("phó hiệu trưởng")).length;
  sumEl.innerHTML = `
    <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
      <div class="p-2 rounded border bg-blue-50">Tổng dòng: <b>${total}</b></div>
      <div class="p-2 rounded border bg-green-50">Tên duy nhất: <b>${uniqueNames}</b></div>
      <div class="p-2 rounded border bg-amber-50">Giáo viên: <b>${countTeachers}</b></div>
      <div class="p-2 rounded border bg-purple-50">Hiệu trưởng: <b>${countHT}</b></div>
      <div class="p-2 rounded border bg-fuchsia-50">Phó Hiệu trưởng: <b>${countPHT}</b></div>
    </div>`;

  warn.innerHTML = (countHT+countPHT===0)
    ? `⚠️ Không thấy hàng nào có "Hiệu trưởng/Phó Hiệu trưởng". Kiểm tra lại cột chức danh trong file.`
    : "";

  // table preview 10 dòng
  const cols = ["name","role","unit","level","rank","rankCode","coefficient","effectiveDate","note"];
  const headers = ["Họ và tên","Chức danh","Đơn vị","Cấp học","Hạng","Mã CDNN","Hệ số","Ngày hưởng","Ghi chú"];
  thead.innerHTML = headers.map(h=>`<th class="px-2 py-1 text-left">${h}</th>`).join("");
  const sample = parsedRows.slice(0,10);
  tbody.innerHTML = sample.map(r=>`
    <tr class="border-b">
      <td class="px-2 py-1">${r.name||""}</td>
      <td class="px-2 py-1">${r.role||""}</td>
      <td class="px-2 py-1">${r.unit||""}</td>
      <td class="px-2 py-1">${r.level||""}</td>
      <td class="px-2 py-1">${r.rank||""}</td>
      <td class="px-2 py-1">${r.rankCode||""}</td>
      <td class="px-2 py-1">${r.coefficient??""}</td>
      <td class="px-2 py-1">${r.effectiveDate? r.effectiveDate.toLocaleDateString("vi-VN"):""}</td>
      <td class="px-2 py-1">${r.note||""}</td>
    </tr>`).join("");

  // open
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // bind
  const close = ()=>{
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  };
  document.getElementById("closeVerifyBtn").onclick = ()=>{ close(); onCancel?.(); };
  document.getElementById("cancelImportBtn").onclick = ()=>{ close(); onCancel?.(); };
  document.getElementById("confirmImportBtn").onclick = ()=>{ close(); onConfirm?.(); };
}
