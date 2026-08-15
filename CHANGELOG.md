# Historial de Cambios

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

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
