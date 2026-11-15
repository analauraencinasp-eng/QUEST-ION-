# PROMPT PARA CLAUDE CODE — QUEST(ION) · NASA Space Apps 2026 (Reto 13)

Eres el desarrollador principal. Construye **QUEST(ION)**, un juego educativo 2D pixel-art **funcional de principio a fin**, en **Phaser 3 + JavaScript (ES modules, sin build)**. Debe correr abriendo `index.html` con Live Server en VS Code y publicarse tal cual en **GitHub Pages**. Tenemos ~12 horas: primero el **flujo completo jugable**, luego pulimos.

---

## 0. REGLA DE ORO (léela antes que todo)

1. **La fuente de verdad del diseño es el Figma**, no el zip ni ningún archivo previo. Cada vez que tengas que decidir algo (layout, textos, colores, orden de pantallas, comportamiento), elige lo que deje el juego **lo más parecido posible al Figma**. El starter kit (`quest-starter/`) solo sirve para ahorrar código; si algo del kit contradice el Figma, gana el Figma.
   - Figma: `https://www.figma.com/design/nlbLxyrJVdi2fWmdPXJGYG/` (fileKey `nlbLxyrJVdi2fWmdPXJGYG`, página "Low-fi screens").
   - Usa el **Figma MCP** para leer cada frame (`get_metadata`, `get_screenshot`, `get_design_context`) y **exportar el arte** (ver §4).
   - Lee **todos los post-its amarillos** del Figma (`Post-it · …`) y los frames `Notes · Screen …` / `Storyboard · Screen 3`: son especificaciones de implementación.
2. **Toda la información educativa (datos, respuestas, preguntas, explicaciones) debe venir de un sitio oficial de NASA/JPL** (`*.nasa.gov`). Cada dato en los JSON lleva `source_url`. Si un dato no tiene fuente oficial verificable, **no lo pongas** (o reescríbelo con algo que sí la tenga). Verifica con WebFetch antes de escribirlo.
3. **Números del juego** (presupuesto, masa, puntos, combustible, tiempos de minijuego, "responsabilidad") son **valores simulados**: se muestran con la etiqueta `SIMULATED GAME VALUE` / "gameplay value".
4. UI, textos y narración **en inglés**.
5. **No uses el logo/insignia de NASA** en ningún sprite ni pantalla. No uses la imagen ni el nombre de astronautas reales con frases inventadas.
6. Usa **estructuras de datos escritas a mano** (requisito de la clase, ver §7).
7. Si una decisión es irreversible o ambigua y no la resuelve el Figma, pregúntanos; si no, decide tú (siempre hacia el Figma) y anótalo en `DECISIONS.md`.

---

## 1. Stack técnico

- **Phaser 3.90** guardado localmente en `vendor/phaser.min.js` (descárgalo de npm: `npm pack phaser@3.90.0` o desde `node_modules/phaser/dist/`). No dependas de un CDN en runtime.
- ES modules nativos (`<script type="module">`), **sin bundler**, **rutas relativas** en todo (GitHub Pages sirve desde `/<repo>/`). Agrega `.nojekyll`.
- Resolución lógica **1280×720** (igual que los frames de Figma), `pixelArt: true`, `Scale.FIT` + `CENTER_BOTH`.
- Fuentes: **Press Start 2P** (títulos/etiquetas) y **VT323** (cuerpo), igual que en Figma. Inclúyelas en `assets/fonts/` (OFL) para que funcionen offline.
- Controles: **mouse + teclado** en todo (flechas/WASD mover, Enter/Espacio acción, E inspeccionar, Esc atrás/menú). Solo computadora.
- Guardado: `localStorage` → ajustes + progreso. Pantalla 1 muestra **CONTINUE** si hay partida; **NEW GAME** la borra (los ajustes se conservan).
- Nada de errores en consola. Si falta un asset, dibuja un placeholder y sigue (patrón de `BootScene.js` del kit).

## 2. Starter kit (`quest-starter/`, ver `REUSE.md`)

- `reuse/ds/*` → Stack, Queue, LinkedList, MinHeap, Graph, sorts: **cópialos tal cual** a `src/ds/`.
- `reuse/core/*` → `index.html` (overlay "click to play" que desbloquea audio/teclado), `BootScene.js`, `a11y.js`, `ui.js` (`freshScene()` obligatorio al inicio de cada `create()`), `state.js`, `game.js`: **adáptalos** (inglés, 1280×720, quitar todo lo de Juno).
- `reuse/tests/*` → 11 tests de estructuras que ya pasan + runner Node/navegador + smoke test con Phaser falso: extiéndelos.
- `reference/*` → solo para leer patrones (taller caminable con proximidad y undo, menú de settings, mapa de planetas, barra de timing, cola de paquetes, reporte con lista ligada, HUD con grafo+BFS, árbol de decisión, generador de .wav). **No copies la lógica de Juno.**
- `assets/sfx/*.wav` y `assets/icons/*.png`: puedes usarlos.

## 3. Estructura del proyecto

```
index.html  .nojekyll  README.md  CREDITS.md  SOURCES.md  DECISIONS.md  ESTRUCTURAS.md
vendor/phaser.min.js
assets/{art,ui,chars,bg,icons,sfx,music,nasa-audio,fonts}/
data/  manifest.json  content/*.json  ephemeris_mer.json
src/main.js  src/state.js  src/save.js  src/router.js  src/audio.js  src/voice.js  src/a11y.js  src/ui/*.js  src/ds/*.js
src/scenes/*.js        (una escena por grupo de pantallas del Figma)
src/minigames/*.js
tools/fetch_ephemeris.mjs  tools/fetch_nasa_audio.mjs  tools/export_figma_assets.md
tests/  (tests.html, tests.js, tests-run.mjs, smoke-test.mjs)
```

## 4. Arte: exporta del Figma con el Figma MCP

- Exporta como PNG (escala 1x y 2x si hace falta nitidez) **los nodos de arte**, no capturas de pantalla completas con texto: personajes (componentes Systems 6:46, Engineer 6:65, Science 7:46, Comms 8:46 y **Mentor alien 30:491**), fondos (sistema solar de pantallas 1/2, Marte/Meridiani, espacio con estrellas, taller VAB, almacén), nave/cohete y sus etapas de armado (Screen 9 base v3 con todas las capas → una capa por componente), iconos de estaciones e instrumentos, rocas, rover MER, planetas (Tierra/Sol/Marte de la Screen 16), botón pixel (componente Pixel Button) y marcos de tarjetas.
- El **texto lo dibuja el juego** (no lo hornees en PNG), para que funcionen narración, tamaño de texto y traducción futura.
- Nombra los archivos `assets/<grupo>/<nombre-kebab>.png` y regístralos en `data/manifest.json`. Documenta en `tools/export_figma_assets.md` qué nodo → qué archivo.
- Replica en código los layouts de cada frame (posiciones, tamaños, colores, bordes de 3–4 px, estilo de tarjetas azules `#1d3a6e`/borde `#5aa0e6`, tarjetas navy con borde dorado `#e69f00`, burbuja de la mentora `#e8eef2` con borde tinta y "MENTOR" en `#a63711`, retrato con fondo `#bfd6e6` y borde blanco). Compara con `get_screenshot` y corrige hasta que se vea igual.
- **Mentora = el alien** del Figma (no "Cristina"/humana). Cumple la nota del equipo: **más grande** cuando guía (retrato grande en briefings/storytelling).

## 5. Flujo completo (sigue el orden del Figma; cada `Screen …` es una pantalla/estado)

Reglas globales (del documento de cambios del equipo):
- **Siempre se puede regresar** (botón ◀ BACK / Esc) a la pantalla anterior, excepto a mitad de un minijuego (ahí: pausa → salir). Implementa la navegación con una **pila de historial** (Stack).
- **Botón de ayuda abajo a la izquierda** en todas las pantallas: abre ayuda contextual de esa pantalla (controles + qué hacer).
- **Panel "MY MISSION"** accesible siempre (tecla M o botón): planeta, objetivo, piezas, instrumentos, órbita, resultados hasta ahora y la bitácora (LinkedList).
- **Menú ☰ arriba a la derecha** (pantalla 1 y en pausa): Settings (§10).
- En el feedback de cada etapa: comparar lo que hizo el jugador con **lo que hizo la misión real** (Spirit & Opportunity).

Flujo (nombres = frames del Figma):
1. **Screen 1 · Title** (+1b Settings): fondo de sistema solar; arriba del START las opciones **1 PLAYER / 4 PLAYERS**; START abajo; ☰ arriba a la derecha. *4 players es solo visual por ahora* (cambia textos y muestra los 4 roles; el juego es el mismo).
2. **Screen 2 · Choose astronaut** (+2b Role info): personajes de la cintura para arriba; bajo cada rol un "info" que abre la descripción del rol; mismo fondo que la 1.
3. **Screen 3 · Story** (slides, ver Storyboard): texto tipo máquina de escribir + voz; NEXT/ENTER avanza, SKIP salta.
4. **Screen 4 · Choose destination** (+4b Planet info): clic en planeta → panel con la pantalla atrás atenuada y botón **DESIGN MISSION**. Solo **Marte** desbloqueado; los demás con candado: "Complete the Mars mission to unlock future destinations."
5. **4c** transición → **Screen 5 · Choose objective** (+5b seleccionado, 5c/5d bloqueados): la mentora pregunta arriba "What is the objective of your mission?"; "OBJECTIVES" centrado y 3 tarjetas. Solo **Hunt for Ancient Water** jugable; los otros: "Complete Hunt for Ancient Water to unlock this objective."
6. **Screen 7 · Mission summary** (gráficos por elemento) → **7b** transición.
7. **Screen 8 · Build briefing** (3 slides): la mentora explica qué hay que saber para armar la nave.
8. **Screen 9 · Workshop** (VAB caminable, 0/5 → 5/5): la nave empieza como esqueleto y **se va armando por capas** según lo que el jugador instala. 5 estaciones **numeradas y en orden** (Structure, Power, Communication, Onboard Computer, Attitude & Thermal): no puedes usar la 2 sin la 1; si te acercas a una bloqueada sale **9b** con para qué sirve ese componente. Al terminar: **9c** mensaje grande "Your spacecraft is assembled!" → **9d** nave armada + camino rosa a la puerta → **9e** (preguntar a la mentora / revisar elecciones) → **9f** transición al almacén.
9. **Screen 10 · Station cards**: al interactuar con una estación se abre la tarjeta del componente con el **nombre del componente** como título, **alternativas A/B/C arriba a la derecha** (B = configuración histórica MER, marcada "MER HISTORICAL"), descripción al centro, imagen a la izquierda, ventajas/limitaciones y valores simulados. **Efecto en la Tierra / responsabilidad**: solo si existe una fuente oficial NASA que lo respalde, explica el efecto (positivo o negativo), por qué, y avisa que sube/baja el **Responsibility level**; si no hay fuente, no inventes efecto.
10. **Screen 11a · Warehouse** (14 mesas de instrumentos, caminable): por mesa → [E] INSPECT → tarjeta (**11** Pancam / **11b** PIXL alternativa real) → mini pregunta de 3 opciones (fuente oficial) → marcar [x]; contador "INSPECTED x/14". Al completar → **11a2** transición → **11c** minijuego de ensamblaje (45 s, arrastrar instrumentos a su lugar; Z = deshacer con Stack) → **11d** resultados (capability / accuracy / compatibility) → **11e** transición "PLAN YOUR ORBIT".
11. **Screen 12 · Orbit** (briefing → tutorial 12b-T1/T2/T3 → juego libre 12b fallo / 12c éxito + comparación de escenarios → 12b-H ayuda): **primero el jugador dibuja con el mouse su trayectoria intento**, luego ajusta con 3 sliders pixel (launch day, burn power, burn direction) y la trayectoria se recalcula en vivo. Tierra y Marte se colocan con **datos reales de JPL Horizons** (§12). Feedback de la mentora explicando el balance (ventana de lanzamiento, combustible, tiempo de viaje), y que es una **trayectoria de transferencia**, no una órbita alrededor de Marte; "más potencia no siempre es mejor". Al final compara con MER (lanzamientos de 2003, ~7 meses, llegada enero 2004).
12. **12.4** transición "time to launch" → **12.5 · Ready for launch** (tarjeta tipo hover sobre fondo atenuado; datos de lanzamiento del post-it con fuente) → **transición de despegue** (§11).
13. **Screen 13 · Meteor minigame** (13 briefing, 13b jugando, 13c impacto con flash rojo a pantalla completa, 13d llegada): cartel "INTERACTIVE GAME — not real" siempre visible. Agrega pantalla de **mission lost / retry** si se acaba el casco.
14. **13e-1.0** transición "HOW THE REAL ROVERS STUDIED ROCKS" → **13e-1.1 … 13e-1.6** una tarjeta por slide (NEXT/BACK, puntos de progreso, WHY IT MATTERS) → **13e-2** pregunta → si falla **13e-3** explicación + pregunta más fácil (tiers 1→2→3, rota en el 3) → **13e** transición "ROCK HUNTER".
15. **Screen 14 · Rock Hunter** (14 briefing, 14b escanear, 14c pista fuerte, 14d no concluyente, 14e resultados): rover con A/D, ESPACIO escanea, E COLLECT / Q SKIP, 3 muestras antes de quedarse sin energía/tiempo.
16. **14f-1.0** transición "WHAT THE REAL ROVERS SENT HOME" → **14f-1.1 … 14f-1.6** descubrimientos → **14f-2 / 14f-3** quiz gate igual al de 13e (mismo código, otros datos).
17. **15b–15i · Communications planner** (monitor CRT): ruta (directo vs orbitador) → ventana de contacto → prioridad de datos → resultados.
18. **16-0** transición "TALKING TO EARTH" → **16-0b** diagrama sin tarjeta → **16** diagrama con tarjeta hover → **16a** Signal Run briefing → **16b** jugando (ESPACIO cuando el marcador entra en la ventana; 3 envíos) → **16c** datos recibidos.
19. **Transición de explosión de estrellitas** (§11) → **Screen 15 · Mission complete dashboard**: llena todos los placeholders `{…}` con el estado real. Las 6 tarjetas de etapa son botones "VIEW DETAILS ▶" → **15-D1 … 15-D6** comparación *You vs real mission* (tabla Aspect / Your decision / Real MER mission / Result MATCH-CLOSE-DIFFERENT, pestañas 1–6, PREV/NEXT/DASHBOARD). Botones RETRY / LOG / CONTINUE; banner UNLOCKED si score ≥ 70.

Si algo en el Figma tiene más detalle que esta lista, **manda el Figma**.

## 6. Estado y datos

- `src/state.js`: un solo objeto de estado (jugadores/rol, planeta, objetivo, componentes por estación con alternativa elegida, instrumentos, respuestas de quizzes, órbita {launchDay, burnPower, burnDirection, drawnPath, travelDays, fuelUsed}, casco, muestras, plan de comms, paquetes enviados, responsibility, puntos por categoría, bitácora). `save.js` serializa a localStorage.
- `data/content/*.json` — **todo el texto y los números viven aquí**, nunca hardcodeados:
  `story.json, roles.json, planets.json, objectives.json, stations.json (A/B/C), instruments.json (14), questions_instruments.json, orbit.json, launch_facts.json, context_rockstudy.json, quiz_rockhunter.json, rocks.json, context_discoveries.json, quiz_discoveries.json, comms.json, mission_comparison.json, help.json, sources.json`.
  Cada item educativo: `{ id, text…, source_url }`; preguntas: `{ id, tier, question, options[3], answer_index, explanation, source_url }`; valores simulados con `"simulated": true`.
- Pantalla **SOURCES** (desde el reporte y desde Settings) que lista todas las fuentes usadas.

## 7. Estructuras de datos (rúbrica de la clase: escritas a mano, justificadas, con pruebas)

| Estructura | Uso en QUEST(ION) |
|---|---|
| **Stack** | historial de navegación (BACK); deshacer en el ensamblaje 11c (Z) |
| **Queue** | líneas de la mentora en orden; paquetes que salen en Signal Run / comms |
| **LinkedList** | bitácora "MY MISSION" (append en O(1), se recorre en el reporte) |
| **MinHeap** | eventos con tiempo: aparición de meteoritos (13b) y eventos de energía/tiempo en Rock Hunter |
| **Graph + BFS** | grafo de pantallas/etapas (desbloqueo y "a cuántos pasos estás") **y** efecto dominó del HUD (componente → recursos afectados) |
| **Árbol de decisión** | rango final del dashboard (`{RANK_TITLE}`) mostrando el camino |
| **insertionSort / linearSearch** | ordenar datos por prioridad en 15h; buscar componentes/instrumentos por id |

Reescribe `ESTRUCTURAS.md` (justificación, Big-O, qué pasaría con otra estructura) y agrega tests (normales + casos límite) para cada uso nuevo. `node tests/tests-run.mjs` debe pasar.

## 8. Audio — siempre igual en cada partida

- **Música**: chiptune 8-bit **generado por código** con WebAudio y **semilla fija** por etapa (title, workshop, orbit, launch, mars, comms, ending). Mismas notas cada vez, loops cortos, con crossfade entre escenas.
- **Sonidos reales de NASA** para momentos clave (cuenta regresiva/despegue, señal/beep de comunicación, ambiente de control de misión): búscalos con la **NASA Image and Video Library** (`https://images-api.nasa.gov/search?q=…&media_type=audio`), descarga con `tools/fetch_nasa_audio.mjs`, recorta clips cortos (ffmpeg) a `assets/nasa-audio/`, y anota título, `nasa_id`, URL y crédito en `CREDITS.md` ("Credit: NASA"). Sin voces de personas identificables si se puede evitar.
- **SFX** de interfaz: los `.wav` del kit + los que generes con el mismo método (`reference/make-art.cjs`).
- Volumen general + música on/off + efectos on/off (Settings).

## 9. Voz de narración — fija

- Web Speech API, `en-US`. Elige la voz de forma **determinista**: lista de preferencia (p. ej. "Google US English", "Microsoft Aria", "Microsoft Jenny", "Samantha") y si no hay, la primera voz `en-US` ordenada por nombre. Guarda `voiceURI` en localStorage y reúsala siempre; `rate` y `pitch` fijos. Espera a `voiceschanged`.
- Lee las líneas de la mentora y el storytelling cuando Narration = ON; escribe siempre en la región aria-live.
- Deja preparado `voice.js` para cambiar a mp3 pregrabados después (si existe `assets/voice/<lineId>.mp3`, úsalo en vez de TTS).

## 10. Accesibilidad (Settings)

Narration ON/OFF · Text size S/M/L (escala todos los textos y reacomoda tarjetas) · Volume · Music ON/OFF · Sound effects ON/OFF · **Reduce motion & flashes** (quita el flash rojo de 13c, sacudidas y partículas fuertes; transiciones se vuelven crossfade). Además: todo operable con teclado, foco visible, nunca información solo por color (íconos/texto ✓ ✕), contraste suficiente.

## 11. Transiciones

- **Barrido pixel/dither** al entrar a cada pantalla "NEXT UP" y entre etapas.
- **Iris/zoom** (círculo que se abre) al entrar a cada minijuego (11c, 12, 13, 14, 16b).
- **Despegue** de 12.5 → 13: sacudida de cámara, humo pixel, el cohete sale de cuadro.
- **Explosión de estrellitas** antes del dashboard 15: estrellas pixel doradas que estallan desde el centro y cubren la pantalla, luego se revela el dashboard.
- Con "Reduce motion": todas pasan a fundido simple.
- Implementa un `TransitionManager` reutilizable (`router.go(sceneKey, {transition})`).

## 12. APIs NASA

- **JPL Horizons API** (`https://ssd-api.jpl.nasa.gov/doc/horizons.html`, endpoint `https://ssd.jpl.nasa.gov/api/horizons.api`) para la órbita: como GitHub Pages es estático y Horizons puede no permitir CORS desde el navegador, crea `tools/fetch_ephemeris.mjs` que pida **vectores heliocéntricos** (`EPHEM_TYPE=VECTORS`, `CENTER='500@10'`) de **Tierra (399) y Marte (499)**, paso diario, de 2003-05-01 a 2004-03-01, y guarde `data/ephemeris_mer.json` (con la URL de consulta y fecha). El juego usa ese JSON; opcionalmente intenta en vivo y si falla usa el JSON. El minijuego interpola posiciones por día de lanzamiento y día de llegada.
- **NASA Image and Video Library** (`images-api.nasa.gov`, sin llave): fotos reales de Spirit/Opportunity para tarjetas de contexto, descubrimientos y reporte (guarda los `nasa_id` y URLs en JSON con fallback local), y los audios de §8. Muestra crédito "NASA/JPL-Caltech" según el registro.
- **api.nasa.gov**: no es obligatorio; si se usa algo que requiera llave, que sea opcional (campo en Settings) y el juego funcione sin ella.

## 13. Contenido educativo: fuentes oficiales

Usa (y lista en `SOURCES.md`):
- MER misión: https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/
- Objetivos científicos: …/science-objectives/ · Descubrimientos: …/science-highlights/ · Instrumentos: …/science-instruments/
- Rover basics: https://science.nasa.gov/planetary-science/programs/mars-exploration/rover-basics/
- Navegación MER (DESCANSO): https://descanso.jpl.nasa.gov/DPSummary/DESCANSO_MER_NAV_051215C_low.pdf
- Telecom MER (DESCANSO cap. 7): https://descanso.jpl.nasa.gov/monograph/series13/DeepCommo_Chapter7--141030.pdf
- Diseño térmico MER: https://tfaws.nasa.gov/TFAWS01/NASA/13Spacecr/jTSUY.PDF
- Alternativas tecnológicas (A/C): NASA Small Spacecraft SoA (structures, power, communications, GNC, avionics, thermal) en https://www.nasa.gov/smallsat-institute/sst-soa/
- Instrumentos alternativos: Curiosity https://science.nasa.gov/mission/msl-curiosity/science-instruments/ · Perseverance https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/
- Space Apps: recurso "Design and Develop Science Missions".

Datos ya verificados por nosotros (puedes usarlos con esa fuente):
- Aterrizajes: Spirit 3 ene 2004, Opportunity 24 ene 2004 (hora EE. UU.), en lados opuestos; Gusev = posible antiguo lago; Meridiani = minerales que sugieren historia húmeda (página MER).
- Spirit terminó en 2010 (7.7 km); Opportunity se comunicó por última vez el 10 jun 2018 durante una tormenta de polvo global; 45.16 km recorridos (página MER).
- Hematita "blueberries" que típicamente se forma en agua; yeso en vetas en Endeavour; arcillas de agua de pH neutro; carbonatos en "Comanche" (Spirit); sílice ~90 % en "Home Plate" descubierta al arrastrar una rueda (marzo 2007) (science-highlights).
- Lanzamientos: Spirit 10 jun 2003; Opportunity 7 jul 2003 hora de Florida (8 jul UTC) desde Cabo Cañaveral (DESCANSO MER Navigation). Crucero estabilizado por giro a 2 rpm (DESCANSO).
- Jarosita → agua ácida (JPL Universe, https://www.jpl.nasa.gov/universe/archive/un0403.pdf).
Todo lo demás que esté en el Figma (p. ej. "90 sols", "~26 meses entre ventanas", "Delta II", "Mars Odyssey como relay", velocidad de escape 11.2 km/s, Max-Q) **verifícalo** contra una página NASA/JPL y guárdalo con `source_url`; si no lo encuentras, quítalo.

## 14. Orden de trabajo (flujo completo primero)

1. Esqueleto: index, vendor Phaser, BootScene+manifest, router con Stack, TransitionManager, state+save, Settings, audio/voz, botón help, panel MY MISSION. Todas las pantallas del §5 **navegables** con layout del Figma y contenido real (minijuegos en versión mínima).
2. Exportar arte con Figma MCP y reemplazar placeholders.
3. Minijuegos completos: taller caminable 9, almacén 11a + quiz, ensamblaje 11c, órbita 12 (dibujo + sliders + Horizons), meteoritos 13, Rock Hunter 14, comms planner 15b–i, Signal Run 16b.
4. Dashboard 15 + 15-D con datos reales del estado; árbol de rango; Sources.
5. Música, NASA audio, transiciones, accesibilidad, reduce motion.
6. Tests + smoke test + revisión visual de cada pantalla contra `get_screenshot` del Figma.
Haz un commit al terminar cada etapa (mensajes claros). Al final de cada etapa avísanos qué se puede probar.

## 15. Definición de terminado

- Una persona juega de Screen 1 al dashboard sin ayuda, puede regresar en cualquier pantalla, consultar su misión y ayuda, y entiende qué eligió y qué hizo la misión real.
- Cero errores en consola en Chrome; `node tests/tests-run.mjs` y `node tests/smoke-test.mjs` pasan.
- Funciona con Live Server y en GitHub Pages (rutas relativas, `.nojekyll`, sin build). README con cómo correr y publicar (Settings → Pages → branch main / root).
- Cada pantalla se ve como su frame del Figma. Cada dato educativo tiene `source_url` oficial. Valores de juego marcados como simulados. Música y voz idénticas en cada partida.
- `CREDITS.md`, `SOURCES.md`, `ESTRUCTURAS.md`, `DECISIONS.md` actualizados.

Empieza leyendo el Figma completo (frames + post-its) y el `REUSE.md` del kit; luego muéstranos en 10 líneas tu plan de escenas y archivos y arranca sin esperar confirmación.
