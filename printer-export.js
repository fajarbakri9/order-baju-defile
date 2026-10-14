(() => {
  'use strict';

  const SIZE_ORDER = ['S','M','L','XL','XXL','3XL','4XL','5XL','6XL','7XL','8XL'];

  function getRows() {
    try {
      return Array.isArray(data)
        ? [...data].sort((a,b) => (Number(a.originalNo)||9999) - (Number(b.originalNo)||9999) || String(a.name||'').localeCompare(String(b.name||''),'id'))
        : [];
    } catch {
      return [];
    }
  }

  function notify(message) {
    try {
      if (typeof toast === 'function') return toast(message);
    } catch {}
    alert(message);
  }

  function ensureUi() {
    const summary = document.getElementById('productionSummary');
    const head = summary?.querySelector('.production-head');
    if (!head || document.getElementById('printerExportBtn')) return !!head;

    const style = document.createElement('style');
    style.id = 'printer-export-style';
    style.textContent = `
      .production-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-left:auto}
      .production-actions .production-integrity{max-width:none}
      .printer-export-btn{border:1px solid #cbdce8;background:linear-gradient(180deg,#fff,#f4f8fb);color:#123b56;border-radius:12px;min-height:38px;padding:8px 12px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:11px;font-weight:850;white-space:nowrap;box-shadow:0 5px 16px rgba(15,43,73,.07);cursor:pointer;transition:.18s ease}
      .printer-export-btn:hover{transform:translateY(-1px);border-color:#a9c4d7;background:#fff}
      .printer-export-btn:active{transform:translateY(0)}
      .printer-export-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
      .printer-export-btn[disabled]{opacity:.6;cursor:wait;transform:none}
      @media(max-width:860px){
        .production-actions{width:100%;margin-left:0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
        .production-actions .production-integrity{width:auto!important;max-width:none!important;margin:0!important}
        .printer-export-btn{min-height:42px;padding:9px 12px;border-radius:13px}
      }
      @media(max-width:480px){
        .production-actions{grid-template-columns:1fr}
        .printer-export-btn{width:100%;min-height:44px;font-size:12px}
      }
      @media print{.printer-export-btn{display:none!important}}
    `;
    document.head.appendChild(style);

    let actions = head.querySelector('.production-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'production-actions';
      const integrity = document.getElementById('productionIntegrity');
      if (integrity) actions.appendChild(integrity);
      head.appendChild(actions);
    }

    const btn = document.createElement('button');
    btn.id = 'printerExportBtn';
    btn.type = 'button';
    btn.className = 'printer-export-btn';
    btn.title = 'Download daftar nama dan ukuran tanpa harga';
    btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = `<svg viewBox="0 0 24 24" stroke-width="1.9"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></svg><span>Daftar Percetakan</span>`;
    btn.addEventListener('click', exportPrinterWorkbook);
    actions.appendChild(btn);
    return true;
  }

  function sizeRank(size) {
    const i = SIZE_ORDER.indexOf(String(size||'').toUpperCase());
    return i < 0 ? 999 : i;
  }

  function collectProduction(rows) {
    const detail = [];
    const counts = {};

    const add = (row, wearer, size, model) => {
      size = String(size || '').trim().toUpperCase();
      model = String(model || '').trim();
      if (!size) return;
      detail.push({
        noDaftar: Number(row.originalNo) || '',
        name: String(row.name || ''),
        wearer,
        size,
        model: model || 'BELUM DITENTUKAN',
        qty: 1
      });
      if (!counts[size]) counts[size] = { short: 0, long: 0, other: 0, total: 0 };
      counts[size].total += 1;
      if (model === 'Lengan Pendek') counts[size].short += 1;
      else if (model === 'Lengan Panjang' || model === 'Lengan Panjang Tunik') counts[size].long += 1;
      else counts[size].other += 1;
    };

    rows.forEach(row => {
      add(row, 'Suami', row.sizeSuami, row.modelSuami);
      add(row, 'Istri', row.sizeIstri, row.modelIstri);
    });

    const sizes = Object.keys(counts).sort((a,b) => sizeRank(a)-sizeRank(b) || a.localeCompare(b));
    return { detail, counts, sizes };
  }

  function rowStatus(d) {
    const pairs = [
      [String(d.sizeSuami||'').trim(), String(d.modelSuami||'').trim()],
      [String(d.sizeIstri||'').trim(), String(d.modelIstri||'').trim()]
    ];
    const incomplete = pairs.some(([s,m]) => (s && !m) || (!s && m));
    const qty = pairs.filter(([s]) => !!s).length;
    if (!qty) return 'BELUM ADA UKURAN';
    if (incomplete) return 'PERLU DICEK';
    return 'SIAP PRODUKSI';
  }

  const argb = hex => 'FF' + hex.replace('#','').toUpperCase();

  function setBorder(cell, color='DCE5EC') {
    const side = { style: 'thin', color: { argb: argb(color) } };
    cell.border = { top: side, left: side, bottom: side, right: side };
  }

  function styleHeaderRow(row, fill='123B56') {
    row.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(fill) } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      setBorder(cell, fill);
    });
    row.height = 28;
  }

  function styleDataRange(ws, startRow, endRow, cols) {
    for (let r = startRow; r <= endRow; r++) {
      const row = ws.getRow(r);
      if (r % 2 === 0) {
        row.eachCell({ includeEmpty: true }, cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } };
        });
      }
      for (let c = 1; c <= cols; c++) {
        const cell = row.getCell(c);
        setBorder(cell, 'E4EAF0');
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.font = { size: 9, color: { argb: 'FF26384A' } };
      }
      row.height = 22;
    }
  }

  function addTitle(ws, title, subtitle, lastCol) {
    ws.mergeCells(1,1,1,lastCol);
    const titleCell = ws.getCell(1,1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 17, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123B56' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(1).height = 34;

    ws.mergeCells(2,1,2,lastCol);
    const sub = ws.getCell(2,1);
    sub.value = subtitle;
    sub.font = { size: 10, italic: true, color: { argb: 'FF526779' } };
    sub.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(2).height = 24;
  }

  function preparePrint(ws, orientation='landscape') {
    ws.pageSetup = {
      paperSize: 9,
      orientation,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 }
    };
    ws.headerFooter = {
      oddFooter: '&LOrder Baju Defile&CFile Produksi Percetakan&RHalaman &P dari &N'
    };
  }

  async function exportPrinterWorkbook() {
    const btn = document.getElementById('printerExportBtn');
    if (!window.ExcelJS) {
      notify('Library Excel belum siap. Muat ulang halaman lalu coba lagi.');
      return;
    }

    const rows = getRows();
    if (!rows.length) {
      notify('Belum ada data untuk diekspor.');
      return;
    }

    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = '<span>Menyiapkan Excel…</span>';

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Order Baju Defile';
      workbook.company = 'Kabupaten Pinrang';
      workbook.subject = 'Daftar nama dan ukuran untuk percetakan';
      workbook.created = new Date();
      workbook.modified = new Date();

      const production = collectProduction(rows);
      const totalPcs = production.detail.length;
      const generated = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

      // SHEET 1 — daftar pemesan ringkas
      const ws = workbook.addWorksheet('Daftar Nama & Ukuran', { views: [{ state: 'frozen', ySplit: 5 }] });
      addTitle(ws, 'DAFTAR NAMA & UKURAN BAJU DEFILE', `Dokumen produksi untuk percetakan • Tanpa harga • Dibuat ${generated}`, 8);
      ws.mergeCells('A3:H3');
      ws.getCell('A3').value = `Total pemesan: ${rows.length}   •   Total baju: ${totalPcs} pcs`;
      ws.getCell('A3').font = { bold: true, size: 10, color: { argb: 'FF145C99' } };
      ws.getCell('A3').alignment = { vertical: 'middle' };
      ws.getRow(3).height = 22;
      ws.addRow([]);
      ws.addRow(['No.','Nama / Instansi','Ukuran Suami','Jenis Lengan Suami','Ukuran Istri','Jenis Lengan Istri','Total Pcs','Status Data']);
      styleHeaderRow(ws.getRow(5));

      rows.forEach(d => {
        const qty = (String(d.sizeSuami||'').trim() ? 1 : 0) + (String(d.sizeIstri||'').trim() ? 1 : 0);
        const status = rowStatus(d);
        const r = ws.addRow([
          Number(d.originalNo) || '',
          String(d.name || ''),
          String(d.sizeSuami || ''),
          String(d.modelSuami || ''),
          String(d.sizeIstri || ''),
          String(d.modelIstri || ''),
          qty,
          status
        ]);
        if (status !== 'SIAP PRODUKSI') {
          r.getCell(8).font = { bold: true, color: { argb: status === 'PERLU DICEK' ? 'FF9A5800' : 'FFA33B32' }, size: 9 };
          r.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: status === 'PERLU DICEK' ? 'FFFFF1D8' : 'FFFFEAE7' } };
        }
      });
      styleDataRange(ws, 6, ws.rowCount, 8);
      ws.autoFilter = { from: 'A5', to: `H${ws.rowCount}` };
      ws.columns = [
        { width: 7 }, { width: 31 }, { width: 14 }, { width: 21 },
        { width: 14 }, { width: 21 }, { width: 11 }, { width: 18 }
      ];
      ws.getColumn(1).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getColumn(3).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getColumn(5).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getColumn(7).alignment = { horizontal: 'center', vertical: 'middle' };
      preparePrint(ws, 'landscape');
      ws.pageSetup.printTitlesRow = '1:5';

      // SHEET 2 — satu baris per baju agar mudah diproduksi
      const detail = workbook.addWorksheet('Detail Produksi', { views: [{ state: 'frozen', ySplit: 5 }] });
      addTitle(detail, 'DETAIL PRODUKSI BAJU DEFILE', `Satu baris mewakili satu baju • Tanpa harga • Total ${totalPcs} pcs`, 7);
      detail.mergeCells('A3:G3');
      detail.getCell('A3').value = 'Gunakan sheet ini sebagai daftar kerja produksi / sortir ukuran.';
      detail.getCell('A3').font = { size: 10, italic: true, color: { argb: 'FF526779' } };
      detail.addRow([]);
      detail.addRow(['No.','No. Daftar','Nama / Instansi','Pemakai','Ukuran','Jenis Lengan','Qty']);
      styleHeaderRow(detail.getRow(5), '175F84');
      production.detail.forEach((d,i) => detail.addRow([i+1,d.noDaftar,d.name,d.wearer,d.size,d.model,d.qty]));
      styleDataRange(detail, 6, detail.rowCount, 7);
      detail.autoFilter = { from: 'A5', to: `G${detail.rowCount}` };
      detail.columns = [
        { width: 7 }, { width: 10 }, { width: 34 }, { width: 12 }, { width: 12 }, { width: 22 }, { width: 8 }
      ];
      [1,2,4,5,7].forEach(c => detail.getColumn(c).alignment = { horizontal: 'center', vertical: 'middle' });
      preparePrint(detail, 'landscape');
      detail.pageSetup.printTitlesRow = '1:5';

      // SHEET 3 — rekap jumlah per ukuran dan jenis lengan
      const recap = workbook.addWorksheet('Rekap Ukuran', { views: [{ state: 'frozen', ySplit: 5 }] });
      addTitle(recap, 'REKAP PRODUKSI PER UKURAN', `Total produksi ${totalPcs} pcs • Tanpa harga`, 5);
      recap.mergeCells('A3:E3');
      recap.getCell('A3').value = 'Ringkasan jumlah baju berdasarkan ukuran dan jenis lengan.';
      recap.getCell('A3').font = { size: 10, italic: true, color: { argb: 'FF526779' } };
      recap.addRow([]);
      recap.addRow(['Ukuran','Lengan Pendek','Lengan Panjang','Belum Ditentukan','Total']);
      styleHeaderRow(recap.getRow(5), '167A70');
      production.sizes.forEach(size => {
        const c = production.counts[size];
        recap.addRow([size,c.short,c.long,c.other,c.total]);
      });
      const totalShort = production.sizes.reduce((n,s) => n + production.counts[s].short, 0);
      const totalLong = production.sizes.reduce((n,s) => n + production.counts[s].long, 0);
      const totalOther = production.sizes.reduce((n,s) => n + production.counts[s].other, 0);
      const totalRow = recap.addRow(['TOTAL', totalShort, totalLong, totalOther, totalPcs]);
      totalRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123B56' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(cell, '123B56');
      });
      styleDataRange(recap, 6, Math.max(5, recap.rowCount-1), 5);
      recap.columns = [{ width: 15 },{ width: 18 },{ width: 18 },{ width: 20 },{ width: 14 }];
      recap.eachRow((row, idx) => { if (idx >= 5) row.alignment = { horizontal: 'center', vertical: 'middle' }; });
      preparePrint(recap, 'portrait');
      recap.pageSetup.printTitlesRow = '1:5';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0,10);
      a.href = url;
      a.download = `DAFTAR_PERCETAKAN_BAJU_DEFILE_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      notify('Daftar percetakan berhasil dibuat.');
    } catch (err) {
      console.error('Printer export failed', err);
      notify('Gagal membuat file percetakan. Silakan coba lagi.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }

  let tries = 0;
  const boot = () => {
    if (ensureUi()) return;
    if (++tries < 80) setTimeout(boot, 150);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
