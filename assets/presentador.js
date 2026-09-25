(function () {
  const C = window.CONFIG, D = window.DATOS, A = window.ALMACEN, U = window.UTIL, esc = U.esc;
  const $ = s => document.querySelector(s);
  const escena = $('#escena');
  const ORDEN = D.actividades.map(a => a.id);
  const nombreDe = id => (D.actividades.find(a => a.id === id) || {}).nombre || id;
  const parteDe = id => (D.actividades.find(a => a.id === id) || {}).parte || '';
  const coma = n => n.toFixed(1).replace('.', ',');

  const urlPart = (C.URL_PARTICIPANTES || location.href.replace(/[?#].*$/, '').replace(/presentador\.html$/, '')).trim();
  const urlCorta = urlPart.replace(/^https?:\/\//, '').replace(/\/$/, '');

  let vivo = null, resumen = { participantes: 0, respuestas: {}, preguntas: 0 };
  let pintado = null;          // actividad actualmente dibujada
  let firma = null;            // huella de los últimos datos dibujados
  const vistos = new Set();    // elementos ya animados
  const nuevo = k => { if (vistos.has(k)) return ''; vistos.add(k); return ' nuevo'; };

  // ------------------------------------------------------------ QR
  function qr(el) {
    if (!el) return;
    try {
      const q = qrcode(0, 'M'); q.addData(urlPart); q.make();
      el.innerHTML = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true, alt: 'Código QR para participar' });
      const svg = el.querySelector('svg'); if (svg) { svg.style.width = '100%'; svg.style.height = '100%'; svg.querySelectorAll('path').forEach(p => p.setAttribute('fill', '#131A35')); }
    } catch (e) { el.innerHTML = `<p style="font-size:.8rem">${esc(urlCorta)}</p>`; }
  }
  const esquinaQR = () => `<div class="qr-esquina"><div class="qr" id="qr-mini"></div><p>Participa en<b>${esc(urlCorta)}</b></p></div>`;

  // ------------------------------------------------------------ clave del facilitador
  let clave = sessionStorage.getItem('iae_clave') || '';
  function pedirClave() {
    return new Promise(resolve => {
      if (A.modo === 'demo' || clave) return resolve(clave || 'demo');
      const dlg = $('#dlg-clave'), inp = $('#in-clave'), err = $('#err-clave');
      err.hidden = true; inp.value = ''; dlg.showModal(); inp.focus();
      $('#cancelar-clave').onclick = () => { dlg.close(); resolve(null); };
      $('#form-clave').onsubmit = async ev => {
        ev.preventDefault();
        try {
          const ok = await A.verificarClave(inp.value);
          if (!ok) { err.textContent = 'La clave no es correcta.'; err.hidden = false; return; }
          clave = inp.value; sessionStorage.setItem('iae_clave', clave); dlg.close(); resolve(clave);
        } catch (e) { err.textContent = 'No se pudo verificar: ' + e.message; err.hidden = false; }
      };
    });
  }
  async function conClave(fn) {
    const k = await pedirClave(); if (!k) return;
    try { await fn(k); }
    catch (e) {
      if (/clave/i.test(e.message)) { clave = ''; sessionStorage.removeItem('iae_clave'); }
      alert(e.message);
    }
  }
  async function irA(act) {
    await conClave(async k => { await A.cambiarActividad(k, act); vivo = act; pintarRiel(); await refrescar(true); });
  }

  // ------------------------------------------------------------ riel
  function pintarRiel() {
    $('#n-part').textContent = resumen.participantes || 0;
    $('#riel-lista').innerHTML = D.actividades.map(a => {
      const n = a.id === 'preguntas' ? resumen.preguntas : (resumen.respuestas || {})[a.id];
      return `<li><button type="button" data-act="${a.id}" aria-current="${a.id === vivo}">
        <span>${esc(a.corto)}</span>${n ? `<span class="n">${n}</span>` : ''}</button></li>`;
    }).join('');
    $('#riel-lista').querySelectorAll('[data-act]').forEach(b => b.onclick = () => irA(b.dataset.act));
  }

  // ------------------------------------------------------------ escenas
  const encabezado = (act, titulo, sub) => `
    ${parteDe(act) ? `<p class="e-parte">${esc(parteDe(act))}</p>` : ''}
    <h1 class="e-titulo">${esc(titulo)}</h1>${sub ? `<p class="e-sub">${esc(sub)}</p>` : ''}`;
  const cuenta = (n, s, p) => `<p class="e-cuenta">${n} ${n === 1 ? s : p}</p>`;

  const escenas = {
    espera: {
      marco: () => `<div class="sala"><div>
          <p class="e-parte">${esc(C.SUBTITULO || '')}</p>
          <h1>${esc(C.TITULO)}</h1>
          <p class="e-sub" style="margin:0">Entra desde tu celular para participar en las actividades de hoy.</p>
          <span class="url">${esc(urlCorta)}</span>
          <p class="contador"><b id="cont">${resumen.participantes || 0}</b>personas conectadas</p>
        </div><div class="qr" id="qr-grande"></div></div>`,
      montar: () => qr($('#qr-grande')),
      datos: null,
      actualizar: () => { const c = $('#cont'); if (c) c.textContent = resumen.participantes || 0; }
    },

    pulso: {
      marco: () => encabezado('pulso', D.pulso.pregunta) + `<div class="e-cuerpo"><div class="barras" id="cuerpo"></div><div id="pie"></div></div>`,
      datos: 'pulso',
      actualizar: r => {
        const t = r.length, cuentas = D.pulso.opciones.map(o => r.filter(x => x.opcion === o.id).length);
        const max = Math.max(...cuentas);
        $('#cuerpo').innerHTML = D.pulso.opciones.map((o, i) => {
          const pct = t ? Math.round(cuentas[i] * 100 / t) : 0;
          return `<div class="bg-fila ${t && cuentas[i] === max ? 'lider' : ''}"><div class="et">${esc(o.titulo)}<small>${esc(o.desc)}</small></div>
            <div class="bg-pista"><i style="width:${pct}%"></i></div><div class="pct">${pct}%</div></div>`;
        }).join('');
        $('#pie').innerHTML = cuenta(t, 'respuesta', 'respuestas');
      }
    },

    ab: {
      marco: () => encabezado('ab', D.ab.pregunta, D.ab.contexto) + `<div class="e-cuerpo">
          <div class="dividida"><div class="a" id="da" style="flex-grow:1">A</div><div class="b" id="db" style="flex-grow:1">B</div></div>
          <div class="ab-casos">${D.ab.opciones.map(o => `<p><b>${o.id}.</b> ${esc(o.texto)}</p>`).join('')}</div>
          <div class="razones" id="razones"></div><div id="pie"></div></div>`,
      datos: 'ab',
      actualizar: r => {
        const t = r.length, a = r.filter(x => x.opcion === 'A').length, b = t - a;
        const pa = t ? Math.round(a * 100 / t) : 50, pb = t ? 100 - pa : 50;
        $('#da').style.flexGrow = Math.max(pa, 0.001); $('#db').style.flexGrow = Math.max(pb, 0.001);
        $('#da').textContent = t ? `A · ${pa}%` : 'A'; $('#db').textContent = t ? `${pb}% · B` : 'B';
        const razones = r.filter(x => x.razon).slice(-6).reverse();
        $('#razones').innerHTML = razones.map(x => `<div class="razon ${x.opcion === 'B' ? 'b' : ''}${nuevo('r' + x.opcion + x.razon)}"><b>${x.opcion}</b>${esc(x.razon)}</div>`).join('');
        $('#pie').innerHTML = cuenta(t, 'voto', 'votos');
      }
    },

    capacidades: {
      marco: () => encabezado('capacidades', 'Así de preparado está el grupo') + `<div class="e-cuerpo"><div class="cap">
          <div class="cap-total" id="total"></div>
          <div><div class="pistas" id="pistas"></div>
          <div class="pt-marcas" style="margin-top:.6rem"><span></span><div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div><span></span></div></div>
        </div><div id="pie"></div></div>`,
      datos: 'capacidades',
      actualizar: r => {
        const items = D.capacidades.items.map(it => {
          const v = r.map(x => x.calificaciones && x.calificaciones[it.id]).filter(Boolean);
          return { it, m: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0 };
        });
        const conDatos = items.filter(x => x.m > 0);
        const min = conDatos.length ? conDatos.reduce((a, b) => (b.m < a.m ? b : a)) : null;
        const prom = r.length ? r.reduce((s, x) => s + (x.promedio || 0), 0) / r.length : 0;
        $('#total').innerHTML = r.length
          ? `Preparación promedio<b>${coma(prom)}</b>de 5<p>La capacidad más baja del grupo: <strong>${esc(min.it.titulo)}</strong></p>`
          : `Preparación promedio<b>–</b>Esperando respuestas`;
        $('#pistas').innerHTML = items.map(x => {
          const pos = x.m ? ((x.m - 1) / 4) * 100 : 0;
          return `<div class="pt-fila ${min && x === min ? 'baja' : ''}"><div class="et">${esc(x.it.titulo)}</div>
            <div class="pt-riel"><i style="width:${pos}%"></i>${x.m ? `<span style="left:${pos}%"></span>` : ''}</div>
            <div class="v">${x.m ? coma(x.m) : '–'}</div></div>`;
        }).join('');
        $('#pie').innerHTML = cuenta(r.length, 'persona', 'personas');
      }
    },

    matriz: {
      marco: () => encabezado('matriz', 'Dónde invertir y qué priorizar') + `<div class="e-cuerpo"><div class="mz">
          <div class="mz-y">Impacto en el negocio o la misión →</div>
          <div class="mz-lienzo" id="lienzo">
            <div class="mz-q q capacidades"><span class="t">Construir capacidades</span><span class="n" data-q="capacidades"></span></div>
            <div class="mz-q q priorizar"><span class="t">Priorizar</span><span class="n" data-q="priorizar"></span></div>
            <div class="mz-q q descartar"><span class="t">Descartar o posponer</span><span class="n" data-q="descartar"></span></div>
            <div class="mz-q q rapidas"><span class="t">Victorias rápidas</span><span class="n" data-q="rapidas"></span></div>
          </div>
          <div class="mz-x">Preparación de la organización →</div>
        </div><div id="pie"></div></div>`,
      datos: 'matriz',
      actualizar: r => {
        const lienzo = $('#lienzo');
        lienzo.querySelectorAll('.mz-punto').forEach(p => p.remove());
        const cuentas = { priorizar: 0, capacidades: 0, rapidas: 0, descartar: 0 };
        const elementos = [];
        r.forEach(x => {
          const q = U.cuadrante(x.impacto, x.preparacion); cuentas[q]++;
          const h = hash(x.oportunidad || '');
          const px = Math.min(97, Math.max(3, ((x.preparacion - 1) / 4) * 100 + ((h % 7) - 3) * 0.5));
          const py = Math.min(96, Math.max(4, ((x.impacto - 1) / 4) * 100 + (((h >> 3) % 7) - 3) * 0.5));
          const el = document.createElement('div');
          el.className = 'mz-punto' + (px > 70 ? ' izq' : '') + nuevo('m' + x.oportunidad + x.impacto + x.preparacion);
          el.style.left = px + '%'; el.style.bottom = py + '%';
          el.innerHTML = `<i></i><span>${esc(x.oportunidad)}</span>`;
          lienzo.appendChild(el); elementos.push(el);
        });
        Object.keys(cuentas).forEach(k => { const n = lienzo.querySelector(`[data-q="${k}"]`); n.textContent = cuentas[k] || ''; });
        // Primero se reservan los títulos de los cuadrantes y todos los puntos; luego se ubican las etiquetas.
        const puestos = [...lienzo.querySelectorAll('.mz-q .t, .mz-q .n'), ...elementos.map(e => e.querySelector('i'))]
          .map(e => e.getBoundingClientRect()).filter(r => r.width);
        const marco = lienzo.getBoundingClientRect();
        elementos.forEach(el => acomodar(el, puestos, marco));
        $('#pie').innerHTML = cuenta(r.length, 'oportunidad publicada', 'oportunidades publicadas');
      }
    },

    paso: {
      marco: () => encabezado('paso', D.paso.pregunta) + `<div class="e-cuerpo"><div class="muro" id="muro"></div><div id="pie"></div></div>`,
      datos: 'paso',
      actualizar: r => {
        const muro = $('#muro'), ultimos = r.slice(-18).reverse();
        muro.innerHTML = ultimos.length ? ultimos.map(x => `<p class="${nuevo('p' + x.texto).trim()}">${esc(x.texto)}</p>`).join('')
          : '<div class="vacio">Los siguientes pasos del grupo aparecerán aquí.</div>';
        $('#pie').innerHTML = cuenta(r.length, 'compromiso', 'compromisos');
      }
    },

    preguntas: {
      marco: () => encabezado('preguntas', 'Preguntas del público', 'Las más votadas primero. Envía la tuya desde el celular con el botón “Preguntar”.') +
        `<div class="e-cuerpo"><div class="pr-preguntas" id="lista"></div></div>`,
      datos: '__preguntas',
      actualizar: qs => {
        const lista = $('#lista');
        lista.innerHTML = qs.length ? qs.slice(0, 12).map(q => `<div class="pr-pregunta ${q.respondida ? 'respondida' : ''}">
            <div class="votos">${q.votos}<small>${q.votos === 1 ? 'voto' : 'votos'}</small></div><p>${esc(q.texto)}</p>
            <div class="ctrl"><button type="button" data-resp="${q.id}" data-v="${!q.respondida}">${q.respondida ? 'Reabrir' : 'Respondida'}</button>
            <button type="button" data-ocultar="${q.id}">Ocultar</button></div></div>`).join('')
          : '<div class="vacio">Aún no hay preguntas.</div>';
        lista.querySelectorAll('[data-resp]').forEach(b => b.onclick = () => conClave(async k => {
          await A.marcarPregunta(k, +b.dataset.resp, b.dataset.v === 'true', null); refrescar(true);
        }));
        lista.querySelectorAll('[data-ocultar]').forEach(b => b.onclick = () => conClave(async k => {
          await A.marcarPregunta(k, +b.dataset.ocultar, null, true); refrescar(true);
        }));
      }
    },

    fin: {
      marco: () => `<div class="sala"><div>
          <p class="e-parte">${esc(C.SUBTITULO || '')}</p>
          <h1>Gracias</h1>
          <p class="e-sub">Descarga tu ficha desde el celular: incluye la oportunidad que priorizaste, tu autoevaluación y tu siguiente paso.</p>
          <span class="url">${esc(urlCorta)}</span>
        </div><div class="qr" id="qr-grande"></div></div>`,
      montar: () => qr($('#qr-grande')),
      datos: null
    }
  };

  // Mueve la etiqueta de un punto hasta que no choque con las ya ubicadas.
  function acomodar(el, puestos, marco) {
    const span = el.querySelector('span');
    const fuera = r => r.left < marco.left + 4 || r.right > marco.right - 4 || r.top < marco.top + 2 || r.bottom > marco.bottom - 2;
    const choca = r => fuera(r) || puestos.some(p => !(r.right + 4 < p.left || r.left - 4 > p.right || r.bottom + 2 < p.top || r.top - 2 > p.bottom));
    const alto = span.getBoundingClientRect().height + 3;
    const lado = el.classList.contains('izq');
    const intentos = [[lado, 0], [!lado, 0], [lado, -alto], [lado, alto], [!lado, -alto], [!lado, alto], [lado, -2 * alto], [lado, 2 * alto], [!lado, -2 * alto], [!lado, 2 * alto],
      [lado, -3 * alto], [lado, 3 * alto], [!lado, -3 * alto], [!lado, 3 * alto]];
    for (const [izq, dy] of intentos) {
      el.classList.toggle('izq', izq); span.style.transform = `translateY(${dy}px)`;
      const r = span.getBoundingClientRect();
      if (!choca(r)) { puestos.push(r); return; }
    }
    el.classList.toggle('izq', lado); span.style.transform = ''; puestos.push(span.getBoundingClientRect());
  }

  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  function dibujar(act) {
    const E = escenas[act] || escenas.espera;
    escena.innerHTML = E.marco() + (['espera', 'fin'].includes(act) ? '' : esquinaQR());
    if (E.montar) E.montar();
    qr($('#qr-mini'));
    pintado = act; firma = null;
  }

  async function refrescar(forzar) {
    try {
      const [e, r] = await Promise.all([A.estado(), A.resumen()]);
      resumen = r || resumen;
      $('#modo').textContent = A.modo === 'demo' ? '● Modo demo (sin base de datos)' : '● En vivo con Supabase';
      if (e.actividad !== vivo) vivo = e.actividad;
      pintarRiel();
      if (pintado !== vivo || forzar === 'redibujar') dibujar(vivo);
      const E = escenas[vivo] || escenas.espera;
      let datos = null;
      if (E.datos === '__preguntas') datos = await A.preguntas('00000000-0000-0000-0000-000000000000');
      else if (E.datos) datos = await A.resultados(E.datos);
      const f = JSON.stringify(datos) + '|' + (resumen.participantes || 0);
      if (f !== firma && E.actualizar) { E.actualizar(datos || []); firma = f; }
    } catch (err) {
      $('#modo').textContent = '● Sin conexión: ' + err.message;
      if (pintado === null) dibujar('espera');
    }
  }

  // ------------------------------------------------------------ controles
  $('#btn-pantalla').onclick = pantallaCompleta;
  function pantallaCompleta() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }
  $('#btn-reiniciar').onclick = () => {
    if (!confirm('Esto borra todas las respuestas, preguntas y participantes, y vuelve a la sala de espera. ¿Continuar?')) return;
    conClave(async k => { await A.reiniciar(k); await refrescar('redibujar'); });
  };
  if (A.modo === 'demo') {
    const b = $('#btn-ejemplo'); b.hidden = false;
    b.onclick = async () => { A.cargarEjemplo(); await refrescar('redibujar'); };
  }
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, dialog')) return;
    const i = ORDEN.indexOf(vivo);
    if (e.key === 'ArrowRight' && i < ORDEN.length - 1) irA(ORDEN[i + 1]);
    else if (e.key === 'ArrowLeft' && i > 0) irA(ORDEN[i - 1]);
    else if (e.key.toLowerCase() === 'r') document.body.classList.toggle('sin-riel');
    else if (e.key.toLowerCase() === 'f') pantallaCompleta();
  });
  if (A.modo === 'demo') window.addEventListener('storage', ev => { if (ev.key === 'iae_demo') refrescar(); });

  refrescar();
  setInterval(refrescar, C.INTERVALO_RESULTADOS || 3000);
})();
