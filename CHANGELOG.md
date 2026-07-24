# Historial de Cambios

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

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
