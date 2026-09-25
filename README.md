# Herramientas interactivas · IA para empresas

Herramientas para la sesión *IA para empresas: dónde invertir y qué priorizar* (Upgrade Sessions #2, Universidad de los Andes). Los participantes responden desde el celular y los resultados aparecen en vivo en la pantalla compartida.

Son dos páginas:

| Página | Para quién | Qué hace |
| --- | --- | --- |
| `index.html` | Participantes | Muestra la actividad que está en vivo, recoge respuestas y deja hacer preguntas. |
| `presentador.html` | Facilitadores | Proyecta los resultados, muestra el QR para entrar y controla qué actividad está en vivo. |

## Actividades y su lugar en la presentación

| Actividad | Diapositiva | Qué ve el participante | Qué se proyecta |
| --- | --- | --- | --- |
| Sala de espera | Portada y agenda | Mensaje de bienvenida | Título, QR grande y número de personas conectadas |
| Punto de partida | 3 · Encuesta | Cuatro opciones | Barras con el porcentaje de cada etapa |
| ¿Aislada o transformadora? | 12 · Votación A/B | Los dos casos y una razón opcional | Barra dividida A/B y las razones del grupo |
| Autoevaluación | 19 · Autoevaluación | Seis capacidades de 1 a 5 y su promedio | Promedio del grupo por capacidad y la más baja |
| Prioriza tu oportunidad | 24 · Ejercicio | Ejercicio guiado en cuatro pasos con resultado en la matriz | Matriz 2×2 con las oportunidades de todo el grupo |
| Tu siguiente paso | 25 · Cierre | Un compromiso para esta semana | Muro con los compromisos |
| Preguntas del público | En cualquier momento | Botón "Preguntar" y votos | Preguntas ordenadas por votos |
| Gracias | 26 · Gracias | Botón para descargar su ficha | QR para volver a entrar |

El ejercicio conecta las tres partes de la sesión: el impacto sale de los cinco criterios de la parte 1 y la preparación sale de la autoevaluación de la parte 2. Al final, cada participante puede descargar una ficha en PDF con su oportunidad, sus respuestas a las siete preguntas clave, su autoevaluación y su siguiente paso.

## Dos modos de funcionamiento

**Modo demo.** Si `assets/config.js` no tiene datos de Supabase, todo funciona sin base de datos, pero solo dentro de un mismo navegador. Sirve para ensayar y para ver cómo se ve cada escena con el botón "Cargar datos de ejemplo". No sirve para la sesión real, porque cada celular guardaría sus respuestas por separado.

**Modo en vivo.** Con Supabase configurado, todos los celulares y la pantalla del presentador comparten los mismos datos. Las pantallas consultan cambios cada 2,5 a 3 segundos.

## Instalación

### 1. Ensayar en modo demo (5 minutos)

Desde la carpeta del proyecto, abre una terminal y ejecuta:

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000/presentador.html` en una pestaña y `http://localhost:8000/` en otra. En el presentador, pulsa "Cargar datos de ejemplo" y recorre las actividades con las flechas del teclado.

### 2. Crear la base de datos en Supabase (10 minutos)

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo (el plan gratuito es suficiente). Elige la región más cercana, por ejemplo São Paulo.
2. En Supabase, ve a **SQL Editor → New query**, pega todo `supabase/esquema.sql` y pulsa **Run**. Debe terminar sin errores. Puedes volver a ejecutarlo sin perder datos: solo actualiza funciones y permisos.
3. En otra consulta, define la clave de los facilitadores con la instrucción que está comentada al final del esquema, cambiando `TU-CLAVE`. No escribas la clave en ningún archivo del repositorio: el repositorio y la página son públicos.
4. Ve a **Project Settings → API** (o al botón **Connect**) y copia:
   - la **Project URL** (por ejemplo `https://abcdefgh.supabase.co`);
   - la clave pública: **anon** (empieza por `eyJ`) o **publishable** (empieza por `sb_publishable_`). Cualquiera de las dos funciona.
5. Pega ambos valores en `assets/config.js`.

Nunca uses la clave `service_role` ni la `secret` en este archivo: quedaría visible para cualquiera.

### 3. Publicar en GitHub Pages (10 minutos)

1. Crea un repositorio público en GitHub, por ejemplo `ia-empresas`.
2. Sube todos los archivos de esta carpeta a la raíz del repositorio (incluido `.nojekyll`).
3. En el repositorio, ve a **Settings → Pages**. En **Build and deployment**, elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`. Guarda.
4. En uno o dos minutos la página quedará en `https://TU-USUARIO.github.io/ia-empresas/`. El presentador estará en `https://TU-USUARIO.github.io/ia-empresas/presentador.html`.

Si la dirección es larga, puedes crear un enlace corto (por ejemplo con bit.ly) y ponerlo en `URL_PARTICIPANTES` dentro de `assets/config.js`. El QR y el texto de la pantalla usarán ese enlace.

### 4. Ensayo general (15 minutos, un día antes)

1. Abre el presentador en el computador desde el que vas a compartir pantalla. La primera vez que cambies de actividad te pedirá la clave del facilitador.
2. Escanea el QR con tu celular y responde todas las actividades.
3. Pide a la otra persona facilitadora que haga lo mismo desde su celular.
4. Al terminar, pulsa **Borrar respuestas** para dejar la sesión limpia.

## Durante la sesión

| Hora | Actividad en vivo | Quién la lleva |
| --- | --- | --- |
| 5:50 p. m. | Sala de espera (compartir pantalla con el QR) | Ambos |
| 6:02 p. m. | Punto de partida | Jorge |
| 6:30 p. m. | ¿Aislada o transformadora? | Jorge |
| 7:10 p. m. | Autoevaluación | Santiago |
| 7:30 p. m. | Prioriza tu oportunidad | Jorge (Santiago lee el chat) |
| 7:50 p. m. | Tu siguiente paso y preguntas | Ambos |
| 8:00 p. m. | Gracias | Ambos |

Atajos en el presentador: **→** y **←** cambian la actividad en vivo, **R** oculta el panel lateral para proyectar solo los resultados y **F** activa la pantalla completa.

Cuando cambias la actividad, los celulares de los participantes cambian solos. Cada persona puede volver a una actividad anterior desde el botón "Actividades", por ejemplo para terminar el ejercicio. Lo que escriben en el ejercicio se guarda en su celular mientras avanzan, así que no se pierde si cambias de actividad.

Una sugerencia práctica: como la sesión es virtual, alterna entre compartir la presentación y compartir la pestaña del presentador. También puedes pegar en el chat el enlace de participación al inicio de cada actividad.

## Personalizar los textos

Todos los textos de las actividades están en `assets/datos.js`: opciones de la encuesta, casos A y B, capacidades, criterios, preguntas clave y consejos de cada cuadrante. Al editarlos, cambian a la vez en los celulares y en la pantalla del presentador. El título y el subtítulo de la sesión están en `assets/config.js`.

Los colores y la tipografía siguen la plantilla de la universidad y están al inicio de `assets/estilos.css`.

## Seguridad y privacidad

- **No se piden nombres ni correos.** Cada celular recibe un identificador aleatorio que solo sirve para no contar dos veces la misma respuesta.
- **Qué se publica en la pantalla:** los porcentajes, las razones de la votación A/B, el nombre de la oportunidad y su ubicación en la matriz, y los siguientes pasos. Las respuestas a las siete preguntas clave nunca salen del celular.
- **La clave del facilitador** se guarda cifrada en la base de datos y se necesita para cambiar la actividad, marcar preguntas y borrar respuestas.
- **Las tablas no se pueden leer ni modificar directamente.** Todo pasa por funciones que validan los datos y limitan su tamaño.
- Cualquier persona con el enlace puede responder. Para una sesión con inscripción previa es suficiente, pero no uses estas herramientas para recoger información sensible.
- Después de la sesión, pulsa **Borrar respuestas** o elimina el proyecto de Supabase si ya no lo necesitas.

## Costos y límites

El plan gratuito de Supabase y GitHub Pages cubre de sobra una sesión de dos horas con unas 25 personas. Según la política actual de Supabase, los proyectos gratuitos se pausan tras una semana sin uso: abre el presentador uno o dos días antes para confirmar que el proyecto está activo, y si está pausado, reactívalo desde el panel de Supabase.

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| El presentador dice "Sin conexión" | La URL o la clave de `config.js` están mal, o el proyecto está pausado | Revisa los dos valores y el estado del proyecto en Supabase |
| "Could not find the function" | El esquema no se ejecutó completo | Vuelve a ejecutar `supabase/esquema.sql` |
| "Clave de facilitador incorrecta" | La clave no coincide con la guardada en Supabase, o aún no se definió | Vuelve a ejecutar en el SQL Editor la instrucción de la clave (al final del esquema) |
| Los cambios en GitHub no aparecen | La página quedó en caché | Espera un par de minutos y recarga con Ctrl+Shift+R |
| Los celulares no cambian de actividad | Estás en modo demo | Configura Supabase: el modo demo solo funciona en un navegador |

## Estructura

```
index.html              Página de participantes
presentador.html        Página de facilitadores
assets/config.js        Conexión con Supabase y títulos
assets/datos.js         Textos de todas las actividades
assets/almacen.js       Acceso a datos (Supabase o modo demo)
assets/participante.js  Lógica del celular
assets/presentador.js   Lógica de la pantalla del presentador
assets/estilos.css      Estilos compartidos
assets/qrcode.js        Generador de QR (Kazuhiko Arase, licencia MIT)
assets/logo-*.png       Logos de la plantilla de la universidad
supabase/esquema.sql    Tablas, funciones y permisos de la base de datos
```

No hay dependencias que instalar ni paso de compilación: son archivos estáticos.
