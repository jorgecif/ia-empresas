// Configuración de las herramientas.
// Si SUPABASE_URL o SUPABASE_KEY están vacíos, todo funciona en "modo demo":
// los datos se guardan solo en este navegador, útil para ensayar.
window.CONFIG = {
  // En Supabase: Project Settings > API (o "Connect"). Ejemplo: "https://abcdefgh.supabase.co"
  SUPABASE_URL: "",
  // La clave pública: "anon" (empieza por eyJ...) o "publishable" (empieza por sb_publishable_...).
  // Nunca pongas aquí la clave "service_role" ni la "secret".
  SUPABASE_KEY: "",

  TITULO: "IA para empresas: dónde invertir y qué priorizar",
  SUBTITULO: "Upgrade Sessions #2 · Universidad de los Andes",

  // Dirección que verán los participantes en el QR. Si la dejas vacía se calcula sola.
  URL_PARTICIPANTES: "",

  // Cada cuántos milisegundos se consultan cambios.
  INTERVALO_ESTADO: 2500,
  INTERVALO_RESULTADOS: 3000
};
