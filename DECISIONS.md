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

## Música
- Dos pistas locales en `assets/music/`: `ambience.mp3` (todo el juego) y `minigame.mp3` (solo dentro de los minijuegos).
- Cuentan como minijuego **los 8 de `src/minigames`**: Taller, Almacén, Ensamble, Órbita, Meteoritos, Rock Hunter, Comms y Signal Run.
- La ambientación no se reinicia al cambiar de pantalla; al entrar a un minijuego se pausa y luego **sigue donde se quedó**. La música del minijuego empieza desde el inicio cada vez.
- Nunca suenan las dos juntas: primero baja una y luego sube la otra.
- Cuando habla el narrador, la música **baja de volumen** y después regresa.
- Ajustes: Música ON/OFF y **Volumen de música** propio (25 % al empezar). El volumen general queda para la voz y los efectos.

## Pantallas 13e y 14f · Repaso rápido
- Hay que contestar bien para seguir; si fallas, sale la explicación y una pregunta más fácil (niveles 1 → 2 → 3, y en el 3 rotan).
- **No da puntos**: solo se guarda si acertaste a la primera (el puntaje cuenta solo lo que tiene impacto real).

## Pantalla 14 · Rock Hunter (detalles)
- Lo que lees de cada roca depende de los **instrumentos que empacaste** en el almacén: sin el instrumento correcto, la lectura sale "HMM..." (no concluyente).
- Mientras tienes abierta la tarjeta del escaneo, el tiempo se detiene.

## Pantalla 16 · Hablar con la Tierra
- El retraso de la señal (minutos) se calcula con las posiciones **reales** de JPL Horizons del día en que tu rover habla con la Tierra (llegada + 30 días; si no hay órbita, el aterrizaje de Opportunity, 25 ene 2004).
- En Signal Run, los paquetes llevan los datos que tu plan de comunicaciones puso en ese paso.

## Puntaje (ajuste)
- Comunicaciones = la mitad por la calidad de tu plan (15h) y la mitad por los paquetes que llegaron (Signal Run).

## Repaso de aprendizaje (pantallas 17–26 y página "Your review" del reporte)
- Se abre desde el dashboard (botón **REVIEW ▶** o tecla R) y desde la pestaña **R** de las páginas del reporte.
- **El juego elige QUÉ repasar; el jugador elige CÓMO.** El formato nunca cambia los conceptos.
- Categorías: las que ya existen en el puntaje (SCIENCE, ENGINEERING, RESOURCES, EARTH) + la parte de comunicaciones (DATA SENT). No hay categorías nuevas.
- Cada concepto pertenece a una categoría y a una tabla de etapa (15-D): ventana de lanzamiento (RESOURCES · órbita), pistas de agua (SCIENCE · Rock Hunter), instrumentos (SCIENCE · instrumentos), datos a la Tierra (DATA SENT · etapa 6), diseño de la nave (ENGINEERING · etapa 1).
- Bloques de debilidad (0–5) = nivel de la categoría (<50 % → 3, <70 % → 2) + 1 por cada fila ✕ DIFFERENT y +0.5 por ≈ CLOSE. Se repasan los de 2+ bloques (máximo 5; si hay 1–2 se completa hasta 3). Si todo salió bien: conceptos extra que vio y no repasó (Max Q, velocidad de escape, memoria flash).
- Los 5 formatos cubren los mismos conceptos; cambiar de pestaña no reinicia el avance. Todos terminan en la misma revisión de 3 preguntas.
- Después del repaso: −1 bloque por concepto repasado y −2 si acertó su pregunta de la revisión.
- El repaso **no cambia el puntaje** de la misión.

