(function () {
  const C = window.CONFIG, D = window.DATOS, A = window.ALMACEN, U = window.UTIL, esc = U.esc;
  const pid = U.idParticipante();
  const $ = s => document.querySelector(s);
  const escenario = $('#escenario');
  const ACTS = D.actividades.filter(a => ['pulso', 'ab', 'capacidades', 'matriz', 'paso'].includes(a.id));
  const nombreDe = id => (D.actividades.find(a => a.id === id) || {}).nombre || id;

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
      <ol class="espera-lista">${ACTS.map((a, i) => `<li><span>${i + 1}</span>${esc(a.nombre)}</li>`).join('')}</ol>`;
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

  vistas.capacidades = () => {
    const P = D.capacidades, mia = mis.capacidades || {};
    const cal = Object.assign({}, mia.calificaciones || {});
    const completo = () => P.items.every(it => cal[it.id]);
    escenario.innerHTML = `
      <p class="p-parte">Autoevaluación</p>
      <h1 class="p-titulo">${esc(P.pregunta)}</h1>
      <p class="p-ayuda">${esc(P.ayuda)}</p>
      ${P.items.map(it => `<div class="escala-item" role="group" aria-labelledby="c-${it.id}">
        <h3 id="c-${it.id}">${esc(it.titulo)}</h3><p>${esc(it.desc)}</p>
        <div class="escala">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-it="${it.id}" data-v="${n}" aria-pressed="${cal[it.id] === n}" aria-label="${n}: ${esc(P.escala[n - 1])}">${n}</button>`).join('')}</div>
        <div class="escala-extremos"><span>${esc(P.escala[0])}</span><span>${esc(P.escala[4])}</span></div></div>`).join('')}
      <div class="acciones"><button class="boton" id="enviar" type="button" ${completo() ? '' : 'disabled'}>${mia.promedio ? 'Actualizar mi resultado' : 'Ver mi resultado'}</button></div>
      <div id="mi-resultado">${mia.promedio ? miResultado(mia) : ''}</div>
      ${mia.promedio ? '<section class="grupo" aria-live="polite"><h2>Promedio del grupo por capacidad</h2><div id="grupo"></div></section>' : ''}`;
    escenario.querySelectorAll('[data-it]').forEach(b => b.onclick = () => {
      cal[b.dataset.it] = +b.dataset.v;
      escenario.querySelectorAll(`[data-it="${b.dataset.it}"]`).forEach(x => x.setAttribute('aria-pressed', x === b));
      $('#enviar').disabled = !completo();
    });
    $('#enviar').onclick = async () => {
      const vals = P.items.map(it => cal[it.id]);
      const datos = { calificaciones: cal, promedio: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) };
      try {
        await A.responder(pid, 'capacidades', datos);
        mis.capacidades = datos; guardarMis(); brindis('Resultado guardado'); vistas.capacidades();
        setTimeout(() => { const m = $('#mi-resultado'); if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
      } catch (e) { fallo(e); }
    };
    if (mia.promedio) vigilarGrupo('capacidades', r => {
      if (!r.length) return '';
      return P.items.map(it => {
        const vals = r.map(x => x.calificaciones && x.calificaciones[it.id]).filter(Boolean);
        const m = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return `<div class="barra"><div class="fila"><span>${esc(it.titulo)}</span><b>${m.toFixed(1)}</b></div>
          <div class="pista"><i style="width:${(m / 5) * 100}%"></i></div></div>`;
      }).join('') + `<p class="p-ayuda">${r.length} ${r.length === 1 ? 'persona' : 'personas'}</p>`;
    });
  };
  function miResultado(mia) {
    const P = D.capacidades;
    const orden = P.items.slice().sort((a, b) => mia.calificaciones[a.id] - mia.calificaciones[b.id]);
    return `<div class="veredicto" style="margin-top:1.5rem">
      <h3>Tu preparación: ${mia.promedio.toFixed(1).replace('.', ',')} de 5</h3>
      <p>Tu capacidad más baja es <b>${esc(orden[0].titulo.toLowerCase())}</b>. Este promedio será el eje de preparación en el ejercicio de priorización.</p></div>`;
  }

  // Ejercicio de priorización ------------------------------------------------
  vistas.matriz = () => {
    const P = D.matriz;
    const b = mis.matriz = mis.matriz || { paso: 1, oportunidad: '', respuestas: {}, criterios: {}, preparacion: null, publicada: false };
    const total = 4;
    const cabecera = `<p class="p-parte">Ejercicio aplicado</p><h1 class="p-titulo">${esc(P.pregunta)}</h1>
      <ol class="pasos-ej" aria-label="Paso ${Math.min(b.paso, 4)} de ${total}">${[1, 2, 3, 4].map(n => `<li class="${n < b.paso ? 'hecho' : n === b.paso ? 'actual' : ''}"></li>`).join('')}</ol>`;
    const ir = n => { b.paso = n; guardarMis(); vistas.matriz(); escenario.focus(); window.scrollTo({ top: 0 }); };

    if (b.paso === 1) {
      escenario.innerHTML = cabecera + `
        <label class="campo"><span>¿Qué oportunidad de IA vas a evaluar?</span>
          <input type="text" id="oportunidad" maxlength="80" value="${esc(b.oportunidad)}" placeholder="Por ejemplo: alertas tempranas de deserción">
          <small>Puede ser de tu organización o de un cliente.</small></label>
        <p class="p-ayuda" style="margin-bottom:.75rem">Responde las preguntas clave que puedas. Se quedan en tu celular y salen en tu ficha.</p>
        ${P.preguntasClave.map((q, i) => `<details class="acordeon ${b.respuestas[i] ? 'lleno' : ''}">
          <summary><span class="num">${i + 1}</span><span>${esc(q)}</span></summary>
          <textarea data-q="${i}" rows="3" maxlength="400" aria-label="${esc(q)}">${esc(b.respuestas[i] || '')}</textarea></details>`).join('')}
        <div class="acciones"><button class="boton" id="sig" type="button" ${b.oportunidad.trim() ? '' : 'disabled'}>Siguiente: impacto</button></div>`;
      $('#oportunidad').oninput = e => { b.oportunidad = e.target.value; guardarMis(); $('#sig').disabled = !b.oportunidad.trim(); };
      escenario.querySelectorAll('[data-q]').forEach(t => t.oninput = () => {
        b.respuestas[t.dataset.q] = t.value; guardarMis();
        t.closest('details').classList.toggle('lleno', !!t.value.trim());
      });
      $('#sig').onclick = () => ir(2);
    }

    else if (b.paso === 2) {
      const listo = () => P.criterios.every(c => b.criterios[c.id] !== undefined);
      escenario.innerHTML = cabecera + `
        <p class="p-ayuda"><b>${esc(b.oportunidad)}</b>: evalúa su impacto con los cinco criterios de la parte 1.</p>
        ${P.criterios.map(c => `<div class="criterio" role="group" aria-labelledby="k-${c.id}"><p id="k-${c.id}">${esc(c.texto)}</p>
          <div class="trio">${P.valores.map(v => `<button type="button" data-c="${c.id}" data-v="${v.id}" aria-pressed="${b.criterios[c.id] === v.id}">${v.texto}</button>`).join('')}</div></div>`).join('')}
        <div class="acciones"><button class="boton secundario" id="ant" type="button">Atrás</button>
          <button class="boton" id="sig" type="button" ${listo() ? '' : 'disabled'}>Siguiente: preparación</button></div>`;
      escenario.querySelectorAll('[data-c]').forEach(x => x.onclick = () => {
        b.criterios[x.dataset.c] = +x.dataset.v; guardarMis();
        escenario.querySelectorAll(`[data-c="${x.dataset.c}"]`).forEach(y => y.setAttribute('aria-pressed', y === x));
        $('#sig').disabled = !listo();
      });
      $('#ant').onclick = () => ir(1); $('#sig').onclick = () => ir(3);
    }

    else if (b.paso === 3) {
      const prom = mis.capacidades && mis.capacidades.promedio;
      if (b.preparacion == null) b.preparacion = prom || 3;
      escenario.innerHTML = cabecera + `
        <p class="p-ayuda">${prom
          ? `Tu autoevaluación dio <b>${prom.toFixed(1).replace('.', ',')}</b>. Ajústala si esta oportunidad exige capacidades distintas a las del promedio.`
          : 'No hiciste la autoevaluación en este celular. Estima qué tan preparada está tu organización para esta oportunidad.'}</p>
        <div class="deslizador"><div class="valor" id="val">${b.preparacion.toFixed(1).replace('.', ',')}</div>
          <label class="oculto-visual" for="prep">Preparación de 1 a 5</label>
          <input type="range" id="prep" min="1" max="5" step="0.1" value="${b.preparacion}">
          <div class="escala-extremos"><span>1 · Incipiente</span><span>5 · Consolidada</span></div></div>
        <div class="acciones"><button class="boton secundario" id="ant" type="button">Atrás</button>
          <button class="boton" id="sig" type="button">Ver dónde queda</button></div>`;
      $('#prep').oninput = e => { b.preparacion = +e.target.value; $('#val').textContent = b.preparacion.toFixed(1).replace('.', ','); guardarMis(); };
      $('#ant').onclick = () => ir(2); $('#sig').onclick = () => ir(4);
    }

    else {
      const r = calcular(b), Q = P.cuadrantes[r.cuadrante];
      const x = ((r.preparacion - 1) / 4) * 100, y = ((r.impacto - 1) / 4) * 100;
      escenario.innerHTML = cabecera + `
        <div class="veredicto ${r.cuadrante}"><h3>${esc(Q.nombre)}</h3><p>${esc(Q.consejo)}</p>
          <div class="cifras"><span><b>${r.impacto.toFixed(1).replace('.', ',')}</b>impacto</span><span><b>${r.preparacion.toFixed(1).replace('.', ',')}</b>preparación</span></div></div>
        <p class="eje-y">Impacto en el negocio o la misión ↑</p>
        <div class="mini-matriz" aria-label="Tu oportunidad queda en el cuadrante ${esc(Q.nombre)}">
          <div class="q capacidades">Construir capacidades</div><div class="q priorizar">Priorizar</div>
          <div class="q descartar">Descartar o posponer</div><div class="q rapidas">Victoria rápida</div>
          <span class="punto" style="left:${x}%;bottom:${y}%"></span></div>
        <p class="eje-x">Preparación de la organización →</p>
        <div class="acciones">
          <button class="boton" id="publicar" type="button">${b.publicada ? 'Actualizar en la matriz del grupo' : 'Publicar en la matriz del grupo'}</button>
          <button class="boton secundario" id="ficha-btn" type="button">Descargar mi ficha</button></div>
        <p class="p-ayuda" style="margin-top:1rem">Solo se publica el nombre de la oportunidad y su ubicación. Tus respuestas a las preguntas clave se quedan en tu celular.</p>
        <button class="enlace" id="editar" type="button">Editar mis respuestas</button>`;
      $('#publicar').onclick = async () => {
        try {
          await A.responder(pid, 'matriz', { oportunidad: b.oportunidad.trim().slice(0, 80), impacto: r.impacto, preparacion: r.preparacion, cuadrante: r.cuadrante });
          b.publicada = true; guardarMis(); brindis('Publicada en la matriz del grupo'); vistas.matriz();
        } catch (e) { fallo(e); }
      };
      $('#ficha-btn').onclick = imprimirFicha;
      $('#editar').onclick = () => ir(1);
    }
  };
  function calcular(b) {
    const suma = D.matriz.criterios.reduce((s, c) => s + (b.criterios[c.id] || 0), 0);  // 0 a 10
    const impacto = +(1 + suma * 0.4).toFixed(2);
    const preparacion = +(b.preparacion || 3).toFixed(2);
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

  $('#btn-actividades').onclick = () => {
    $('#lista-act').innerHTML = ACTS.map(a => {
      const hecho = a.id === 'matriz' ? mis.matriz && mis.matriz.publicada : !!mis[a.id];
      return `<li><button type="button" data-ir="${a.id}"><span>${esc(a.nombre)}</span>
        ${a.id === vivo ? '<span class="vivo">En vivo</span>' : hecho ? '<span class="listo">Respondida</span>' : ''}</button></li>`;
    }).join('');
    $('#lista-act').querySelectorAll('[data-ir]').forEach(b => b.onclick = () => { cerrarHojas(); mostrar(b.dataset.ir); window.scrollTo({ top: 0 }); });
    abrirHoja('#hoja-act');
  };
  $('#btn-preguntas').onclick = () => { montarPreguntas($('#panel-preguntas')); abrirHoja('#hoja-preg'); };

  // --------------------------------------------------------- ficha imprimible
  function imprimirFicha() {
    const b = mis.matriz || {}, P = D.matriz, cap = mis.capacidades;
    let html = `<h1>${esc(C.TITULO)}</h1><p>${esc(C.SUBTITULO || '')} · ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>`;
    if (b.oportunidad) {
      const r = calcular(b), Q = P.cuadrantes[r.cuadrante];
      html += `<h2>Oportunidad priorizada</h2><p><b>${esc(b.oportunidad)}</b></p>
        <p>Impacto: ${r.impacto.toFixed(1)} de 5 · Preparación: ${r.preparacion.toFixed(1)} de 5 · Cuadrante: <b>${esc(Q.nombre)}</b>. ${esc(Q.consejo)}</p>
        <h2>Preguntas clave</h2><ol>${P.preguntasClave.map((q, i) => `<li><b>${esc(q)}</b><br>${esc((b.respuestas || {})[i] || 'Sin responder')}</li>`).join('')}</ol>
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
        if (anterior !== null && vivo !== 'espera') brindis('Nueva actividad: ' + nombreDe(vivo));
        mostrar(vivo);
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
