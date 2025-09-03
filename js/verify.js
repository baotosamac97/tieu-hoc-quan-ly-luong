// js/verify.js
// Modal Verify có so sánh khác biệt & cho phép chọn cập nhật

const $ = (id) => document.getElementById(id);

// chuẩn hoá chuỗi (so khớp tiếng Việt)
function slug(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim();
}

// key duy nhất: Họ tên + Đơn vị (đủ ổn cho trường)
const rowKey = (r) => `${slug(r?.name)}|${slug(r?.unit)}`;

// so sánh giá trị (coi ngày/số là tương đương nếu cùng giá trị)
function normVal(v) {
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v === "number") return Number.isFinite(v) ? v : "";
  if (v == null) return "";
  return String(v).trim();
}

const FIELDS = [
  ["role","Chức danh"],
  ["unit","Đơn vị"],
  ["level","Cấp học"],
  ["rank","Hạng"],
  ["rankCode","Mã CDNN"],
  ["coefficient","Hệ số"],
  ["effectiveDate","Ngày hưởng"],
  ["note","Ghi chú"]
];

// tạo diff giữa current & incoming
function diffDatasets(currentRows, incomingRows) {
  const curMap = new Map();
  currentRows.forEach(r => curMap.set(rowKey(r), r));

  const incMap = new Map();
  incomingRows.forEach(r => incMap.set(rowKey(r), r));

  const added = [];
  const removed = [];
  const updated = [];

  // added & updated
  for (const [k, inc] of incMap.entries()) {
    const cur = curMap.get(k);
    if (!cur) {
      added.push(inc);
      continue;
    }
    // so sánh từng field
    const fields = {};
    let hasDiff = false;
    for (const [key,label] of FIELDS) {
      const a = normVal(cur[key]);
      const b = normVal(inc[key]);
      const diff = a !== b;
      if (diff) hasDiff = true;
      fields[key] = { label, current: a, incoming: b, changed: diff };
    }
    if (hasDiff) {
      updated.push({ key: k, name: inc.name, fields, _cur: cur, _inc: inc });
    }
  }

  // removed
  for (const [k, cur] of curMap.entries()) {
    if (!incMap.has(k)) removed.push(cur);
  }

  return { added, removed, updated };
}

export function showVerifyModal(rows, onConfirm, onCancel){
  // giữ tương thích nếu ai đó gọi hàm cũ
  // (rows chính là incoming; current tạm coi rỗng)
  return showVerifyDiffModal([], rows, onConfirm, onCancel);
}

// ===== Modal Diff mới =====
export function showVerifyDiffModal(currentRows, incomingRows, onApply, onCancel){
  const modal = $("verifyModal");
  const sum = $("verifySummary");

  const { added, removed, updated } = diffDatasets(currentRows, incomingRows);

  // selections
  const selAdd = new Map(added.map(r => [rowKey(r), true]));     // mặc định thêm
  const selRem = new Map(removed.map(r => [rowKey(r), false]));  // mặc định không xoá
  const selUpd = new Map(updated.map(u => [
    u.key,
    Object.fromEntries(Object.entries(u.fields).map(([k,f]) => [k, !!f.changed])) // mặc định chọn các ô changed
  ]));

  // HTML
  const section = (title, body, extra="") => `
    <div class="rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-4 py-2 bg-slate-50 flex items-center justify-between">
        <div class="font-semibold">${title}</div>
        ${extra}
      </div>
      <div class="p-4">${body}</div>
    </div>`;

  const renderAdded = () => {
    if (!added.length) return `<div class="text-slate-500 text-sm">Không có bản ghi mới.</div>`;
    const rows = added.map(r=>`
      <label class="flex items-center gap-3 py-2 border-b last:border-0">
        <input type="checkbox" class="addRow accent-indigo-600" data-k="${rowKey(r)}" ${selAdd.get(rowKey(r))?'checked':''}/>
        <div>
          <div class="font-medium">${r.name}</div>
          <div class="text-xs text-slate-500">${r.role || ""} • ${r.unit || ""}</div>
        </div>
      </label>
    `).join("");
    return rows;
  };

  const renderRemoved = () => {
    if (!removed.length) return `<div class="text-slate-500 text-sm">Không có bản ghi cần xoá.</div>`;
    const rows = removed.map(r=>`
      <label class="flex items-center gap-3 py-2 border-b last:border-0">
        <input type="checkbox" class="remRow accent-rose-600" data-k="${rowKey(r)}" ${selRem.get(rowKey(r))?'checked':''}/>
        <div>
          <div class="font-medium">${r.name}</div>
          <div class="text-xs text-slate-500">${r.role || ""} • ${r.unit || ""}</div>
        </div>
      </label>
    `).join("");
    return rows;
  };

  const renderUpdated = () => {
    if (!updated.length) return `<div class="text-slate-500 text-sm">Không có bản ghi thay đổi.</div>`;
    return updated.map((u,i)=>{
      const fieldsRows = Object.entries(u.fields).map(([key,f])=>{
        const checked = selUpd.get(u.key)?.[key];
        const hl = f.changed ? "bg-amber-50" : "";
        return `
          <tr class="border-b last:border-0">
            <td class="px-2 py-1 text-xs text-slate-500">${f.label}</td>
            <td class="px-2 py-1">${f.current ?? ""}</td>
            <td class="px-2 py-1 ${hl}">${f.incoming ?? ""}</td>
            <td class="px-2 py-1 text-center">
              <input type="checkbox" class="updCell accent-emerald-600"
                     data-k="${u.key}" data-field="${key}" ${checked?'checked':''}/>
            </td>
          </tr>`;
      }).join("");
      return `
        <details class="rounded-lg border border-slate-200 mb-3" open>
          <summary class="px-3 py-2 cursor-pointer bg-slate-50 flex items-center justify-between">
            <div><span class="font-semibold">${u.name}</span>
              <span class="text-xs text-slate-500"> • ${u._inc.role || ""} • ${u._inc.unit || ""}</span></div>
            <div class="text-xs text-slate-500">Chỉ tick ô muốn cập nhật</div>
          </summary>
          <div class="p-2 overflow-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-100">
                <tr>
                  <th class="px-2 py-1 text-left text-xs">Trường</th>
                  <th class="px-2 py-1 text-left text-xs">Hiện tại</th>
                  <th class="px-2 py-1 text-left text-xs">Theo file</th>
                  <th class="px-2 py-1 text-left text-xs">Cập nhật</th>
                </tr>
              </thead>
              <tbody>${fieldsRows}</tbody>
            </table>
          </div>
        </details>
      `;
    }).join("");
  };

  // Summary
  sum.innerHTML = `
    <div class="flex flex-wrap gap-3 text-sm">
      <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">Thêm mới: ${added.length}</span>
      <span class="px-3 py-1 rounded-full bg-amber-50 text-amber-700">Thay đổi: ${updated.length}</span>
      <span class="px-3 py-1 rounded-full bg-rose-50 text-rose-700">Xoá: ${removed.length}</span>
    </div>
  `;

  // Body (thay cho layout verify cũ)
  const bodyHtml = `
    <div class="space-y-4">
      ${section("🆕 Bản ghi mới", renderAdded(),
        added.length ? `<button id="toggleAddAll" class="text-xs px-2 py-1 rounded bg-slate-200 hover:bg-slate-300">Chọn/Bỏ tất cả</button>` : ""
      )}
      ${section("✏️ Bản ghi thay đổi (chỉ tick ô cần cập nhật)", renderUpdated())}
      ${section("🗑️ Bản ghi có thể xoá (tuỳ chọn)", renderRemoved(),
        removed.length ? `<button id="toggleRemAll" class="text-xs px-2 py-1 rounded bg-slate-200 hover:bg-slate-300">Chọn/Bỏ tất cả</button>` : ""
      )}
    </div>
  `;

  // Ghi body vào modal
  const tbody = $("verifyTbody");
  const thead = $("verifyThead");
  if (thead) thead.innerHTML = ""; // không dùng thead/tbody cũ nữa
  if (tbody) tbody.innerHTML = ""; // thay bằng bodyHtml
  // nhét bodyHtml vào vùng cảnh báo (tái dụng khung modal)
  const warn = $("verifyWarnings");
  if (warn) warn.innerHTML = bodyHtml;

  // bind chọn hàng & cell
  $("verifyWarnings")?.addEventListener("change", (e)=>{
    const t = e.target;
    if (t.classList.contains("addRow")) {
      selAdd.set(t.dataset.k, t.checked);
    }
    if (t.classList.contains("remRow")) {
      selRem.set(t.dataset.k, t.checked);
    }
    if (t.classList.contains("updCell")) {
      const k = t.dataset.k, f = t.dataset.field;
      const row = selUpd.get(k) || {};
      row[f] = t.checked;
      selUpd.set(k, row);
    }
  });

  $("toggleAddAll")?.addEventListener("click", ()=>{
    const all = Array.from(document.querySelectorAll(".addRow"));
    const someUnchecked = all.some(i => !i.checked);
    all.forEach(i => { i.checked = someUnchecked; selAdd.set(i.dataset.k, someUnchecked); });
  });
  $("toggleRemAll")?.addEventListener("click", ()=>{
    const all = Array.from(document.querySelectorAll(".remRow"));
    const someUnchecked = all.some(i => !i.checked);
    all.forEach(i => { i.checked = someUnchecked; selRem.set(i.dataset.k, someUnchecked); });
  });

  // open modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // buttons
  $("closeVerifyBtn")?.onclick = () => { modal.classList.add("hidden"); onCancel && onCancel(); };
  $("cancelImportBtn")?.onclick = () => { modal.classList.add("hidden"); onCancel && onCancel(); };
  $("confirmImportBtn")?.onclick = () => {
    // Tạo dataset mới dựa trên selections
    const curMap = new Map(currentRows.map(r => [rowKey(r), {...r}]));
    // apply updates
    for (const u of updated) {
      const k = u.key;
      const cur = curMap.get(k) || {};
      const choose = selUpd.get(k) || {};
      for (const [field, cfg] of Object.entries(u.fields)) {
        if (choose[field]) {
          // gán giá trị theo incoming (khôi phục kiểu Date/Number nếu có)
          const incRaw = u._inc[field];
          cur[field] = incRaw ?? null;
        }
      }
      curMap.set(k, cur);
    }
    // apply adds
    for (const r of added) {
      if (selAdd.get(rowKey(r))) {
        curMap.set(rowKey(r), {...r});
      }
    }
    // apply removes
    for (const r of removed) {
      const k = rowKey(r);
      if (selRem.get(k)) curMap.delete(k);
    }
    const merged = Array.from(curMap.values());
    modal.classList.add("hidden");
    onApply && onApply(merged);
  };
}
