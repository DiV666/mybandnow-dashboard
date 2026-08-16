# Historial de Cambios

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

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
