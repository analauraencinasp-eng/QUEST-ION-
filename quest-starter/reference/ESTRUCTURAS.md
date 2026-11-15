# Estructuras de datos de Space Mission Adventure

Documento para la rúbrica de la clase: selección, justificación, implementación, algoritmos, complejidad y pruebas.
Todas las estructuras están **escritas a mano** en archivos propios (no usamos bibliotecas de estructuras). Phaser solo dibuja.

## 1. Resumen

| Estructura | Archivo | ¿Lineal? | Dónde se usa en el juego | Operaciones implementadas |
|---|---|---|---|---|
| Pila (Stack) | `Stack.js` | Lineal | Taller: tecla **Z** deshace la última pieza instalada | `push`, `pop`, `peek`, `remove`, `size` |
| Cola (Queue) con nodos enlazados | `Queue.js` | Lineal | Mission Control: frases de la directora en orden. Transmisión: los paquetes salen en orden. También la usa el BFS | `enqueue`, `dequeue`, `peek`, `size` |
| Lista ligada | `LinkedList.js` | Lineal | Reporte: bitácora de descubrimientos | `append`, `prepend`, `find`, `remove`, recorrido |
| **Montículo mínimo (MinHeap)** | `MinHeap.js` | **No lineal (árbol binario completo)** | Júpiter: los eventos se ordenan por el segundo en que ocurren | `push` (sube), `pop` (baja), `peek` |
| **Grafo dirigido + BFS** | `Graph.js` | **No lineal** | HUD: "efecto dominó", porque al instalar una pieza se iluminan las barras afectadas | `addVertex`, `addEdge`, `bfs`, `distance` |
| **Árbol de decisión** | `rules.js` (`ENDING_TREE`, `walkTree`) | **No lineal (árbol binario)** | Final: elige 1 de 5 finales | recorrido raíz → hoja |
| Ordenamiento por inserción | `sorts.js` | Algoritmo | Transmisión: botón "Sort by value" (tecla V) | `insertionSort` |
| Búsqueda lineal | `sorts.js` | Algoritmo | `rules.js`: encontrar un componente por id | `linearSearch` |

La rúbrica pide al menos dos estructuras distintas y una no lineal. Usamos seis estructuras y tres son no lineales (heap, grafo y árbol), además de dos algoritmos.

## 2. Justificación técnica (por qué cada una)

**Pila para "deshacer".** Deshacer siempre quita lo último que hiciste. Eso es exactamente LIFO (el último en entrar es el primero en salir). Con una pila, `pop()` da la pieza correcta en O(1) sin buscar.

**Cola para frases y paquetes.** La directora tiene que decir las frases en el orden en que se escribieron, y los paquetes deben salir de la antena en el orden en que se eligieron. Eso es FIFO. La hicimos con nodos enlazados (`head` y `tail`) para que `dequeue` sea O(1). Con un arreglo y `shift()` sería O(n), porque todos los elementos se recorren un lugar.

**Lista ligada para la bitácora.** La bitácora solo crece al final mientras juegas (`append` en O(1) gracias al puntero `tail`) y se lee una sola vez, en orden, en el reporte. No necesitamos acceso por índice.

**Montículo mínimo para los eventos.** En Júpiter hay eventos programados ("Low battery!" en el segundo 15, paquetes de Waves en los segundos 10, 20 y 30, fin de la pasada en el 45). En cada cuadro el juego solo necesita saber **cuál es el siguiente**. `peek()` lo da en O(1), y meter o sacar un evento cuesta O(log n). Esto es lo que se llama una cola de prioridad.

**Grafo + BFS para el efecto dominó.** Las piezas afectan recursos y unos recursos afectan a otros. Por ejemplo, la propulsión da combustible y el combustible se necesita para proteger Europa (responsabilidad). Un grafo representa esas relaciones como datos (aristas). BFS recorre "por niveles" y nos da a qué distancia está cada barra: a 1 paso se ilumina primero y a 2 pasos después. Si mañana agregamos una relación, solo agregamos una arista, sin tocar el código del HUD.

**Árbol de decisión para los finales.** Los 5 finales dependen de 3 preguntas de sí o no (¿se perdió la nave?, ¿responsabilidad alta?, ¿cuántos objetivos?). Un árbol hace visible la lógica: cada nodo es una pregunta y cada hoja un final. Además, el juego puede **mostrar el camino** que siguió (tecla `?` en la pantalla del final).

**Inserción para ordenar paquetes.** Hay como máximo 9 paquetes. Con n tan pequeño, la inserción es simple, estable (si dos paquetes valen lo mismo, conservan su orden) y en la práctica tan rápida como otros métodos.

## 3. Cómo funcionan las operaciones principales

- **Stack.push / pop:** el tope es el final del arreglo; `push` escribe en `items[count]` y suma 1; `pop` resta 1 y devuelve ese elemento.
- **Queue.enqueue / dequeue:** `enqueue` crea un nodo, lo engancha en `tail.next` y mueve `tail`. `dequeue` toma `head.value` y avanza `head`; si la cola quedó vacía, también pone `tail = null` (caso límite probado).
- **MinHeap.push:** agrega al final del arreglo y **sube** el elemento intercambiándolo con su padre (`(i - 1) >> 1`) mientras sea menor.
- **MinHeap.pop:** guarda la raíz, mueve la última hoja a la raíz y la **baja** intercambiándola con su hijo menor (`2i + 1`, `2i + 2`) hasta que ya no sea mayor que sus hijos.
- **Graph.bfs(inicio):** mete el inicio a una `Queue` y a un conjunto `visited`. Mientras la cola no esté vacía, saca un vértice y mete a la cola los vecinos no visitados con `depth + 1`. El conjunto `visited` evita ciclos infinitos (caso límite probado).
- **walkTree(nodo, hechos):** si el nodo es hoja, devuelve el final; si no, evalúa la pregunta y baja al hijo `yes` o `no`.
- **insertionSort:** para cada elemento, recorre hacia la izquierda los mayores y lo inserta en su hueco.

## 4. Complejidad (Big O)

n = número de elementos; V = vértices; E = aristas; h = altura del árbol; d = número de vecinos de un vértice.

| Estructura u operación | Tiempo | Espacio | Tamaño real en el juego |
|---|---|---|---|
| Stack `push`, `pop`, `peek` | O(1) (`push` amortizado) | O(n) total | ≤ 9 piezas |
| Stack `remove(valor)` | O(n) | O(1) | se usa al quitar con tarjetas |
| Queue `enqueue`, `dequeue`, `peek` | O(1) | O(n) total | ≤ 4 frases, ≤ 4 paquetes |
| LinkedList `append`, `prepend` | O(1) | O(n) total | ~20 entradas |
| LinkedList `find`, `remove`, `toArray` | O(n) | O(1) / O(n) | |
| MinHeap `push`, `pop` | **O(log n)** | O(n) total | ≤ 5 eventos |
| MinHeap `peek` | O(1) | O(1) | se llama cada cuadro |
| Graph `addVertex` | O(1) | O(V + E) total | V = 16, E = 33 |
| Graph `addEdge` | O(d), por la revisión de duplicados | | |
| Graph `bfs` | **O(V + E)** | O(V) (cola + visitados) | se llama al instalar una pieza |
| Árbol `walkTree` | O(h) = O(3) | O(h) por la recursión | 3 preguntas, 5 hojas |
| `insertionSort` | O(n²) peor y promedio, O(n) si ya está casi ordenado | O(n) (trabaja sobre una copia) | ≤ 9 paquetes |
| `linearSearch` | O(n) | O(1) | 9 componentes |

Nota honesta: con tamaños tan pequeños, cualquier estructura correría rápido. Lo que justifica la elección es que **cada estructura expresa la regla del juego**: deshacer = LIFO, enviar en orden = FIFO, siguiente evento = mínimo, efecto dominó = recorrido de grafo y finales = árbol. Además, aguantan si el juego crece (más eventos, más piezas, más relaciones).

## 5. ¿Qué pasaría si la cambiáramos por otra?

| Si cambiamos… | por… | Qué pasaría |
|---|---|---|
| Pila (deshacer) | Cola | Z quitaría la **primera** pieza instalada (los paneles), no la última: el deshacer sería absurdo |
| Cola con nodos | Arreglo con `shift()` | Funciona, pero `dequeue` pasa a O(n) porque todos los elementos se recorren |
| MinHeap (eventos) | Arreglo sin ordenar | Buscar el siguiente evento en cada cuadro costaría O(n) |
| MinHeap | Arreglo ordenado | `peek` sería O(1), pero cada inserción costaría O(n) para mantener el orden |
| Grafo + BFS | Una lista fija "pieza → barras" | Solo vería efectos a 1 paso: se pierde la cadena propulsión → combustible → responsabilidad, y cada relación nueva obliga a cambiar código |
| BFS | DFS | Visitaría lo mismo, pero no daría la distancia mínima, que usamos para iluminar por niveles |
| Árbol de decisión | Cadena de `if/else` | Daría el mismo resultado, pero la lógica deja de ser un dato: no se puede mostrar el camino ni probar cada rama tan fácil |
| Lista ligada (bitácora) | Arreglo | En JavaScript también agrega en O(1) amortizado; aquí la lista sirve para practicar recorrido con punteros |
| Inserción | Merge sort | Pasa a O(n log n) pero usa más memoria y es más largo de programar; con ≤ 9 elementos no se nota |

## 6. Algoritmos que se demuestran (rúbrica)

- **Búsqueda:** `linearSearch` en `rules.js` (componente por id) y `LinkedList.find`.
- **Recorridos:** BFS en `Graph.js` y recorrido raíz → hoja en `walkTree`.
- **Ordenamiento por prioridad:** el MinHeap saca los eventos por tiempo, y `insertionSort` ordena los paquetes por valor.
- **Rutas:** `Graph.distance(a, b)` da el número mínimo de pasos entre dos nodos con BFS.

## 7. Pruebas

Están en `tests.js` y son 19 casos: 9 normales y **10 casos límite**. Se pueden correr de dos formas:
- en el navegador: abre `tests.html` con Live Server;
- en la terminal: `node tests-run.mjs`.

Casos límite incluidos: pila vacía, cola vacía y reusada después de vaciarse, quitar el último nodo de la lista, heap vacío o con claves iguales, BFS desde un vértice que no existe y con ciclos, ordenar una lista vacía o de 1 elemento, que todo el equipo no quepa (1,405 kg contra 1,350), división entre cero en el puntaje de comunicaciones, responsabilidad máxima de 25 y la frontera de 17 puntos para "responsabilidad alta".

Además, `smoke-test.mjs` juega el juego completo con un Phaser simulado (6 recorridos: solo, equipo de 2 y de 4, fallar las pruebas, perder la nave, sin cámara y con accesibilidad) y revisa que no haya errores de JavaScript y que se llegue a los finales esperados.
