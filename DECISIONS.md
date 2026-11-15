# DECISIONS — QUEST(ION)

Decisiones que no resuelve el Figma o que cambian lo que dice `PROMPT_CLAUDE_CODE.md`. Fecha: 15 nov 2026.

## Pantalla 11 · Almacén e instrumentos
- **Salida del almacén:** se abre cuando hay al menos un instrumento inspeccionado (pregunta contestada) para **cada uno de los 5 requisitos** (mínimo 5 mesas), no las 14.
- **Pregunta de cada mesa:** si fallas, se muestra la respuesta correcta y la explicación, y reintentas.
- **HUD:** cada instrumento en el kit suma costo y masa y consume energía (valores simulados en `instruments.json`). No se puede pasar del tope de presupuesto.
- **Ensamblaje 11c:** sin límite de tiempo (se quitó el reloj de 45 s del Figma). Se puede arrastrar o hacer clic en la herramienta y luego en el lugar. Z deshace (Stack).

## Pantalla 12 · Órbita
- Reemplaza los sliders del Figma (día / potencia / dirección) por la propuesta del equipo: **fecha de lanzamiento, tiempo de viaje y criterio** (ahorrar combustible / llegar más rápido / equilibrio).
- Cálculo: posiciones y velocidades reales de **JPL Horizons** + **problema de Lambert** → Δv de salida, de llegada y total. Δv no es combustible (se explica en pantalla).
- Datos: en vivo desde `server.mjs` (`/api/horizons`, caché 24 h) y, si no hay servidor (GitHub Pages) o Horizons no contesta, la copia guardada `data/ephemeris_mer.json`. Nunca datos inventados.
- Fechas: 2003–2005 (mismo periodo de MER) para comparar con Spirit y Opportunity.
- Paso 0: el jugador **dibuja su trayectoria** primero; se compara con la calculada.
- Tutorial obligatorio la primera vez. ENGAGE lanza la trayectoria que está en pantalla.
- Valores simulados: límites del cohete (4.5 km/s de salida, 9 km/s total), estrellas y fórmula de "equilibrio".

## Pantalla 13 · Meteoritos
- Es solo diversión: **no penaliza** ni afecta el puntaje de la misión.

## Pantalla 14 · Rock Hunter
- Si se acaba la energía o el tiempo, pasa a resultados con las muestras que tenga.

## Pantallas 15b–15i · Comunicaciones
- Las decisiones (ruta, ventana, prioridad) cambian datos devueltos, energía y puntos.

## Pantalla 16b · Signal Run
- Funciona como en la misión real y se explica **antes de jugar**: un paquete que no llega al orbitador **no se pierde**; queda en la memoria flash del rover y se puede volver a mandar en la misma ventana o en el siguiente paso. **No hay límite de horas: el límite es el espacio en memoria** (256 MB de flash en MER). Fuentes en `SOURCES.md`.

## Puntaje final
- Solo cuenta lo que tendría impacto real en una misión (decisiones de diseño, instrumentos, trayectoria, muestras, datos que llegan a la Tierra). Los minijuegos "por diversión" no cuentan.
