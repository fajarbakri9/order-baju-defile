(() => {
  'use strict';

  const SIZE_ORDER = ['S','M','L','XL','XXL','3XL','4XL','5XL','6XL','7XL','8XL'];
  let updateTimer = null;

  function rows() {
    try { return Array.isArray(data) ? data : []; }
    catch { return []; }
  }

  function ensureUi() {
    if (document.getElementById('productionSummary')) return;

    const style = document.createElement('style');
    style.id = 'production-summary-style';
    style.textContent = `
      .production-summary{margin:0 0 18px;background:#fff;border:1px solid var(--line);border-radius:20px;box-shadow:0 10px 30px rgba(15,43,73,.06);overflow:hidden}
      .production-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid #edf1f5}
      .production-head h2{margin:0 0 4px;font-size:16px;color:var(--ink)}
      .production-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
      .production-integrity{flex:0 0 auto;max-width:48%;border-radius:999px;padding:7px 10px;background:#edf8f3;color:#19734d;border:1px solid #ccebdc;font-size:10px;font-weight:800;line-height:1.3;text-align:center}
      .production-integrity.warn{background:#fff8ec;color:#9b5b09;border-color:#f1d5a5}
      .production-body{padding:16px 20px 18px}
      .production-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
      .production-kpi{border:1px solid #e2e9ef;border-radius:15px;padding:12px 13px;background:linear-gradient(180deg,#fff,#f8fafc)}
      .production-kpi span{display:block;color:var(--muted);font-size:10px;font-weight:700;margin-bottom:4px}
      .production-kpi strong{display:block;color:#153b59;font-size:20px;line-height:1;font-variant-numeric:tabular-nums}
      .production-kpi.short{background:linear-gradient(180deg,#f3f8ff,#eaf3ff);border-color:#d7e7f8}.production-kpi.short strong{color:#145c99}
      .production-kpi.long{background:linear-gradient(180deg,#f2fbfb,#e8f7f6);border-color:#cfe9e6}.production-kpi.long strong{color:#167a70}
      .production-kpi.total{background:linear-gradient(135deg,#123b56,#175f84);border-color:transparent}.production-kpi.total span,.production-kpi.total strong{color:#fff}
      .production-size-list{display:grid;gap:7px}
      .production-size-header,.production-size-row{display:grid;grid-template-columns:80px repeat(3,minmax(0,1fr));align-items:center;gap:8px}
      .production-size-header{padding:0 11px 3px;color:#738293;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;text-align:center}
      .production-size-header span:first-child{text-align:left}
      .production-size-row{padding:9px 11px;border:1px solid #e7edf2;border-radius:13px;background:#fbfcfe}
      .production-size-name{display:flex;align-items:center;gap:8px;font-weight:900;color:#203b52}
      .production-size-name b{display:grid;place-items:center;min-width:38px;height:32px;padding:0 8px;border-radius:10px;background:#eef4f8;color:#173f5e;font-size:12px}
      .production-metric{text-align:center;font-variant-numeric:tabular-nums}
      .production-metric small{display:none}.production-metric strong{font-size:13px;color:#30485d}
      .production-metric.short strong{color:#145c99}.production-metric.long strong{color:#167a70}.production-metric.total strong{color:#102f48;font-size:14px}
      .production-note{margin-top:10px;color:#7a8997;font-size:10px;line-height:1.5}
      .production-note.warn{color:#a45c00;font-weight:700}
      @media(max-width:860px){
        .production-summary{border-radius:20px;margin-bottom:14px}
        .production-head{padding:16px 14px 12px;flex-direction:column;gap:9px}
        .production-head h2{font-size:15px}.production-head p{font-size:11px}
        .production-integrity{max-width:100%;width:100%;border-radius:12px;text-align:left;padding:8px 10px}
        .production-body{padding:13px 14px 15px}
        .production-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .production-kpi{padding:11px 12px;border-radius:14px}.production-kpi strong{font-size:19px}
        .production-size-header{display:none}
        .production-size-list{gap:8px}
        .production-size-row{grid-template-columns:54px repeat(3,minmax(0,1fr));gap:5px;padding:9px 8px;border-radius:14px}
        .production-size-name{justify-content:flex-start}.production-size-name b{min-width:42px;height:38px;border-radius:11px}
        .production-metric{border-left:1px solid #e4ebf0;padding-left:4px}
        .production-metric small{display:block;color:#8796a3;font-size:8px;font-weight:700;margin-bottom:1px}
        .production-metric strong{font-size:13px}.production-metric.total strong{font-size:14px}
      }
      @media(max-width:390px){
        .production-kpis{grid-template-columns:1fr 1fr}
        .production-size-row{grid-template-columns:48px repeat(3,minmax(0,1fr));padding:8px 6px}
        .production-size-name b{min-width:38px;height:36px;padding:0 5px;font-size:11px}
        .production-metric small{font-size:7px}.production-metric strong{font-size:12px}
      }
      @media print{.production-summary{box-shadow:none;break-inside:avoid}.production-integrity{display:none}}
    `;
    document.head.appendChild(style);

    const section = document.createElement('section');
    section.id = 'productionSummary';
    section.className = 'production-summary';
    section.innerHTML = `
      <div class="production-head">
        <div><h2>Rekap Produksi Baju</h2><p>Pengelompokan berdasarkan jumlah baju/pcs, ukuran dan jenis lengan — bukan jumlah orang.</p></div>
        <div class="production-integrity" id="productionIntegrity">Memeriksa data…</div>
      </div>
      <div class="production-body">
        <div class="production-kpis">
          <div class="production-kpi total"><span>Total Baju</span><strong id="prodTotal">0</strong></div>
          <div class="production-kpi short"><span>Lengan Pendek</span><strong id="prodShort">0</strong></div>
          <div class="production-kpi long"><span>Lengan Panjang</span><strong id="prodLong">0</strong></div>
          <div class="production-kpi"><span>Ukuran Aktif</span><strong id="prodSizes">0</strong></div>
        </div>
        <div class="production-size-header"><span>Ukuran</span><span>Pendek</span><span>Panjang</span><span>Total</span></div>
        <div class="production-size-list" id="productionSizeList"></div>
        <div class="production-note" id="productionNote">Dihitung otomatis dari data yang tersinkron.</div>
      </div>`;

    const kpi = document.querySelector('.grid-kpi');
    if (kpi) kpi.insertAdjacentElement('afterend', section);
    else {
      const content = document.querySelector('.content-grid');
      if (content) content.insertAdjacentElement('beforebegin', section);
    }
  }

  function analyze() {
    const list = rows();
    const counts = {};
    let short = 0, long = 0, unknown = 0, total = 0;

    const addItem = (size, model) => {
      size = String(size || '').trim().toUpperCase();
      model = String(model || '').trim();
      if (!size) return;
      if (!counts[size]) counts[size] = { short: 0, long: 0, unknown: 0, total: 0 };
      total += 1;
      counts[size].total += 1;
      if (model === 'Lengan Pendek') { short += 1; counts[size].short += 1; }
      else if (model === 'Lengan Panjang' || model === 'Lengan Panjang Tunik') { long += 1; counts[size].long += 1; }
      else { unknown += 1; counts[size].unknown += 1; }
    };

    list.forEach(d => {
      addItem(d.sizeSuami, d.modelSuami);
      addItem(d.sizeIstri, d.modelIstri);
    });

    const nums = list.map(d => Number(d.originalNo)).filter(n => Number.isInteger(n) && n > 0);
    const unique = [...new Set(nums)].sort((a,b) => a-b);
    const maxNo = unique.length ? unique[unique.length - 1] : 0;
    const missing = [];
    for (let i = 1; i <= maxNo; i++) if (!unique.includes(i)) missing.push(i);
    const dup = [...new Set(nums.filter((n,i,a) => a.indexOf(n) !== i))].sort((a,b)=>a-b);

    return { list, counts, short, long, unknown, total, unique, maxNo, missing, dup };
  }

  function update() {
    ensureUi();
    const a = analyze();
    const totalEl = document.getElementById('prodTotal');
    if (!totalEl) return;

    totalEl.textContent = a.total;
    document.getElementById('prodShort').textContent = a.short;
    document.getElementById('prodLong').textContent = a.long;

    const orderedSizes = [
      ...SIZE_ORDER.filter(s => a.counts[s]),
      ...Object.keys(a.counts).filter(s => !SIZE_ORDER.includes(s)).sort()
    ];
    document.getElementById('prodSizes').textContent = orderedSizes.length;

    const sizeList = document.getElementById('productionSizeList');
    sizeList.innerHTML = orderedSizes.length ? orderedSizes.map(size => {
      const c = a.counts[size];
      return `<div class="production-size-row">
        <div class="production-size-name"><b>${size}</b></div>
        <div class="production-metric short"><small>Pendek</small><strong>${c.short}</strong></div>
        <div class="production-metric long"><small>Panjang</small><strong>${c.long}</strong></div>
        <div class="production-metric total"><small>Total</small><strong>${c.total}</strong></div>
      </div>`;
    }).join('') : '<div class="production-note">Belum ada data ukuran baju.</div>';

    const integrity = document.getElementById('productionIntegrity');
    const issues = a.missing.length || a.dup.length;
    integrity.classList.toggle('warn', !!issues);
    if (!a.maxNo) {
      integrity.textContent = `${a.list.length} pemesan tersimpan`;
    } else if (issues) {
      const parts = [`${a.list.length} pemesan`, `nomor tabel sampai ${a.maxNo}`];
      if (a.missing.length) parts.push(`nomor kosong: ${a.missing.join(', ')}`);
      if (a.dup.length) parts.push(`duplikat: ${a.dup.join(', ')}`);
      integrity.textContent = parts.join(' • ');
    } else {
      integrity.textContent = `${a.list.length} pemesan • nomor tabel 1–${a.maxNo} lengkap`;
    }

    const note = document.getElementById('productionNote');
    note.classList.toggle('warn', a.unknown > 0);
    note.textContent = a.unknown > 0
      ? `${a.unknown} pcs memiliki ukuran tetapi jenis lengan belum ditentukan.`
      : 'Dihitung otomatis dari seluruh data yang tersinkron dan berubah realtime saat data diperbarui.';
  }

  function scheduleUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(update, 40);
  }

  function start() {
    ensureUi();
    update();
    const kpi = document.querySelector('.grid-kpi');
    if (kpi) new MutationObserver(scheduleUpdate).observe(kpi, { subtree: true, childList: true, characterData: true });
    window.addEventListener('storage', scheduleUpdate);
    setInterval(update, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
