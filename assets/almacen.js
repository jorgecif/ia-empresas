// Capa de datos. Usa Supabase si está configurado; si no, un modo demo en este navegador.
(function () {
  const C = window.CONFIG || {};

  function idParticipante() {
    let id = null;
    try { id = localStorage.getItem('iae_participante'); } catch (e) {}
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        }));
      try { localStorage.setItem('iae_participante', id); } catch (e) {}
    }
    return id;
  }

  // ------------------------------------------------------------------ Supabase (REST)
  function crearSupabase() {
    const base = C.SUPABASE_URL.replace(/\/+$/, '');
    const key = C.SUPABASE_KEY.trim();
    const headers = { apikey: key, 'Content-Type': 'application/json' };
    // Las claves "anon" heredadas son JWT y van también en Authorization; las "publishable" no.
    if (!key.startsWith('sb_')) headers.Authorization = 'Bearer ' + key;

    async function rpc(fn, args) {
      const r = await fetch(`${base}/rest/v1/rpc/${fn}`, {
        method: 'POST', headers, body: JSON.stringify(args || {})
      });
      const texto = await r.text();
      if (!r.ok) {
        let msg = texto;
        try { msg = JSON.parse(texto).message || texto; } catch (e) {}
        throw new Error(msg || ('Error ' + r.status));
      }
      return texto ? JSON.parse(texto) : null;
    }

    return {
      modo: 'supabase',
      async estado() {
        const r = await fetch(`${base}/rest/v1/estado_sesion?id=eq.1&select=actividad,actualizado`, { headers });
        if (!r.ok) throw new Error('No se pudo leer el estado (' + r.status + ')');
        const filas = await r.json();
        return filas[0] || { actividad: 'espera' };
      },
      unirse: pid => rpc('unirse', { p_participante: pid }),
      responder: (pid, act, datos) => rpc('responder', { p_participante: pid, p_actividad: act, p_datos: datos }),
      async resultados(act) { return (await rpc('resultados', { p_actividad: act }) || []).map(f => f.datos); },
      resumen: () => rpc('resumen'),
      preguntar: (pid, texto) => rpc('preguntar', { p_participante: pid, p_texto: texto }),
      votar: (pid, id) => rpc('votar', { p_participante: pid, p_pregunta: id }),
      async preguntas(pid) { return await rpc('listar_preguntas', { p_participante: pid }) || []; },
      verificarClave: clave => rpc('verificar_clave', { p_clave: clave }),
      cambiarActividad: (clave, act) => rpc('cambiar_actividad', { p_clave: clave, p_actividad: act }),
      marcarPregunta: (clave, id, respondida, oculta) =>
        rpc('marcar_pregunta', { p_clave: clave, p_pregunta: id, p_respondida: respondida, p_oculta: oculta }),
      reiniciar: clave => rpc('reiniciar_sesion', { p_clave: clave })
    };
  }

  // ------------------------------------------------------------------ Modo demo (localStorage)
  function crearDemo() {
    const LLAVE = 'iae_demo';
    const vacio = () => ({ actividad: 'espera', participantes: [], respuestas: {}, preguntas: [], votos: [], sig: 1 });
    const leer = () => { try { return JSON.parse(localStorage.getItem(LLAVE)) || vacio(); } catch (e) { return vacio(); } };
    const guardar = d => localStorage.setItem(LLAVE, JSON.stringify(d));
    const unir = (d, pid) => { if (!d.participantes.includes(pid)) d.participantes.push(pid); };

    function cargarEjemplo() {
      const D = window.DATOS, E = D.ejemplo, d = vacio();
      const azar = (a, b) => a + Math.random() * (b - a);
      const elegir = arr => arr[Math.floor(Math.random() * arr.length)];
      const pesosPulso = ['explorando', 'pilotos', 'pilotos', 'pilotos', 'produccion', 'produccion', 'escalando'];
      for (let i = 0; i < 22; i++) {
        const pid = 'demo-' + i; d.participantes.push(pid);
        const t = Date.now() - (22 - i) * 60000;
        d.respuestas['pulso'] = d.respuestas['pulso'] || {};
        d.respuestas['pulso'][pid] = { datos: { opcion: elegir(pesosPulso) }, t };
        const razon = E.razones[i % E.razones.length];
        d.respuestas['ab'] = d.respuestas['ab'] || {};
        d.respuestas['ab'][pid] = { datos: { opcion: i < 9 ? razon[0] : (i % 5 === 0 ? 'A' : 'B'), razon: i < 9 ? razon[1] : '' }, t };
        const cal = {};
        D.capacidades.items.forEach(it => {
          const sesgo = it.id === 'datos' || it.id === 'medicion' ? -0.8 : it.id === 'liderazgo' ? 0.4 : 0;
          cal[it.id] = Math.max(1, Math.min(5, Math.round(azar(1.5, 4.5) + sesgo)));
        });
        const vals = Object.values(cal), prom = vals.reduce((a, b) => a + b, 0) / vals.length;
        d.respuestas['capacidades'] = d.respuestas['capacidades'] || {};
        d.respuestas['capacidades'][pid] = { datos: { calificaciones: cal, promedio: +prom.toFixed(2) }, t };
        if (i < E.oportunidades.length) {
          const imp = +azar(1.4, 4.8).toFixed(2), prep = +azar(1.3, 4.6).toFixed(2);
          d.respuestas['matriz'] = d.respuestas['matriz'] || {};
          d.respuestas['matriz'][pid] = { datos: { oportunidad: E.oportunidades[i], impacto: imp, preparacion: prep, cuadrante: cuadrante(imp, prep) }, t };
        }
        if (i < E.pasos.length) {
          d.respuestas['paso'] = d.respuestas['paso'] || {};
          d.respuestas['paso'][pid] = { datos: { texto: E.pasos[i] }, t };
        }
      }
      E.preguntas.forEach((q, i) => {
        d.preguntas.push({ id: d.sig++, participante: 'demo-' + i, texto: q, respondida: false, oculta: false, creada: Date.now() - i * 1000 });
        for (let v = 0; v < 4 - i; v++) d.votos.push([d.sig - 1, 'demo-' + (v + 5)]);
      });
      d.actividad = leer().actividad;
      guardar(d);
    }

    return {
      modo: 'demo',
      async estado() { return { actividad: leer().actividad }; },
      async unirse(pid) { const d = leer(); unir(d, pid); guardar(d); },
      async responder(pid, act, datos) {
        const d = leer(); unir(d, pid);
        d.respuestas[act] = d.respuestas[act] || {};
        d.respuestas[act][pid] = { datos, t: Date.now() };
        guardar(d);
      },
      async resultados(act) {
        const r = leer().respuestas[act] || {};
        return Object.values(r).sort((a, b) => a.t - b.t).map(x => x.datos);
      },
      async resumen() {
        const d = leer(), respuestas = {};
        Object.keys(d.respuestas).forEach(k => respuestas[k] = Object.keys(d.respuestas[k]).length);
        return { participantes: d.participantes.length, respuestas,
                 preguntas: d.preguntas.filter(q => !q.oculta && !q.respondida).length };
      },
      async preguntar(pid, texto) {
        const d = leer(); unir(d, pid);
        texto = (texto || '').trim();
        if (texto.length < 3) throw new Error('La pregunta es demasiado corta');
        d.preguntas.push({ id: d.sig++, participante: pid, texto: texto.slice(0, 280), respondida: false, oculta: false, creada: Date.now() });
        guardar(d);
      },
      async votar(pid, id) {
        const d = leer(), i = d.votos.findIndex(v => v[0] === id && v[1] === pid);
        if (i >= 0) d.votos.splice(i, 1); else d.votos.push([id, pid]);
        guardar(d);
      },
      async preguntas(pid) {
        const d = leer();
        return d.preguntas.filter(q => !q.oculta).map(q => ({
          id: q.id, texto: q.texto, respondida: q.respondida, creada: q.creada,
          votos: d.votos.filter(v => v[0] === q.id).length,
          mia: q.participante === pid,
          votada: d.votos.some(v => v[0] === q.id && v[1] === pid)
        })).sort((a, b) => (a.respondida - b.respondida) || (b.votos - a.votos) || (a.creada - b.creada));
      },
      async verificarClave() { return true; },
      async cambiarActividad(_, act) { const d = leer(); d.actividad = act; guardar(d); },
      async marcarPregunta(_, id, respondida, oculta) {
        const d = leer(), q = d.preguntas.find(x => x.id === id);
        if (q) { if (respondida !== null) q.respondida = respondida; if (oculta !== null) q.oculta = oculta; }
        guardar(d);
      },
      async reiniciar() { const d = vacio(); guardar(d); },
      cargarEjemplo
    };
  }

  // ------------------------------------------------------------------ Utilidades compartidas
  function cuadrante(impacto, preparacion) {
    const alto = impacto >= 3, lista = preparacion >= 3;
    if (alto && lista) return 'priorizar';
    if (alto) return 'capacidades';
    if (lista) return 'rapidas';
    return 'descartar';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const configurado = !!(C.SUPABASE_URL && C.SUPABASE_KEY);
  window.ALMACEN = configurado ? crearSupabase() : crearDemo();
  window.UTIL = { idParticipante, cuadrante, esc };
})();
