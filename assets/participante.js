(function () {
  const C = window.CONFIG, D = window.DATOS, A = window.ALMACEN, U = window.UTIL, esc = U.esc;
  const pid = U.idParticipante();
  const $ = s => document.querySelector(s);
  const escenario = $('#escenario');
  const ACTS = D.actividades.filter(a => a.ejercicio || ['pulso', 'ab', 'paso'].includes(a.id));
  const PASOS = D.actividades.filter(a => a.ejercicio).sort((a, b) => a.ejercicio - b.ejercicio);
  const actDe = id => D.actividades.find(a => a.id === id) || {};
  const etiqueta = id => { const a = actDe(id); return a.ejercicio ? `Paso ${a.ejercicio} · ${a.nombre}` : (a.nombre || id); };

  let vivo = null;          // actividad en vivo según los facilitadores
  let vista = null;         // actividad que se muestra en este celular
  let temporizadorGrupo = null;

  // --------------------------------------------------------- memoria local
  const mis = (() => { try { return JSON.parse(localStorage.getItem('iae_mis')) || {}; } catch (e) { return {}; } })();
  const guardarMis = () => { try { localStorage.setItem('iae_mis', JSON.stringify(mis)); } catch (e) {} };

  function brindis(texto) {
    const b = $('#brindis'); b.textContent = texto; b.classList.add('visible');
    clearTimeout(brindis.t); brindis.t = setTimeout(() => b.classList.remove('visible'), 2600);
  }
  function fallo(e) { brindis(e && e.message ? e.message : 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.'); }

  // --------------------------------------------------------- resultados del grupo
  function vigilarGrupo(act, pintar) {
    clearInterval(temporizadorGrupo);
    const caja = $('#grupo');
    if (!caja) return;
    const actualizar = async () => {
      try { const r = await A.resultados(act); if (vista === act && document.body.contains(caja)) caja.innerHTML = pintar(r); }
      catch (e) { /* se reintenta en el siguiente ciclo */ }
    };
    actualizar();
    temporizadorGrupo = setInterval(actualizar, C.INTERVALO_RESULTADOS || 3000);
  }
  const barra = (etiqueta, n, total, mag) => {
    const pct = total ? Math.round(n * 100 / total) : 0;
    return `<div class="barra"><div class="fila"><span>${esc(etiqueta)}</span><b>${pct}%</b></div>
      <div class="pista"><i class="${mag ? 'mag' : ''}" style="width:${pct}%"></i></div></div>`;
  };

  // --------------------------------------------------------- vistas
  const vistas = {};

  vistas.espera = () => {
    escenario.innerHTML = `
      <p class="p-parte">${esc(C.SUBTITULO || '')}</p>
      <h1 class="p-titulo">Ya estás dentro</h1>
      <p class="p-ayuda">Cuando los facilitadores abran una actividad, aparecerá aquí sola. No necesitas recargar la página.</p>
      <ol class="espera-lista">${[...new Set(ACTS.map(a => a.ejercicio ? 'Prioriza tu oportunidad' : a.nombre))]
        .map((t, i) => `<li><span>${i + 1}</span>${esc(t)}</li>`).join('')}</ol>`;
  };

  vistas.pulso = () => {
    const P = D.pulso, mia = mis.pulso && mis.pulso.opcion;
    escenario.innerHTML = `
      <p class="p-parte">Encuesta</p>
      <h1 class="p-titulo">${esc(P.pregunta)}</h1>
      <p class="p-ayuda">Toca la opción que mejor describe a tu organización.</p>
      <ul class="opciones">${P.opciones.map((o, i) => `<li><button type="button" class="opcion" data-op="${o.id}" aria-pressed="${mia === o.id}">
        <span class="marca">${i + 1}</span><strong>${esc(o.titulo)}</strong><span class="desc">${esc(o.desc)}</span></button></li>`).join('')}</ul>
      ${mia ? '<section class="grupo" aria-live="polite"><h2>Así respondió el grupo</h2><div id="grupo"></div></section>' : ''}`;
    escenario.querySelectorAll('[data-op]').forEach(b => b.onclick = async () => {
      try {
        await A.responder(pid, 'pulso', { opcion: b.dataset.op });
        mis.pulso = { opcion: b.dataset.op }; guardarMis(); brindis('Respuesta enviada'); vistas.pulso();
      } catch (e) { fallo(e); }
    });
    if (mia) vigilarGrupo('pulso', r => {
      const t = r.length;
      return P.opciones.map(o => barra(o.titulo, r.filter(x => x.opcion === o.id).length, t)).join('') +
        `<p class="p-ayuda">${t} ${t === 1 ? 'respuesta' : 'respuestas'}</p>`;
    });
  };

  vistas.ab = () => {
    const P = D.ab, mia = mis.ab || {};
    let eleccion = mia.opcion || null;
    escenario.innerHTML = `
      <p class="p-parte">Votación</p>
      <h1 class="p-titulo">${esc(P.pregunta)}</h1>
      <p class="p-ayuda">${esc(P.contexto)}</p>
      <div class="opciones">${P.opciones.map(o => `<button type="button" class="caso ${o.id === 'B' ? 'b' : ''}" data-op="${o.id}" aria-pressed="${eleccion === o.id}">
        <span class="letra">${o.id}</span><span>${esc(o.texto)}</span></button>`).join('')}</div>
      <label class="campo"><span>${esc(P.porque)}</span>
        <textarea id="razon" rows="3" maxlength="200" placeholder="Opcional">${esc(mia.razon || '')}</textarea></label>
      <button class="boton ancho" id="enviar" type="button" ${eleccion ? '' : 'disabled'}>${mia.opcion ? 'Actualizar mi voto' : 'Enviar mi voto'}</button>
      ${mia.opcion ? '<section class="grupo" aria-live="polite"><h2>Así votó el grupo</h2><div id="grupo"></div></section>' : ''}`;
    escenario.querySelectorAll('[data-op]').forEach(b => b.onclick = () => {
      eleccion = b.dataset.op;
      escenario.querySelectorAll('[data-op]').forEach(x => x.setAttribute('aria-pressed', x === b));
      $('#enviar').disabled = false;
    });
    $('#enviar').onclick = async () => {
      const datos = { opcion: eleccion, razon: $('#razon').value.trim().slice(0, 200) };
      try { await A.responder(pid, 'ab', datos); mis.ab = datos; guardarMis(); brindis('Voto enviado'); vistas.ab(); }
      catch (e) { fallo(e); }
    };
    if (mia.opcion) vigilarGrupo('ab', r => {
      const t = r.length, a = r.filter(x => x.opcion === 'A').length;
      return barra('Opción A', a, t) + barra('Opción B', t - a, t, true) + `<p class="p-ayuda">${t} ${t === 1 ? 'voto' : 'votos'}</p>`;
    });
  };

  function miResultado(mia) {
    const P = D.capacidades;
    const orden = P.items.slice().sort((a, b) => mia.calificaciones[a.id] - mia.calificaciones[b.id]);
    return `<div class="veredicto" style="margin-top:1.5rem">
      <h3>Tu preparación: ${mia.promedio.toFixed(1).replace('.', ',')} de 5</h3>
      <p>Tu capacidad más baja es <b>${esc(orden[0].titulo.toLowerCase())}</b>. Este promedio es el eje de preparación de tu iniciativa en la matriz.</p></div>`;
  }
  // Promedio de las seis capacidades, o null si falta alguna.
  function promedioCap(cal) {
    const items = D.capacidades.items;
    if (!cal || !items.every(it => cal[it.id])) return null;
    return +(items.reduce((s, it) => s + cal[it.id], 0) / items.length).toFixed(2);
  }
  // Autoevaluación del ejercicio; si no está completa, la que se hizo como actividad aparte en versiones anteriores.
  function autoevaluacion(b) {
    const prom = promedioCap(b && b.calificaciones);
    return prom != null ? { calificaciones: b.calificaciones, promedio: prom } : (mis.capacidades || null);
  }
  // Suma la autoevaluación, sin nombre, al promedio del grupo que proyecta el presentador.
  async function enviarCapacidades(b) {
    const prom = promedioCap(b.calificaciones);
    if (prom == null) return;
    try { await A.responder(pid, 'capacidades', { calificaciones: b.calificaciones, promedio: prom }); }
    catch (e) { fallo(e); }
  }

  // Ejercicio de priorización ------------------------------------------------
  // Cada paso es una actividad propia: los facilitadores lo abren desde el presentador.
  // Lo que escribe la persona se guarda en este celular a medida que avanza.
  function ejercicio() {
    const b = mis.matriz = mis.matriz || { oportunidad: '', descripcion: '', criterios: {}, publicada: false };
    b.oportunidad = b.oportunidad || ''; b.criterios = b.criterios || {};
    return b;
  }
  const impactoCompleto = b => D.matriz.criterios.every(c => (b.criterios || {})[c.id] !== undefined);
  const coma = n => n.toFixed(1).replace('.', ',');

  const cabeceraEj = n => `<p class="p-parte">Ejercicio · Paso ${n} de 4</p>
    <h1 class="p-titulo">${esc(PASOS[n - 1].nombre)}</h1>
    <ol class="pasos-ej" aria-hidden="true">${PASOS.map((p, i) => `<li class="${i + 1 < n ? 'hecho' : i + 1 === n ? 'actual' : ''}"></li>`).join('')}</ol>`;

  // Aviso al terminar un paso: el siguiente lo abren los facilitadores.
  function marcarListo(ok, texto) {
    const el = $('#listo'); if (!el) return;
    marcarListo.ultimo = [ok, texto];
    el.hidden = !ok;
    if (!ok) return;
    const otraEnVivo = vivo && vivo !== 'espera' && vivo !== vista;
    el.innerHTML = `<b>Listo.</b> ${texto || ''} ${otraEnVivo
      ? '<button type="button" class="enlace" id="ir-vivo">Ir a la actividad en vivo</button>'
      : 'Cuando abramos el siguiente paso, aparecerá aquí.'}`;
    const ir = $('#ir-vivo'); if (ir) ir.onclick = () => { mostrar(vivo); window.scrollTo({ top: 0 }); };
  }
  function conectarPasos() {
    escenario.querySelectorAll('[data-ir-paso]').forEach(x => x.onclick = () => { mostrar(x.dataset.irPaso); window.scrollTo({ top: 0 }); });
  }

  vistas.iniciativa = () => {
    const b = ejercicio();
    escenario.innerHTML = cabeceraEj(1) + `
      <p class="p-ayuda">Piensa en una oportunidad concreta de IA para tu organización o la de un cliente.</p>
      <label class="campo"><span>Nombre de la iniciativa</span>
        <input type="text" id="oportunidad" maxlength="80" value="${esc(b.oportunidad)}" placeholder="Por ejemplo: alertas tempranas de deserción">
        <small>Es lo que aparecerá en la matriz del grupo.</small></label>
      <label class="campo"><span>Descripción de la iniciativa</span>
        <textarea id="descripcion" rows="4" maxlength="300" placeholder="Qué hace, para quién y qué problema resuelve">${esc(b.descripcion || '')}</textarea>
        <small>Opcional. Se queda en tu celular y sale en tu ficha.</small></label>
      <p class="aviso" id="listo" aria-live="polite" hidden></p>`;
    const marcar = () => marcarListo(!!b.oportunidad.trim());
    $('#oportunidad').oninput = e => { b.oportunidad = e.target.value; guardarMis(); marcar(); };
    $('#descripcion').oninput = e => { b.descripcion = e.target.value; guardarMis(); };
    marcar();
  };

  vistas.impacto = () => {
    const P = D.matriz, b = ejercicio();
    escenario.innerHTML = cabeceraEj(2) + `
      <p class="p-ayuda">${b.oportunidad.trim() ? `<b>${esc(b.oportunidad)}</b>: evalúa` : 'Evalúa'} su impacto con los cinco criterios de la parte 1.</p>
      ${b.oportunidad.trim() ? '' : '<p class="aviso">Aún no has escrito el nombre de tu iniciativa. <button type="button" class="enlace" data-ir-paso="iniciativa">Ir al paso 1</button></p>'}
      ${P.criterios.map(c => `<div class="criterio" role="group" aria-labelledby="k-${c.id}"><p id="k-${c.id}">${esc(c.texto)}</p>
        <div class="trio">${P.valores.map(v => `<button type="button" data-c="${c.id}" data-v="${v.id}" aria-pressed="${b.criterios[c.id] === v.id}">${v.texto}</button>`).join('')}</div></div>`).join('')}
      <p class="aviso" id="listo" aria-live="polite" hidden></p>`;
    const marcar = () => marcarListo(impactoCompleto(b), impactoCompleto(b) ? `Impacto: <b>${coma(calcular(b).impacto)}</b> de 5.` : '');
    escenario.querySelectorAll('[data-c]').forEach(x => x.onclick = () => {
      b.criterios[x.dataset.c] = +x.dataset.v; guardarMis();
      escenario.querySelectorAll(`[data-c="${x.dataset.c}"]`).forEach(y => y.setAttribute('aria-pressed', y === x));
      marcar();
    });
    conectarPasos(); marcar();
  };

  let temporizadorCap = null;
  vistas.capacidades = () => {
    const K = D.capacidades, b = ejercicio();
    if (!b.calificaciones) b.calificaciones = Object.assign({}, (mis.capacidades || {}).calificaciones || {});
    const cal = b.calificaciones;
    escenario.innerHTML = cabeceraEj(3) + `
      <p class="p-ayuda"><b>${esc(K.pregunta)}</b> ${esc(K.ayuda)} El promedio es el eje de preparación de la matriz.</p>
      ${K.items.map(it => `<div class="escala-item" role="group" aria-labelledby="c-${it.id}">
        <h3 id="c-${it.id}">${esc(it.titulo)}</h3><p>${esc(it.desc)}</p>
        <div class="escala">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-it="${it.id}" data-v="${n}" aria-pressed="${cal[it.id] === n}" aria-label="${n}: ${esc(K.escala[n - 1])}">${n}</button>`).join('')}</div>
        <div class="escala-extremos"><span>${esc(K.escala[0])}</span><span>${esc(K.escala[4])}</span></div></div>`).join('')}
      <div id="mi-resultado" aria-live="polite"></div>
      <p class="p-ayuda" style="margin-top:1rem">Tus calificaciones se suman, sin tu nombre, al promedio del grupo.</p>
      <p class="aviso" id="listo" aria-live="polite" hidden></p>`;
    const actualizar = () => {
      const prom = promedioCap(cal);
      $('#mi-resultado').innerHTML = prom != null ? miResultado({ calificaciones: cal, promedio: prom }) : '';
      marcarListo(prom != null);
    };
    escenario.querySelectorAll('[data-it]').forEach(x => x.onclick = () => {
      cal[x.dataset.it] = +x.dataset.v; guardarMis();
      escenario.querySelectorAll(`[data-it="${x.dataset.it}"]`).forEach(y => y.setAttribute('aria-pressed', y === x));
      actualizar();
      // En cuanto están las seis, se envían (y se reenvían si cambia alguna) para el promedio del grupo.
      clearTimeout(temporizadorCap);
      if (promedioCap(cal) != null) temporizadorCap = setTimeout(() => enviarCapacidades(b), 700);
    });
    actualizar();
  };

  vistas.matriz = () => {
    const P = D.matriz, b = ejercicio();
    const faltan = [];
    if (!b.oportunidad.trim()) faltan.push('iniciativa');
    if (!impactoCompleto(b)) faltan.push('impacto');
    if (!autoevaluacion(b)) faltan.push('capacidades');
    if (faltan.length) {
      escenario.innerHTML = cabeceraEj(4) + `
        <p class="p-ayuda">Para ver dónde queda tu iniciativa, completa primero:</p>
        <ul class="lista-act">${faltan.map(id => `<li><button type="button" data-ir-paso="${id}"><span>${esc(etiqueta(id))}</span><span aria-hidden="true">→</span></button></li>`).join('')}</ul>`;
      conectarPasos();
      return;
    }
    const r = calcular(b), Q = P.cuadrantes[r.cuadrante];
    const x = ((r.preparacion - 1) / 4) * 100, y = ((r.impacto - 1) / 4) * 100;
    escenario.innerHTML = cabeceraEj(4) + `
      <p class="p-ayuda"><b>${esc(b.oportunidad)}</b></p>
      <div class="veredicto ${r.cuadrante}"><h3>${esc(Q.nombre)}</h3><p>${esc(Q.consejo)}</p>
        <div class="cifras"><span><b>${coma(r.impacto)}</b>impacto</span><span><b>${coma(r.preparacion)}</b>preparación</span></div></div>
      <p class="eje-y">Impacto en el negocio o la misión ↑</p>
      <div class="mini-matriz" aria-label="Tu oportunidad queda en el cuadrante ${esc(Q.nombre)}">
        <div class="q capacidades">Construir capacidades</div><div class="q priorizar">Priorizar</div>
        <div class="q descartar">Descartar o posponer</div><div class="q rapidas">Victoria rápida</div>
        <span class="punto" style="left:${x}%;bottom:${y}%"></span></div>
      <p class="eje-x">Preparación de la organización →</p>
      <div class="acciones">
        <button class="boton" id="publicar" type="button">${b.publicada ? 'Actualizar en la matriz del grupo' : 'Publicar en la matriz del grupo'}</button>
        <button class="boton secundario" id="ficha-btn" type="button">Descargar mi ficha</button></div>
      <p class="p-ayuda" style="margin-top:1rem">En la matriz del grupo solo aparece el nombre de la iniciativa y su ubicación. La descripción se queda en tu celular.</p>
      <button class="enlace" type="button" data-ir-paso="iniciativa">Editar mis respuestas</button>`;
    $('#publicar').onclick = async () => {
      try {
        await A.responder(pid, 'matriz', { oportunidad: b.oportunidad.trim().slice(0, 80), impacto: r.impacto, preparacion: r.preparacion, cuadrante: r.cuadrante });
        b.publicada = true; guardarMis(); brindis('Publicada en la matriz del grupo'); vistas.matriz();
        enviarCapacidades(b);   // por si el envío del paso 3 falló
      } catch (e) { fallo(e); }
    };
    $('#ficha-btn').onclick = imprimirFicha;
    conectarPasos();
  };
  function calcular(b) {
    const suma = D.matriz.criterios.reduce((s, c) => s + ((b.criterios || {})[c.id] || 0), 0);  // 0 a 10
    const impacto = +(1 + suma * 0.4).toFixed(2);
    const a = autoevaluacion(b);
    const preparacion = +((a && a.promedio) || b.preparacion || 3).toFixed(2);
    return { impacto, preparacion, cuadrante: U.cuadrante(impacto, preparacion) };
  }

  vistas.paso = () => {
    const P = D.paso, mia = mis.paso || {};
    escenario.innerHTML = `
      <p class="p-parte">Cierre</p>
      <h1 class="p-titulo">${esc(P.pregunta)}</h1>
      <p class="p-ayuda">${esc(P.ayuda)}</p>
      <label class="campo"><span class="oculto-visual">Tu siguiente paso</span>
        <textarea id="texto" rows="4" maxlength="200" placeholder="${esc(P.ejemplos)}">${esc(mia.texto || '')}</textarea></label>
      <div class="acciones"><button class="boton" id="enviar" type="button">${mia.texto ? 'Actualizar mi siguiente paso' : 'Publicar mi siguiente paso'}</button>
        <button class="boton secundario" id="ficha-btn" type="button">Descargar mi ficha</button></div>
      ${mia.texto ? '<section class="grupo" aria-live="polite"><h2>Lo que hará el grupo</h2><div id="grupo"></div></section>' : ''}`;
    $('#enviar').onclick = async () => {
      const texto = $('#texto').value.trim().slice(0, 200);
      if (texto.length < 3) { brindis('Escribe una acción concreta antes de publicar.'); return; }
      try { await A.responder(pid, 'paso', { texto }); mis.paso = { texto }; guardarMis(); brindis('Publicado'); vistas.paso(); }
      catch (e) { fallo(e); }
    };
    $('#ficha-btn').onclick = imprimirFicha;
    if (mia.texto) vigilarGrupo('paso', r => r.slice().reverse().slice(0, 30)
      .map(x => `<p class="aviso" style="margin:.5rem 0">${esc(x.texto)}</p>`).join(''));
  };

  vistas.preguntas = () => {
    escenario.innerHTML = `<p class="p-parte">Preguntas del público</p>
      <h1 class="p-titulo">¿Qué quieres preguntarles a los facilitadores?</h1>
      <p class="p-ayuda">Apoya con un voto las preguntas que también te interesan. Las más votadas se responden primero.</p>
      <div id="panel-escenario"></div>`;
    montarPreguntas($('#panel-escenario'));
  };

  vistas.fin = () => {
    escenario.innerHTML = `<p class="p-parte">Cierre</p>
      <h1 class="p-titulo">Gracias por participar</h1>
      <p class="p-ayuda">Descarga tu ficha con la oportunidad que priorizaste, tu autoevaluación y tu siguiente paso.</p>
      <div class="acciones"><button class="boton" id="ficha-btn" type="button">Descargar mi ficha</button></div>
      <p class="p-ayuda" style="margin-top:2rem">Conoce más programas en <a href="https://educacioncontinua.uniandes.edu.co" target="_blank" rel="noopener">educacioncontinua.uniandes.edu.co</a>.</p>`;
    $('#ficha-btn').onclick = imprimirFicha;
  };

  function mostrar(act) {
    clearInterval(temporizadorGrupo);
    if (!$('#hoja-preg').classList.contains('abierta')) clearInterval(temporizadorPreg);
    vista = act;
    (vistas[act] || vistas.espera)();
  }

  // --------------------------------------------------------- preguntas del público
  let temporizadorPreg = null;
  function montarPreguntas(caja) {
    caja.innerHTML = `<label class="campo"><span class="oculto-visual">Tu pregunta</span>
        <textarea id="nueva-preg" rows="3" maxlength="280" placeholder="Escribe tu pregunta"></textarea></label>
      <button class="boton ancho" id="enviar-preg" type="button">Enviar pregunta</button>
      <div id="lista-preg" style="margin-top:1rem" aria-live="polite"></div>`;
    const lista = caja.querySelector('#lista-preg');
    const cargar = async () => {
      try {
        const qs = await A.preguntas(pid);
        if (!document.body.contains(lista)) return;
        lista.innerHTML = qs.length ? qs.map(q => `<div class="pregunta-item ${q.respondida ? 'respondida' : ''}">
            <p>${esc(q.texto)}${q.mia ? ' <small style="color:var(--magenta);font-weight:600">· tuya</small>' : ''}${q.respondida ? ' <small>· respondida</small>' : ''}</p>
            <button type="button" class="voto" data-id="${q.id}" aria-pressed="${q.votada}" aria-label="Apoyar esta pregunta. ${q.votos} votos">▲ ${q.votos}</button></div>`).join('')
          : '<p class="p-ayuda">Aún no hay preguntas. Sé la primera persona en preguntar.</p>';
        lista.querySelectorAll('[data-id]').forEach(b => b.onclick = async () => {
          try { await A.votar(pid, +b.dataset.id); cargar(); } catch (e) { fallo(e); }
        });
      } catch (e) { /* reintento */ }
    };
    caja.querySelector('#enviar-preg').onclick = async () => {
      const t = caja.querySelector('#nueva-preg');
      try { await A.preguntar(pid, t.value); t.value = ''; brindis('Pregunta enviada'); cargar(); } catch (e) { fallo(e); }
    };
    cargar();
    clearInterval(temporizadorPreg);
    temporizadorPreg = setInterval(cargar, 4000);
  }

  // --------------------------------------------------------- hojas
  function abrirHoja(id) {
    const h = $(id); h.hidden = false; $('#fondo').classList.add('abierta');
    requestAnimationFrame(() => h.classList.add('abierta'));
    const f = h.querySelector('button, textarea'); if (f) setTimeout(() => f.focus(), 250);
  }
  function cerrarHojas() {
    document.querySelectorAll('.hoja').forEach(h => { h.classList.remove('abierta'); setTimeout(() => h.hidden = true, 250); });
    $('#fondo').classList.remove('abierta');
    if (vista !== 'preguntas') clearInterval(temporizadorPreg);
  }
  $('#fondo').onclick = cerrarHojas;
  document.querySelectorAll('[data-cerrar]').forEach(b => b.onclick = cerrarHojas);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarHojas(); });

  function hechaActividad(id) {
    const b = mis.matriz || {};
    if (id === 'iniciativa') return !!(b.oportunidad || '').trim();
    if (id === 'impacto') return impactoCompleto(b);
    if (id === 'capacidades') return !!autoevaluacion(b);
    if (id === 'matriz') return !!b.publicada;
    return !!mis[id];
  }
  $('#btn-actividades').onclick = () => {
    $('#lista-act').innerHTML = ACTS.map(a => {
      const hecho = hechaActividad(a.id);
      return `<li><button type="button" data-ir="${a.id}"><span>${esc(etiqueta(a.id))}</span>
        ${a.id === vivo ? '<span class="vivo">En vivo</span>' : hecho ? '<span class="listo">Respondida</span>' : ''}</button></li>`;
    }).join('');
    $('#lista-act').querySelectorAll('[data-ir]').forEach(b => b.onclick = () => { cerrarHojas(); mostrar(b.dataset.ir); window.scrollTo({ top: 0 }); });
    abrirHoja('#hoja-act');
  };
  $('#btn-preguntas').onclick = () => { montarPreguntas($('#panel-preguntas')); abrirHoja('#hoja-preg'); };

  // --------------------------------------------------------- ficha imprimible
  function imprimirFicha() {
    const b = mis.matriz || {}, P = D.matriz, cap = autoevaluacion(b);
    let html = `<h1>${esc(C.TITULO)}</h1><p>${esc(C.SUBTITULO || '')} · ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>`;
    if (b.oportunidad) {
      const r = calcular(b), Q = P.cuadrantes[r.cuadrante];
      html += `<h2>Oportunidad priorizada</h2><p><b>${esc(b.oportunidad)}</b></p>
        ${(b.descripcion || '').trim() ? `<p>${esc(b.descripcion.trim())}</p>` : ''}
        <p>Impacto: ${r.impacto.toFixed(1)} de 5 · Preparación: ${r.preparacion.toFixed(1)} de 5 · Cuadrante: <b>${esc(Q.nombre)}</b>. ${esc(Q.consejo)}</p>
        <h2>Criterios de impacto</h2><ul>${P.criterios.map(c => `<li>${esc(c.texto)} ${esc((P.valores.find(v => v.id === (b.criterios || {})[c.id]) || {}).texto || '—')}</li>`).join('')}</ul>`;
    }
    if (cap) html += `<h2>Autoevaluación de capacidades (promedio ${cap.promedio.toFixed(1)})</h2><ul>${D.capacidades.items.map(it => `<li>${esc(it.titulo)}: ${cap.calificaciones[it.id]} de 5</li>`).join('')}</ul>`;
    if (mis.paso) html += `<h2>Mi siguiente paso</h2><p>${esc(mis.paso.texto)}</p>`;
    if (!b.oportunidad && !cap && !mis.paso) { brindis('Completa al menos una actividad para generar tu ficha.'); return; }
    $('#ficha').innerHTML = html;
    window.print();
  }

  // --------------------------------------------------------- ciclo de sincronización
  const indicador = $('#estado');
  async function sincronizar() {
    try {
      const e = await A.estado();
      indicador.className = 'en-vivo' + (A.modo === 'demo' ? ' demo' : '');
      indicador.textContent = A.modo === 'demo' ? 'Modo demo' : 'En vivo';
      if (e.actividad !== vivo) {
        const anterior = vivo; vivo = e.actividad;
        if (vivo !== vista) {   // si la persona ya llegó a esa actividad por su cuenta, no se interrumpe
          if (anterior !== null && vivo !== 'espera') brindis('Nueva actividad: ' + etiqueta(vivo));
          mostrar(vivo);
        } else if (marcarListo.ultimo) marcarListo(...marcarListo.ultimo);   // actualiza el aviso del paso
      }
    } catch (err) {
      indicador.className = 'en-vivo error'; indicador.textContent = 'Sin conexión';
      if (vista === null) mostrar('espera');
    }
  }
  A.unirse(pid).catch(() => {});
  sincronizar();
  setInterval(sincronizar, C.INTERVALO_ESTADO || 2500);
  if (A.modo === 'demo') window.addEventListener('storage', e => { if (e.key === 'iae_demo') sincronizar(); });
})();
