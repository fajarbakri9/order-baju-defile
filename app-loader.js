'use strict';

const inflateRaw = async bytes => {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('Browser tidak mendukung dekompresi yang diperlukan.');
  }
  const ds = new DecompressionStream('deflate-raw');
  const ab = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(ab);
};

const unzip = async bytes => {
  const out = {};
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder('utf-8');
  let p = 0;
  while (p + 30 <= bytes.length && dv.getUint32(p, true) === 0x04034b50) {
    const flag = dv.getUint16(p + 6, true);
    const method = dv.getUint16(p + 8, true);
    const compressed = dv.getUint32(p + 18, true);
    const nameLen = dv.getUint16(p + 26, true);
    const extraLen = dv.getUint16(p + 28, true);
    if (flag & 8) throw new Error('Format ZIP tidak didukung.');
    const name = dec.decode(bytes.subarray(p + 30, p + 30 + nameLen));
    const start = p + 30 + nameLen + extraLen;
    const end = start + compressed;
    const body = bytes.subarray(start, end);
    if (method === 0) out[name] = body;
    else if (method === 8) out[name] = await inflateRaw(body);
    else throw new Error('Metode kompresi tidak didukung.');
    p = end;
  }
  return out;
};

(async () => {
  const partNames = ['01', '02', '03', '04', '05'].map(n => `payload/site.part.${n}`);
  const parts = await Promise.all(partNames.map(async url => {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Gagal memuat data ${url} (${r.status})`);
    return r.text();
  }));

  const b64 = parts.join('').replace(/\s+/g, '');
  const raw = atob(b64);
  const zipBytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) zipBytes[i] = raw.charCodeAt(i);

  const unpacked = await unzip(zipBytes);
  const root = 'order-baju-defile/';
  const htmlBytes = unpacked[root + 'index.html'];
  if (!htmlBytes) throw new Error('Berkas halaman tidak ditemukan.');
  let html = new TextDecoder('utf-8').decode(htmlBytes);

  const sourceMatch = html.match(/const SOURCE_DATA=(\[[\s\S]*?\]);\s*\n/);
  if (sourceMatch) {
    let source = JSON.parse(sourceMatch[1]);
    source = source.filter(d => !String(d.name || '').toUpperCase().includes('HJ SUMARNI DINKOPUKM'));

    const byNo = new Map();
    for (const d of source) {
      const n = Number(d.originalNo);
      if (!Number.isFinite(n)) continue;
      if (!byNo.has(n) || /PAK RAHMAN\s*\(BKD\)/i.test(String(d.name || ''))) byNo.set(n, d);
    }
    source = [...byNo.values()];

    const fixes = {
      12: { sizeIstri: 'XL', modelIstri: 'Lengan Panjang' },
      22: { sizeIstri: 'L', modelIstri: 'Lengan Panjang' },
      29: { name: 'KABAG HUKM' },
      33: { sizeSuami: '', modelSuami: '', sizeIstri: 'XL', modelIstri: 'Lengan Panjang' },
      34: { sizeSuami: 'XL', modelSuami: 'Lengan Pendek', sizeIstri: '', modelIstri: '' },
      38: { sizeIstri: 'L', modelIstri: 'Lengan Panjang' },
      40: { sizeSuami: '', modelSuami: '', sizeIstri: 'XL', modelIstri: 'Lengan Panjang' },
      41: {
        name: 'PAK RAHMAN (BKD)',
        sizeSuami: 'L',
        modelSuami: 'Lengan Pendek',
        sizeIstri: 'L',
        modelIstri: 'Lengan Panjang',
        rankWeight: 60,
        rankLabel: 'Pimpinan OPD / Unit Utama'
      }
    };
    const paidNos = new Set([2,3,5,6,7,8,9,10,11,13,15,18,19,26,29,30,33,34,35,36,37,38,39,40,41,64,68,69,70,71]);
    source.forEach(d => {
      const n = Number(d.originalNo);
      if (fixes[n]) Object.assign(d, fixes[n]);
      d.note = paidNos.has(n) ? 'L' : '';
      d.paid = paidNos.has(n);
      d.displayNo = n;
    });
    source.sort((a,b) => (Number(a.originalNo) || 9999) - (Number(b.originalNo) || 9999) || String(a.name || '').localeCompare(String(b.name || ''), 'id'));
    html = html.replace(sourceMatch[0], `const SOURCE_DATA=${JSON.stringify(source)};\n`);
  }

  html = html.replace(/kaosDefileDataV\d+/g, 'kaosDefileDataV8');
  html = html.replace('<option value="rank">Urut jabatan</option>', '<option value="initial">Urutan tabel awal</option><option value="rank">Urut jabatan</option>');
  html = html.replace(
    'if(sort==="totalDesc")return total(y)-total(x)||x.name.localeCompare(y.name,"id");\n   if(sort==="paid")return (+paid(y)-+paid(x))||(+x.rankWeight-+y.rankWeight);\n   return (+x.rankWeight-+y.rankWeight)||(+x.displayNo-+y.displayNo)||x.name.localeCompare(y.name,"id");',
    'if(sort==="totalDesc")return total(y)-total(x)||(+x.originalNo-+y.originalNo);\n   if(sort==="paid")return (+paid(y)-+paid(x))||(+x.originalNo-+y.originalNo);\n   if(sort==="rank")return (+x.rankWeight-+y.rankWeight)||(+x.originalNo-+y.originalNo)||x.name.localeCompare(y.name,"id");\n   return (+x.originalNo-+y.originalNo)||x.name.localeCompare(y.name,"id");'
  );
  html = html.replace('$("#sortSelect").value="rank"', '$("#sortSelect").value="initial"');
  html = html.replace(' $("#paidProgress").style.width=pct+"%"; $("#paidMeta").textContent=`${paidRows.length} dari ${all.length} lunas`; $("#paidPct").textContent=pct+"%";\n', '');
  html = html.replace('<td class="no">${i+1}</td>', '<td class="no">${esc(d.originalNo)}</td>');
  html = html.replace('<td class="person"><strong>${esc(d.name)}</strong><small>No. sumber ${esc(d.originalNo)}</small></td>', '<td class="person"><strong>${esc(d.name)}</strong></td>');
  html = html.replace('<div class="m-name">${i+1}. ${esc(d.name)}</div>', '<div class="m-name">${esc(d.originalNo)}. ${esc(d.name)}</div>');
  html = html.replace(' renderSizeBars(a);\n', '');
  html = html.replace(
    'else{data.push({...patch,id:"local-"+Date.now(),originalNo:"baru",displayNo:data.length+1})}',
    'else{const nextNo=Math.max(0,...data.map(d=>Number(d.originalNo)||0))+1;data.push({...patch,id:"local-"+Date.now(),originalNo:nextNo,displayNo:nextNo})}'
  );
  html = html.replace('const r=ws.addRow([i+1,d.name,rankName(d.rankWeight),', 'const r=ws.addRow([d.originalNo,d.name,rankName(d.rankWeight),');

  const responsiveCss = `
.filter-chips{gap:10px;padding-bottom:16px}
.chip{border-color:#d7e1ea;border-radius:999px;padding:9px 14px;font-weight:800;box-shadow:0 6px 18px rgba(15,43,73,.04);transition:.18s ease}
.chip:hover{transform:translateY(-1px);border-color:#c3d4e3}
.chip[data-status="all"]{background:#fff;color:#35506a;border-color:#d7e1ea}
.chip[data-status="all"].active{background:linear-gradient(135deg,#e7f2ff,#d9ebff);color:#0f4c81;border-color:#b7d3f2;box-shadow:0 10px 22px rgba(31,122,140,.12)}
.chip[data-status="paid"]{background:#f8fdf9;color:#2f7d4b;border-color:#cde8d7}
.chip[data-status="paid"].active{background:linear-gradient(135deg,#dbf6e4,#c8f0d5);color:#156b39;border-color:#95ddb0;box-shadow:0 10px 22px rgba(21,107,57,.14)}
.chip[data-status="unpaid"]{background:#fff9ef;color:#a6610b;border-color:#f3d8aa}
.chip[data-status="unpaid"].active{background:linear-gradient(135deg,#ffe9bd,#ffd89a);color:#9a5800;border-color:#efba63;box-shadow:0 10px 22px rgba(190,119,10,.18)}
.mobile-action-dock{display:none}
@media(max-width:860px){
  .app{padding:14px 14px 118px!important}
  .topbar{align-items:center!important;flex-wrap:wrap!important;gap:12px!important}
  .brand{flex:1 1 auto;min-width:0}
  .brand-mark{width:40px;height:40px;border-radius:14px}
  .brand-copy b{font-size:15px}.brand-copy span{font-size:11px;max-width:100%}
  .top-actions{flex:1 1 100%;justify-content:flex-start!important;gap:8px!important;flex-wrap:nowrap!important;overflow-x:auto;padding:2px 0;scrollbar-width:none}
  .top-actions::-webkit-scrollbar{display:none}
  #exportBtn,#printBtn,#addBtn{display:none!important}
  .hero{grid-template-columns:1fr;min-height:0;border-radius:22px}
  .hero-copy{padding:26px 20px 18px}.hero h1{font-size:31px;line-height:1.03}
  .hero-image{min-height:330px;max-height:420px}
  .grid-kpi{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .kpi{padding:14px;border-radius:18px}.kpi .value{font-size:20px}
  .content-grid{gap:14px}.panel{border-radius:20px}.panel-head{padding:16px 14px 12px}
  .toolbar{grid-template-columns:1fr 1fr;padding:0 14px 12px;gap:10px}.toolbar .search{grid-column:1/-1}
  .filter-chips{display:grid;grid-template-columns:repeat(3,1fr);padding:0 14px 14px;gap:8px;overflow:visible}
  .chip{display:flex;justify-content:center;align-items:center;text-align:center;padding:10px 8px;font-size:12px;min-height:42px}
  .result-line{padding:0 14px 12px;flex-direction:column;align-items:flex-start;gap:3px}
  .table-wrap{display:none}.mobile-list{display:block;padding:0 14px 14px}
  .m-card{border-radius:18px;padding:14px;box-shadow:0 8px 26px rgba(15,43,73,.05)}
  .mobile-action-dock{position:fixed;left:12px;right:12px;bottom:max(10px,env(safe-area-inset-bottom));z-index:96;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:10px;background:linear-gradient(180deg,rgba(255,255,255,.97),rgba(244,248,252,.95));border:1px solid rgba(207,220,231,.98);border-radius:22px;box-shadow:0 18px 54px rgba(11,36,62,.20);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
  .mobile-action-dock .dock-btn{min-height:58px;border:1px solid #dce6ee;border-radius:17px;background:linear-gradient(180deg,#fff,#f6f9fc);color:#163a58;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:11px;font-weight:800;padding:8px 6px;box-shadow:0 6px 18px rgba(15,43,73,.07);transition:.18s ease}
  .mobile-action-dock .dock-btn svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-linecap:round;stroke-linejoin:round}
  .mobile-action-dock .dock-btn:active{transform:translateY(1px) scale(.99)}
  .mobile-action-dock .dock-btn.primary{background:linear-gradient(135deg,#0f4c81,#1f7a8c);color:#fff;border-color:transparent;box-shadow:0 14px 28px rgba(15,76,129,.28)}
  .mobile-action-dock .dock-btn .txt{display:block!important;letter-spacing:.01em}
}
@media(max-width:560px){
  body{font-size:13px}.brand-copy span{max-width:220px}
  .top-actions .btn{min-height:42px;padding:9px 10px;border-radius:12px}
  .top-actions .btn .txt{display:none}
  .hero{border-radius:20px}.hero-copy{padding:22px 17px 14px}.hero h1{font-size:28px}.hero-image{min-height:290px;max-height:360px}
  .toolbar{grid-template-columns:1fr}.toolbar .search{grid-column:auto}
  .m-orders{grid-template-columns:1fr}
}
@media(max-width:380px){
  .app{padding-left:10px!important;padding-right:10px!important;padding-bottom:112px!important}
  .grid-kpi{grid-template-columns:1fr}.filter-chips{grid-template-columns:1fr}
  .mobile-action-dock{left:8px;right:8px;gap:8px;padding:8px;border-radius:20px}
  .mobile-action-dock .dock-btn{min-height:54px;font-size:10px;border-radius:15px}
}`;
  html = html.replace('</style>', responsiveCss + '</style>');

  const dockMarkup = `<nav class="mobile-action-dock" aria-label="Aksi cepat">
    <button class="dock-btn" id="mobileExportBtn" type="button" title="Download Excel siap cetak" aria-label="Download Excel"><svg viewBox="0 0 24 24" stroke-width="1.9"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></svg><span class="txt">Excel</span></button>
    <button class="dock-btn" id="mobilePrintBtn" type="button" title="Cetak" aria-label="Cetak"><svg viewBox="0 0 24 24" stroke-width="1.9"><path d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v6H7z"/></svg><span class="txt">Cetak</span></button>
    <button class="dock-btn primary" id="mobileAddBtn" type="button" title="Tambah data" aria-label="Tambah data"><svg viewBox="0 0 24 24" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg><span class="txt">Tambah</span></button>
  </nav>`;
  html = html.replace('<div class="toast" id="toast"></div>', dockMarkup + '<div class="toast" id="toast"></div>');
  html = html.replace(
    '$("#addBtn").onclick=()=>openEdit(null); $("#printBtn").onclick=()=>window.print();',
    '$("#addBtn").onclick=()=>openEdit(null); $("#printBtn").onclick=()=>window.print(); $("#mobileAddBtn").onclick=()=>openEdit(null); $("#mobilePrintBtn").onclick=()=>window.print(); $("#mobileExportBtn").onclick=()=>$("#exportBtn").click();'
  );

  const imageBytes = unpacked[root + 'assets/kaos-defile.jpg'];
  if (imageBytes) {
    let s = '';
    const step = 0x8000;
    for (let i = 0; i < imageBytes.length; i += step) s += String.fromCharCode.apply(null, imageBytes.subarray(i, i + step));
    html = html.split('assets/kaos-defile.jpg').join('data:image/jpeg;base64,' + btoa(s));
  }

  html = html.replace('</body>', '<script src="firebase-config.js"></script><script src="cloud-sync.js"></script></body>');

  document.open();
  document.write(html);
  document.close();
})().catch(err => {
  console.error(err);
  const el = document.getElementById('error');
  if (el) {
    el.style.display = 'block';
    el.textContent = 'Halaman gagal dimuat. Silakan muat ulang. ' + (err && err.message ? err.message : '');
  }
});
