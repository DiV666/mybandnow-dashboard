# Guía de Estilo de Comunicación — mybandnow-web

Cuando redactes documentación para este proyecto, sigue esta guía de estilo.

---

## Voz y Tono

**mybandnow-web** es la plataforma colaborativa de videoclips musicales. La documentación de este proyecto:

- Está dirigida a equipos de desarrollo internos.
- Es **técnica y directa**. Sin frases de relleno ni marketing.
- Está escrita en **español**.
- Asume un lector técnico (desarrollador de frontend o arquitecto), pero define los términos no obvios en su primera aparición.

---

## Comunicación Inclusiva

Las comunicaciones deben ser inclusivas.

### Evitar Pronombres de Género
- Usar segunda persona para instrucciones directas (tú/usted/vos).
- Usar referencias en tercera persona no marcada (el usuario, el desarrollador).

### Lenguaje Claro y Accesible
- **Jerga técnica**: usar terminología técnica solo cuando el lector la conoce. Si hay duda, optar por lenguaje claro.

---

## Convenciones de Nomenclatura

### Entidades del Proyecto

Las siguientes entidades del proyecto son sustantivos propios y deben referenciarse con mayúscula inicial:

- **Frontend / SPA** — la aplicación en su conjunto
- **Dominio** — el núcleo de reglas de negocio
- **Componente** — pieza reutilizable de UI en Vue.js
- **Vista (View)** — pantalla enrutada
- **Caso de Uso** — la lógica de orquestación en la capa Application

---

## Construcciones Verbales en la Escritura Técnica

Preferir construcciones verbales (con verbo) sobre nominales (con sustantivo). Las construcciones nominales introducen complejidad innecesaria.

- **Nominal**: "La creación del componente fue satisfactoria."
- **Verbal**: "El componente se creó satisfactoriamente."

---

## Mayúsculas

### Reglas de Mayúsculas en Español

- **Títulos y encabezados**: mayúscula solo en la primera palabra y en nombres propios.
- **Acrónimos**: mantener en mayúsculas (API, JWT, DDD, UI).
- **Lenguajes y estándares**: HTML, CSS, JSON, Vue, TypeScript.

---

## Listas con Viñetas

Las viñetas mejoran la legibilidad, la retención y la organización visual del contenido.

---

## Verbos de Interacción en Documentación de Software

Para documentación de Frontend, usar los verbos correctos según el contexto:

| Acción                  | Verbo recomendado     | Ejemplo                                      |
| ----------------------- | --------------------- | -------------------------------------------- |
| Interactuar con un botón| Hacer clic / Pulsar   | Haz clic en el botón `Guardar`               |
| Navegar a otra ruta     | Ir a / Navegar a      | Navega a la vista de `/dashboard`            |
| Rellenar formulario     | Completar / Introducir| Introduce el correo en el campo `Email`      |
| Ejecutar un comando     | Ejecutar / Correr     | Ejecuta `make unit-tests`                    |

---

## Estructura de Frases en Escritura Técnica

Colocar la acción o el objetivo primero, seguido de los pasos. La regla práctica: «Para qué» precede al «cómo».

> Para arrancar el entorno de desarrollo, abre una terminal y ejecuta el comando `make watch`.

---

## Uso de Advertencias para Información Crítica

En documentación técnica, las advertencias destacan riesgos críticos y guían al usuario para evitar errores graves.

### Niveles de Severidad

- **Nota**: información adicional o buenas prácticas (severidad baja).
- **Advertencia**: problema potencial si no se siguen las instrucciones (severidad media).
- **Peligro**: acción que puede causar consecuencias graves (severidad alta).

Cada advertencia debe describir explícitamente el impacto de ignorarla.
