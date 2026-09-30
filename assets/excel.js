// Genera un libro de Excel (.xlsx) sin librerías externas: hojas con texto y números.
// Una celda puede ser texto, número o { v: valor, s: estilo } con estilo 1 = negrita,
// 2 = porcentaje, 3 = número con un decimal.
window.EXCEL = (function () {
  const NS = 'http://schemas.openxmlformats.org';
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const enc = new TextEncoder();

  // ------------------------------------------------------------ ZIP sin compresión
  const TABLA = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = TABLA[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(archivos) {
    const locales = [], central = [];
    let desplazamiento = 0;
    archivos.forEach(({ nombre, datos }) => {
      const n = enc.encode(nombre), crc = crc32(datos);
      const l = new DataView(new ArrayBuffer(30));
      l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x0800, true);
      l.setUint16(12, 0x21, true);                       // fecha 1980-01-01
      l.setUint32(14, crc, true); l.setUint32(18, datos.length, true); l.setUint32(22, datos.length, true);
      l.setUint16(26, n.length, true);
      locales.push(new Uint8Array(l.buffer), n, datos);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(14, 0x21, true);
      c.setUint32(16, crc, true); c.setUint32(20, datos.length, true); c.setUint32(24, datos.length, true);
      c.setUint16(28, n.length, true); c.setUint32(42, desplazamiento, true);
      central.push(new Uint8Array(c.buffer), n);
      desplazamiento += 30 + n.length + datos.length;
    });
    const tamCentral = central.reduce((s, b) => s + b.length, 0);
    const f = new DataView(new ArrayBuffer(22));
    f.setUint32(0, 0x06054b50, true); f.setUint16(8, archivos.length, true); f.setUint16(10, archivos.length, true);
    f.setUint32(12, tamCentral, true); f.setUint32(16, desplazamiento, true);
    return new Blob([...locales, ...central, new Uint8Array(f.buffer)],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  // ------------------------------------------------------------ partes del libro
  const x = s => String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const columna = i => { let s = ''; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
  const nombreHoja = s => String(s).replace(/[:\\/?*[\]]/g, ' ').slice(0, 31);

  function hoja({ filas, anchos }) {
    const cols = anchos ? `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const datos = filas.map((fila, r) => `<row r="${r + 1}">${(fila || []).map((celda, i) => {
      if (celda == null || celda === '') return '';
      const o = typeof celda === 'object' ? celda : { v: celda };
      if (o.v == null || o.v === '') return '';
      const ref = columna(i) + (r + 1), s = o.s ? ` s="${o.s}"` : '';
      return typeof o.v === 'number' && isFinite(o.v)
        ? `<c r="${ref}"${s}><v>${o.v}</v></c>`
        : `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${x(o.v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    return `${XML}<worksheet xmlns="${NS}/spreadsheetml/2006/main">${cols}<sheetData>${datos}</sheetData></worksheet>`;
  }

  const ESTILOS = `${XML}<styleSheet xmlns="${NS}/spreadsheetml/2006/main">` +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  // hojas: [{ nombre, filas: [[celda, ...], ...], anchos: [número, ...] }]
  function libro(hojas) {
    const parte = (nombre, texto) => ({ nombre, datos: enc.encode(texto) });
    return zip([
      parte('[Content_Types].xml', `${XML}<Types xmlns="${NS}/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        hojas.map((h, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
        '</Types>'),
      parte('_rels/.rels', `${XML}<Relationships xmlns="${NS}/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
      parte('xl/workbook.xml', `${XML}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets>` +
        hojas.map((h, i) => `<sheet name="${x(nombreHoja(h.nombre))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>'),
      parte('xl/_rels/workbook.xml.rels', `${XML}<Relationships xmlns="${NS}/package/2006/relationships">` +
        hojas.map((h, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${hojas.length + 1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
      parte('xl/styles.xml', ESTILOS),
      ...hojas.map((h, i) => parte(`xl/worksheets/sheet${i + 1}.xml`, hoja(h)))
    ]);
  }

  // Descarga un archivo generado en el navegador.
  function descargar(blob, nombre) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return { libro, descargar };
})();
