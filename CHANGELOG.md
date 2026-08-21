# Historial de Cambios

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

## [0.7.11] - 2026-08-21

### Añadido

- El scroll horizontal de la regla del timeline y de cada carril de pista ahora está sincronizado: al desplazar cualquiera de ellos, los demás se mueven a la misma posición.

## [0.7.10] - 2026-08-21

### Corregido

- El contenido del editor de pistas desaparecía al subir el zoom: el ancho fijo del timeline zoomado hacía que el área principal saltara a una línea por debajo del sidebar (fuera de la pantalla visible) porque `flex-basis: auto` no ignora el contenido al decidir el salto de línea, aunque `min-width: 0` ya estuviera presente.

## [0.7.9] - 2026-08-20

### Añadido

- Requisitos del vídeo (códec, duración, tamaño, iluminación y fondo verde) en la modal de subida, debajo del selector de fichero.

## [0.7.8] - 2026-08-20

### Añadido

- Placeholder ("Guitarra solista") en el campo de título de pista al añadir un instrumento a una canción.

### Corregido

- La forma de onda de las pistas en el editor no se veía bien en el tema claro (blanco fijo sobre fondo claro); ahora usa un gris fijo según el tema activo en vez del color del texto de la pista, para no heredar el color rojo de selección.

## [0.7.7] - 2026-08-20

### Corregido

- Las modales de "Crear canción" y previsualización de vídeo en el listado de canciones dibujaban dos backdrops superpuestos (uno propio y el compartido de `isAnyModalOpen`), viéndose mucho más oscuras que el resto.
- Las modales de "Agregar miembro" y "Eliminar miembro" en el listado de miembros no tenían ningún backdrop.

## [0.7.6] - 2026-08-20

### Corregido

- El contenido principal del dashboard (canciones, miembros, videoclips...) se quedaba en blanco: el ancho fijo del sidebar hacía que el área principal saltara a una línea por debajo del sidebar, fuera de la pantalla visible, en vez de encogerse junto a él.

## [0.7.5] - 2026-08-20

### Corregido

- El menú lateral del dashboard usaba columnas de Bootstrap con ancho porcentual, por lo que se reducía o crecía continuamente al redimensionar la ventana; ahora tiene un ancho fijo (300px) a partir del breakpoint `md`.
- Los backdrops de "Completa tu perfil", "Backend no disponible" y "Crear banda" tenían cada uno una opacidad distinta a la del resto de modales (p. ej. "Añadir instrumento"); ahora usan todos la misma opacidad estándar.

## [0.7.4] - 2026-08-19

### Corregido

- Las canciones cuya duración del videoclip original no se guardó en el backend perdían por completo la pista de referencia de audio de YouTube. Ahora solo se exige la URL del vídeo; la duración real se obtiene del propio reproductor de YouTube (`getDuration()`) en cuanto está listo.

## [0.7.3] - 2026-08-19

### Corregido

- El registro de estado del reproductor de YouTube usaba `console.debug`, que Chrome oculta por defecto (nivel "Verbose"); ahora usa `console.log`.
- Se registran los dos retornos silenciosos restantes al configurar el audio de referencia de YouTube (elemento contenedor aún no montado, petición obsoleta por un remount).

## [0.7.2] - 2026-08-19

### Corregido

- El orden de las pistas de instrumentos en el editor de pistas podía cambiar entre visitas porque dependía del orden crudo devuelto por el backend; ahora se ordenan por fecha de creación, igual que en el listado de canciones.
- Se captura el rechazo de `play()` en las pistas y en la vista previa cuando el navegador pausa un elemento silenciado en segundo plano para ahorrar batería, evitando el error `AbortError` sin capturar en consola.

### Añadido

- Registro en consola de los cambios de estado del reproductor de YouTube (`onStateChange`), ya que `playVideo()` no informa de bloqueos de reproducción de ninguna otra forma.

## [0.7.1] - 2026-08-19

### Corregido

- El fallo al cargar el reproductor de YouTube del audio de referencia (bloqueadores de anuncios/contenido, red, restricciones de inserción) ya no se silenciaba: ahora se registra en consola y se muestra un aviso en el editor de pistas.

## [0.7.0] - 2026-08-19

### Añadido

- Opción "Eliminar miembro" en un menú de tres puntos en cada tarjeta del listado de miembros de la banda (oculto en la fila del admin), con modal de confirmación que avisa de que los instrumentos que el músico tuviera asignados en canciones de la banda pasarán al creador de la banda.

## [0.6.4] - 2026-08-19

### Corregido

- El listado de instrumentos volvía vacío porque el `limit` se enviaba como query param plano; el backend solo lo acepta dentro del parámetro `criteria` (JSON), lo que hacía fallar la petición silenciosamente.

## [0.6.3] - 2026-08-19

### Corregido

- El selector de instrumentos del formulario de creación de instrumento de canción ahora se ordena alfabéticamente.
- La petición del catálogo de instrumentos (`GET /v1/instruments`) ahora incluye `limit=100` para evitar que la paginación por defecto del backend oculte instrumentos.

## [0.6.2] - 2026-08-19

### Corregido

- Eliminado el sufijo redundante "(Songs / Tracks)" del título de la vista de gestión de canciones, ya innecesario con las traducciones.

## [0.6.1] - 2026-08-19

### Corregido

- Al fallar el `PUT` del vídeo a la URL firmada de almacenamiento (p. ej. por CORS), el intento de subida ya no se queda huérfano en estado `PENDING`: se cancela automáticamente en el backend.
- El error genérico "No se pudo iniciar la subida del vídeo" se sustituye por un mensaje específico cuando el fallo es de red/CORS.
- El toast de error al iniciar la subida ya no se duplica con el aviso que muestra la propia modal.

### Cambiado

- El icono de error en el listado de instrumentos ahora solo aparece cuando el backend marca la subida como fallida (`FAILED`), no ante fallos locales de red.
- Colores de las píldoras de estado de subida: "Pendiente de validación" usa el color primario y "Procesando" usa naranja (antes al revés), legibles tanto en modo claro como oscuro.
- La barra de progreso de la modal de subida ahora llega al 100% y se cierra justo tras confirmar la subida, en vez de cerrarse a mitad de proceso.
- Añadido un indicador de actividad (spinner) junto a las píldoras "Pendiente de validación" y "Procesando".

## [0.6.0] - 2026-08-17

### Añadido

- Nuevo flujo de subida de vídeo de instrumento en 3 pasos con URL firmada (`POST .../upload` → `PUT` directo a la URL firmada → `POST .../upload/{uploadId}/confirm`), en sustitución del antiguo `POST` con `multipart/form-data`.
- Acción "Cancelar subida" en la modal de subida de vídeo, disponible en paralelo al botón de subir/reintentar mientras el `SongInstrumentUpload` está en estado `PENDING`.
- Reintento automático del `confirm` cuando el listado empieza a hacer polling de un instrumento con un upload `PENDING`, para cubrir el caso de que un refresco de página interrumpiera el flujo entre el `PUT` del vídeo y el `confirm`.
- Tooltip en el listado de instrumentos con la traducción del `errorCode` que devuelve el backend cuando la validación asíncrona del vídeo falla (códec no soportado, duración excedida, formato inválido, archivo no encontrado, fallo de procesado genérico).

### Cambiado

- El mensaje de error de subida ya no se muestra como texto fijo bajo los botones de acción del listado de instrumentos; ahora aparece únicamente en el tooltip del icono de error junto al badge de estado.
- La modal de subida de vídeo resetea su estado (progreso, archivo seleccionado, error) al abrirse o cerrarse, en vez de arrastrar el estado de un intento anterior.

## [0.5.0] - 2026-08-17

### Añadido

- Modal de creación de banda (`CreateBandModal`), que reemplaza el formulario inline de la pantalla "aún no tienes banda" y es accesible también desde un icono "+" en el header (selector de bandas y menú offcanvas móvil).
- Contador de canciones y de miembros junto a los enlaces "Canciones" y "Miembros" del sidebar del dashboard.
- Logotipo (`/logo.png`) a la izquierda del título "My Band Now" en las cabeceras pública y del dashboard.

### Cambiado

- El texto de marca de las cabeceras pasa a ser "My Band Now" en todos los idiomas (antes "Mybandnow" / "Mybandnow Admin").
- El texto de los toasts ya no usa la clase `small` de Bootstrap, para mejorar la legibilidad.
- Favicon movido de `favicon.svg` a `favicon.ico`.

### Eliminado

- Botón "Omitir por ahora" de la pantalla de creación de la primera banda.

## [0.4.1] - 2026-08-17

### Arreglado

- Tercer test de `SongTrackEditorView.test.ts` (`mutes only the selected track audio player...`) con el mismo problema de dependencia del reloj real que ya se había corregido en otros dos tests del mismo archivo — se nos había quedado uno sin el fix. Este era el que bloqueaba el job `test` del pipeline y, con ello, el despliegue.

## [0.4.0] - 2026-08-17

### Añadido

- `VITE_API_BASE_URL` inyectada en el build de CI desde una repository variable de GitHub Actions, para que el build de producción apunte a `https://api.mybandnow.com/api` en vez del fallback de `localhost:3000/api`.

## [0.3.4] - 2026-08-16

### Cambiado

- Despliegue de Firebase Hosting movido del proyecto `my-band-now-5792c` al proyecto `my-band-now` (el proyecto de Google Cloud ya existente donde vive la API que se desplegará en Cloud Run), para no duplicar proyectos GCP para la misma app. La URL de producción pasa a ser `https://my-band-now.web.app`.

## [0.3.3] - 2026-08-16

### Arreglado

- Dos tests de `SongTrackEditorView.test.ts` (`soloes one track...` y `keeps the preview area passive...`) dependían del `Date.now()` real para comprobar el `currentTime` de los reproductores justo tras iniciar la reproducción, con un margen de pocos milisegundos. En runners de CI más lentos ese margen se agotaba y el test fallaba de forma intermitente. Se añade `vi.useFakeTimers()`/`vi.useRealTimers()`, igual que ya hacían el resto de tests de este archivo con el mismo patrón.

## [0.3.2] - 2026-08-16

### Arreglado

- Locale de test fijado a `es-ES` en `vitest.environment.ts`: el idioma por defecto de `vue-i18n` se resolvía con `navigator.language`, que en Node hereda el locale del sistema operativo. En los runners de GitHub Actions ese locale es inglés, así que 73 tests que comprobaban textos en español fallaban solo en CI.

## [0.3.1] - 2026-08-15

### Arreglado

- `package-lock.json` regenerado contra `registry.npmjs.org`: algunas dependencias quedaban resueltas contra un proxy Nexus privado local, lo que rompía `npm ci` en GitHub Actions con un error 401.
- Build de producción (`vue-tsc -b`) restaurado: se elimina la opción `baseUrl` obsoleta en `tsconfig.app.json` y se corrigen los errores de tipos que quedaban ocultos detrás de ese fallo de configuración (variables/imports sin usar, eventos de puntero y refs de plantilla en `SongTrackEditorView.vue`).
- Clases `btn-lg` sobrantes en `LandingView.vue`, que rompían el contrato de estilos verificado por `style.test.ts`.

## [0.3.0] - 2026-08-15

### Añadido

- Workflow de GitHub Actions para ejecutar los tests y desplegar automáticamente en Firebase Hosting.

## [0.2.0] - 2026-08-15

### Añadido

- Botón "Generar Videoclip" en el listado de canciones para solicitar la generación asíncrona del videoclip de una canción.
- Rediseño de la página de inicio con una sección hero más realista y efecto glassmorphism.
- Vista previa del vídeo de un instrumento en una modal en lugar de abrirse en una pestaña nueva.
- Entidad `Instrument` en el dominio para nivelar el bounded context de instrumentos.
- Manejador global de errores de Vue como red de seguridad ante fallos no controlados.
- Cobertura completa de `vue-i18n` en toda la aplicación, incluyendo trampa de foco, enlaces de salto y retorno de foco en layouts y modales para accesibilidad.
- Alternancia de mostrar/ocultar contraseña en el formulario de login.
- Bandera e idioma completo en el selector de idioma del cabecero.
- Pie de página fijo en el layout público y layout responsive del dashboard con sidebar offcanvas.

### Cambiado

- `SongsView.vue` descompuesta en composables independientes (catálogo de instrumentos, nombres de músicos, creación de canción, vista previa de vídeo, alta de instrumento, detalle de instrumento, subida de instrumento, asignación de músico e invitación, edición de instrumento).
- Modal de asignación de músico reordenada: el listado de miembros de la banda pasa a primer plano y la invitación por email queda debajo, con el botón "Invitar" deshabilitado hasta introducir un email válido.
- Introducción de una raíz de composición (`composition root`) para repositorios y casos de uso, y de la jerarquía `DomainError`/`ValidationError` en el dominio.
- Extracción de `hasResponseStatus` como helper HTTP compartido entre repositorios de infraestructura.
- Menú móvil del dashboard reconstruido como secciones desplegables planas y dropdown nativo de Bootstrap que ya no bloquea la navegación del sidebar.

### Arreglado

- Fugas de mensajes de error en crudo hacia el usuario (por ejemplo en la carga de canciones), sustituidos por mensajes traducidos y seguros en todos los flujos afectados.
- Doble invocación de `Toast.hide()` al cerrar una notificación, causa raíz de un error intermitente al destruir el toast de Bootstrap.
- Condición de carrera al destruir el tooltip de Bootstrap durante su animación.
- Aviso de obsolescencia de Vue Router migrando la guardia `beforeEach` de `next()` a `return`.
- Error de compilación de `vue-i18n` al no escapar el carácter `@` en el placeholder de email del login.
- Comentario engañoso sobre validación de UUID en `BandId` y dependencia innecesaria de `atob()` en `AuthToken`.
- Fallos de contraste WCAG AA en textos de warning, success y danger.
- Semántica de accesibilidad de `SessionClosedView`.
- Cierre del modal de subida tras aceptar la solicitud de procesado del vídeo.

## [0.1.0] - 2026-07-24

### Añadido

- Editor de pistas sincronizadas por canción con reproducción compartida, timeline interactivo y navegación desde el listado de canciones.
- Controles de monitorización por pista con mute y solo sin romper la sincronía global.
- Persistencia del zoom del timeline por canción con ajuste inicial automático al ancho disponible.
- Resumen superior del editor con contexto de pistas, zoom y duración del vídeo original cuando está disponible.

### Cambiado

- Vista previa de vídeo restaurada como monitor pasivo, sin controles nativos y sin recorte de vídeos verticales.
- Marcadores del timeline adaptativos según duración y zoom para mantener la legibilidad en canciones largas.
- Indicadores visuales y resaltado de pista activa refinados para una lectura más clara del editor.

### Arreglado

- Sincronización de audio estabilizada evitando resincronizaciones agresivas que generaban clics periódicos durante la reproducción.
- Desbordes residuales del timeline corregidos para que el modo fit no deje scroll horizontal espurio.
- `startTimeMs` alineado con el endpoint dedicado de vídeo y limitado por la duración del videoclip original cuando ese dato existe.
