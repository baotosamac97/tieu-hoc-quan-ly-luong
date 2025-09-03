export function renderKpis(records, rankChipsEl, kpisEl){
  const total = records.length;
  const teachers = records.filter(r => (r.role||'').toLowerCase().includes('giáo viên')).length;
  const principals = records.filter(r => {
    const t=(r.role||'').toLowerCase();
    return t.includes('hiệu trưởng') || t.includes('phó hiệu trưởng');
  }).length;
  const vals = records.map(r => r.coefficient).filter(v => typeof v === 'number' && !isNaN(v));
  const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : '-';

  const rankCount = {};
  records.forEach(r=>{ const k=r.rank||'Chưa rõ'; rankCount[k]=(rankCount[k]||0)+1; });
  rankChipsEl.innerHTML = Object.entries(rankCount).map(([k,v]) =>
    `<span class="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">${k}: ${v}</span>`
  ).join(' ');

  kpisEl.innerHTML = `
    <div class="p-4 rounded-lg border bg-blue-50"><div class="text-xs text-blue-600">Tổng viên chức</div><div class="text-2xl font-bold text-blue-800">${total}</div></div>
    <div class="p-4 rounded-lg border bg-green-50"><div class="text-xs text-green-600">Số giáo viên</div><div class="text-2xl font-bold text-green-800">${teachers}</div></div>
    <div class="p-4 rounded-lg border bg-purple-50"><div class="text-xs text-purple-600">HT/PHT</div><div class="text-2xl font-bold text-purple-800">${principals}</div></div>
    <div class="p-4 rounded-lg border bg-amber-50"><div class="text-xs text-amber-600">Hệ số lương TB</div><div class="text-2xl font-bold text-amber-800">${avg}</div></div>`;
}

let rolePieChart=null, coefBarChart=null;
export function renderCharts(records){
  const ctxRole = document.getElementById('rolePie').getContext('2d');
  const ctxCoef = document.getElementById('coefBar').getContext('2d');

  const roleCounts={}; records.forEach(r=>{ const k=r.role||'Khác/Trống'; roleCounts[k]=(roleCounts[k]||0)+1; });
  if (rolePieChart) rolePieChart.destroy();
  rolePieChart = new Chart(ctxRole,{type:'pie',data:{labels:Object.keys(roleCounts),datasets:[{data:Object.values(roleCounts)}]}});

  const bins={'≤2.99':0,'3.00–3.99':0,'4.00–4.99':0,'≥5.00':0};
  records.forEach(r=>{ const c=r.coefficient; if(typeof c!=='number') return;
    if(c>=5) bins['≥5.00']++; else if(c>=4) bins['4.00–4.99']++; else if(c>=3) bins['3.00–3.99']++; else bins['≤2.99']++; });
  if (coefBarChart) coefBarChart.destroy();
  coefBarChart = new Chart(ctxCoef,{type:'bar',data:{labels:Object.keys(bins),datasets:[{data:Object.values(bins)}]},options:{scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
}

export function renderTable(records, sortState){
  const thead=document.getElementById('excelThead');
  const tbody=document.getElementById('excelTbody');
  const footer=document.getElementById('tableFooter');

  const arrow = k => (sortState.key===k ? (sortState.dir===1?'▲':'▼') : '');
  const th = (title,key)=>`<th class="px-3 py-2 text-left sortable" data-key="${key}">${title} ${arrow(key)}</th>`;

  thead.innerHTML = `<tr>
    ${th('Họ và tên','name')}${th('Chức danh','role')}${th('Đơn vị','unit')}
    ${th('CDNN/Hạng','rank')}${th('Mã CDNN','rankCode')}${th('Hệ số','coefficient')}
    ${th('Ngày hưởng','effectiveDate')}${th('Ghi chú','note')}
  </tr>`;

  tbody.innerHTML = records.map((r,i)=>`
    <tr class="border-b">
      <td class="px-3 py-2">${r.name||''}</td>
      <td class="px-3 py-2">${r.role||''}</td>
      <td class="px-3 py-2">${r.unit||''}</td>
      <td class="px-3 py-2">${r.rank||''}</td>
      <td class="px-3 py-2">${r.rankCode||''}</td>
      <td class="px-3 py-2 text-right">${r.coefficient??''}</td>
      <td class="px-3 py-2">${r.effectiveDate? r.effectiveDate.toLocaleDateString('vi-VN') : ''}</td>
      <td class="px-3 py-2">${r.note||''}</td>
    </tr>`).join('');

  document.querySelectorAll('th.sortable').forEach(th=>{
    th.addEventListener('click', ()=>{
      const key = th.getAttribute('data-key');
      const ev = new CustomEvent('sortChange', { detail: key });
      window.dispatchEvent(ev);
    });
  });

  footer.textContent = `Hiển thị ${records.length} dòng.`;
}

export function exportToExcel(records){
  if(!records.length){ alert('Không có dữ liệu để xuất.'); return; }
  const data = records.map(r=>({
    'Họ và tên': r.name,'Chức danh': r.role,'Đơn vị': r.unit,'CDNN/Hạng': r.rank,
    'Mã CDNN': r.rankCode,'Hệ số lương': r.coefficient,
    'Ngày hưởng': r.effectiveDate? r.effectiveDate.toLocaleDateString('vi-VN') : '',
    'Ghi chú': r.note
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Du lieu');
  const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
  const blob = new Blob([wbout], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='xuat_du_lieu_hien_thi.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
