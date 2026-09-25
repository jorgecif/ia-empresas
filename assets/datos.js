// Contenido de las actividades. Edita los textos aquí: participantes y presentador los leen de este archivo.
window.DATOS = {
  actividades: [
    { id: 'espera',      nombre: 'Sala de espera',        corto: 'Espera' },
    { id: 'pulso',       nombre: 'Punto de partida',      corto: 'Encuesta',     parte: 'Apertura' },
    { id: 'ab',          nombre: '¿Aislada o transformadora?', corto: 'Votación A/B', parte: 'Parte 1' },
    { id: 'capacidades', nombre: 'Autoevaluación',        corto: 'Capacidades',  parte: 'Parte 2' },
    { id: 'matriz',      nombre: 'Prioriza tu oportunidad', corto: 'Ejercicio',  parte: 'Parte 3' },
    { id: 'paso',        nombre: 'Tu siguiente paso',     corto: 'Siguiente paso', parte: 'Cierre' },
    { id: 'preguntas',   nombre: 'Preguntas del público', corto: 'Preguntas' },
    { id: 'fin',         nombre: 'Gracias',               corto: 'Cierre' }
  ],

  pulso: {
    pregunta: '¿En qué punto está tu organización con la IA?',
    opciones: [
      { id: 'explorando', titulo: 'Explorando',    desc: 'Hablamos de IA, pero aún no hay iniciativas en marcha.' },
      { id: 'pilotos',    titulo: 'Pilotos',       desc: 'Probamos herramientas o casos puntuales en algunas áreas.' },
      { id: 'produccion', titulo: 'En producción', desc: 'Al menos una solución de IA opera en un proceso real.' },
      { id: 'escalando',  titulo: 'Escalando',     desc: 'La IA se extiende a varios procesos con metas de negocio.' }
    ]
  },

  ab: {
    pregunta: '¿Aislada o transformadora?',
    contexto: 'Una aseguradora evalúa dos iniciativas de IA. ¿Cuál es transformadora?',
    opciones: [
      { id: 'A', texto: 'Compra licencias de un asistente de IA para que sus empleados redacten correos e informes más rápido.' },
      { id: 'B', texto: 'Usa IA para evaluar reclamaciones de autos a partir de fotos: aprueba las simples en minutos y envía las complejas a un perito.' }
    ],
    porque: '¿Por qué? Tu razón aparecerá en la pantalla, sin tu nombre.'
  },

  capacidades: {
    pregunta: '¿Qué tan preparada está tu organización?',
    ayuda: 'Califica cada capacidad de 1 (incipiente) a 5 (consolidada).',
    items: [
      { id: 'liderazgo', titulo: 'Liderazgo y patrocinio',        desc: 'Directivos que definen prioridades y responden por los resultados.' },
      { id: 'talento',   titulo: 'Talento y alfabetización en IA', desc: 'Equipos que entienden qué puede y qué no puede hacer la IA.' },
      { id: 'cambio',    titulo: 'Adopción y gestión del cambio',  desc: 'Se gestiona la resistencia y se acompaña a las personas.' },
      { id: 'datos',     titulo: 'Datos disponibles y confiables', desc: 'Los datos existen, son de calidad y se pueden usar.' },
      { id: 'procesos',  titulo: 'Procesos y gobernanza',          desc: 'Flujos claros, reglas de uso y responsables definidos.' },
      { id: 'medicion',  titulo: 'Medición del retorno',           desc: 'Los indicadores se definen antes de invertir.' }
    ],
    escala: ['Incipiente', 'Inicial', 'En desarrollo', 'Avanzada', 'Consolidada']
  },

  matriz: {
    pregunta: 'Prioriza una oportunidad de tu organización',
    preguntasClave: [
      '¿Qué problema del negocio o de la misión resuelve y qué indicador va a mover?',
      '¿Toca un proceso central o uno periférico?',
      '¿Tenemos los datos necesarios y son confiables?',
      '¿Quién la patrocina y quién la va a usar en el día a día?',
      '¿Qué tiene que cambiar en roles y procesos para que se adopte?',
      '¿Cuánto cuesta en total y cuál es la prueba más pequeña que nos diría si vale la pena escalar?',
      '¿Qué riesgos legales, reputacionales u operativos introduce?'
    ],
    criterios: [
      { id: 'central',   texto: '¿Toca un proceso central del negocio o de la misión?' },
      { id: 'indicador', texto: '¿Mueve un indicador que le importa a la dirección?' },
      { id: 'flujo',     texto: '¿Se integra al flujo de trabajo, en lugar de quedar como herramienta suelta?' },
      { id: 'escala',    texto: '¿Puede escalar a otras áreas?' },
      { id: 'ventaja',   texto: '¿Construye una ventaja difícil de copiar?' }
    ],
    valores: [ { id: 2, texto: 'Sí' }, { id: 1, texto: 'En parte' }, { id: 0, texto: 'No' } ],
    cuadrantes: {
      priorizar:    { nombre: 'Priorizar',             consejo: 'Invierte ahora, con metas y medición claras desde el inicio.' },
      capacidades:  { nombre: 'Construir capacidades', consejo: 'Vale la pena, pero primero prepara datos, talento o gobernanza antes de escalar.' },
      rapidas:      { nombre: 'Victoria rápida',       consejo: 'Úsala para aprender y generar confianza, sin confundirla con la estrategia.' },
      descartar:    { nombre: 'Descartar o posponer',  consejo: 'Hoy no justifica la inversión. Vuelve a evaluarla cuando cambie el contexto.' }
    }
  },

  paso: {
    pregunta: '¿Qué harás esta semana para avanzar?',
    ayuda: 'Una acción concreta y pequeña. Aparecerá en la pantalla, sin tu nombre.',
    ejemplos: 'Por ejemplo: revisar con mi jefe cuál de nuestras iniciativas de IA mueve un indicador del negocio.'
  },

  // Datos de ejemplo para el modo demo (ensayo sin base de datos)
  ejemplo: {
    oportunidades: [
      'Alertas tempranas de deserción', 'Asistente para trámites consulares', 'Clasificación de tallos por visión',
      'Rutas de última milla', 'Triage de solicitudes de soporte', 'Borradores de propuestas comerciales',
      'Conciliaciones contables automáticas', 'Tutor de inglés con IA', 'Resumen de actas de comité',
      'Pronóstico de demanda de cursos', 'Chatbot de preguntas frecuentes', 'Revisión de contratos',
      'Detección de plagas en cultivo', 'Asistente de código para el equipo', 'Consejería académica con datos'
    ],
    razones: [
      ['B', 'Cambia el proceso central de reclamaciones, no solo una tarea.'],
      ['B', 'Mueve el tiempo de respuesta y el costo por caso.'],
      ['A', 'Si todos lo usan, el ahorro de tiempo es enorme.'],
      ['B', 'Se integra al flujo y escala a otros tipos de siniestros.'],
      ['B', 'Usa datos propios de la aseguradora.'],
      ['A', 'Es más fácil de implementar y ya da resultados.']
    ],
    pasos: [
      'Listar nuestras iniciativas de IA y el indicador que mueve cada una.',
      'Hablar con finanzas sobre el costo total de nuestro piloto.',
      'Revisar la calidad de los datos de deserción con el equipo de analítica.',
      'Proponer un patrocinador para el proyecto de atención al cliente.',
      'Hacer la autoevaluación con mi equipo directivo.',
      'Detener un piloto que no mueve ningún indicador.'
    ],
    preguntas: [
      '¿Cómo calculo el costo total de una iniciativa de IA?',
      '¿Qué pasa si no tenemos datos suficientes?',
      '¿Conviene construir o comprar para una empresa mediana?',
      '¿Cómo se manejan los riesgos de protección de datos en Colombia?'
    ]
  }
};
