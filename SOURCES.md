# SOURCES — QUEST(ION)

Fuentes oficiales (NASA / JPL) usadas por el contenido educativo del juego. La lista sale de `data/content/sources.json` (la pantalla SOURCES del juego lee ese mismo archivo). Cada dato en `data/content/*.json` lleva su `source_url`.

Los números de juego (presupuesto, masa, energía, puntos, estrellas, límites del cohete, memoria en Mb del Signal Run) son **valores simulados** y se marcan así en pantalla.

## Lista

- [NASA Science · Mars Exploration Rovers: Spirit and Opportunity](https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/)
- [NASA Science · MER Science Objectives](https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/science-objectives/)
- [NASA Science · MER Science Highlights](https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/science-highlights/)
- [NASA Science · MER Science Instruments](https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/science-instruments/)
- [NASA Science · Spirit (MER-A)](https://science.nasa.gov/mission/mer-spirit/)
- [NASA Science · Opportunity (MER-B)](https://science.nasa.gov/mission/mer-opportunity/)
- [JPL News · NASA's 'Spirit' Rises on Its Way to Mars (Delta II)](https://www.jpl.nasa.gov/news/nasas-spirit-rises-on-its-way-to-mars/)
- [NASA · NASA Celebrates Decade of Mars Exploration by Spirit, Opportunity](https://www.nasa.gov/missions/mer/nasa-celebrates-decade-of-mars-exploration-by-spirit-opportunity/)
- [NASA Mars · Mars Exploration Rover Landings (press kit: cruise stage separation)](https://mars.nasa.gov/internal_resources/826/)
- [JPL DESCANSO · Mars Exploration Rover Navigation](https://descanso.jpl.nasa.gov/DPSummary/DESCANSO_MER_NAV_051215C_low.pdf)
- [JPL DESCANSO · Mars Exploration Rover Telecommunications (Ch. 7)](https://descanso.jpl.nasa.gov/monograph/series13/DeepCommo_Chapter7--141030.pdf)
- [JPL Robotics · Autonomous Navigation Results from the Mars Exploration Rovers](https://www-robotics.jpl.nasa.gov/media/documents/MER_ISER2004.pdf)
- [JPL Universe (March 2004) · Water hints on both sides of Mars](https://www.jpl.nasa.gov/universe/archive/un0403.pdf)
- [NASA NTRS · IAC-04 Water on Mars (MER evidence)](https://ntrs.nasa.gov/api/citations/20060005145/downloads/20060005145.pdf)
- [NASA Science · Mars: Facts](https://science.nasa.gov/mars/facts/)
- [NASA Science · Mars Mission Timeline (launch every ~26 months)](https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/)
- [NASA Science · Mars 2020: Perseverance Rover](https://science.nasa.gov/mission/mars-2020-perseverance/)
- [NASA Science · Perseverance Science Instruments](https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/)
- [NASA Science · Curiosity Science Instruments](https://science.nasa.gov/mission/msl-curiosity/science-instruments/)
- [NASA · Mars Science Laboratory CheMin fact sheet](https://www.nasa.gov/wp-content/uploads/2023/01/604996main_chemin_fact_sheet.pdf)
- [NASA STMD · MOXIE (Mars Oxygen In-Situ Resource Utilization Experiment)](https://www.nasa.gov/space-technology-mission-directorate/tdm/mars-oxygen-in-situ-resource-utilization-experiment-moxie/)
- [NASA SCaN · What is the Deep Space Network?](https://www.nasa.gov/directorates/somd/space-communications-navigation-program/what-is-the-deep-space-network/)
- [NASA Science blog · Speaking Percy's Language (3 to 22 minutes one way)](https://science.nasa.gov/blog/speaking-percys-language-how-to-talk-so-perseverance-will-listen/)
- [NASA Imagine the Universe · Black Holes (11.2 km/s to escape Earth)](https://imagine.gsfc.nasa.gov/science/objects/black_holes1.html)
- [NASA Glenn · Beginner's Guide: Dynamic Pressure (Max Q)](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/dynamic-pressure-2/)
- [NASA NTRS · SLS engine-out paper (throttle bucket at Max Q)](https://ntrs.nasa.gov/api/citations/20205004525/downloads/SLS%20Engine%20Out%20Paper.pdf)
- [NASA Small Spacecraft Technology State of the Art (structures, power, comms, GNC, avionics, thermal)](https://www.nasa.gov/smallsat-institute/sst-soa/)
- [JPL Horizons API (Earth & Mars positions used in PLAN YOUR ORBIT)](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [NASA Image and Video Library (audio clips)](https://images.nasa.gov/)
- [JPL News · Relays from Mars Show International Interplanetary Networking (Aug 10, 2004)](https://www.jpl.nasa.gov/news/relays-from-mars-show-international-interplanetary-networking/)
- [JPL News · Spirit Condition Upgraded as Twin Rover Nears Mars (Jan 24, 2004): 256 MB of flash memory](https://www.jpl.nasa.gov/news/spirit-condition-upgraded-as-twin-rover-nears-mars/)
- [JPL News · Mars Exploration Rover Mission Status (Feb 5, 2004): flash keeps data with power off; reformat](https://www.jpl.nasa.gov/news/mars-exploration-rover-mission-status-8/)
- [JPL News · Team Continues Analyzing Spirit Computer Reboots and Amnesia Events (2009): RAM keeps data only while awake](https://www.jpl.nasa.gov/news/team-continues-analyzing-spirit-computer-reboots-and-amnesia-events/)

## Signal Run (pantalla 16b): qué pasa con un paquete que no llega

Decisión del equipo: que funcione como en la misión real y que el jugador lo aprenda antes de jugar. Lo que dicen las fuentes oficiales:

| Hecho | Fuente |
|---|---|
| Mars Odyssey y Mars Global Surveyor retransmitieron la mayoría de los datos de los rovers. | [JPL, 10 ago 2004](https://www.jpl.nasa.gov/news/relays-from-mars-show-international-interplanetary-networking/) |
| Un orbitador recibió "data previously collected and stored by the rover": los datos se guardan y se envían en un paso posterior. | [JPL, 10 ago 2004](https://www.jpl.nasa.gov/news/relays-from-mars-show-international-interplanetary-networking/) |
| Spirit tenía 256 MB de memoria flash. | [JPL, 24 ene 2004](https://www.jpl.nasa.gov/news/spirit-condition-upgraded-as-twin-rover-nears-mars/) |
| La flash conserva la información aunque se apague la energía; Spirit tuvo que reformatearla en febrero de 2004. | [JPL, 5 feb 2004](https://www.jpl.nasa.gov/news/mars-exploration-rover-mission-status-8/) |
| La RAM (128 MB) solo guarda datos mientras el rover sigue despierto hasta su siguiente sesión de comunicación. | [JPL, 2009](https://www.jpl.nasa.gov/news/team-continues-analyzing-spirit-computer-reboots-and-amnesia-events/) |

**Conclusión usada en el juego:** no hay un límite de horas. Un paquete que no llega se queda guardado en la flash y se puede volver a mandar en la misma ventana o en el siguiente paso del orbitador. El límite real es el espacio en memoria. **Inferencia (no textual en las fuentes):** que un paquete fallado se "reenvía"; las fuentes dicen que los datos guardados se transmiten después, no describen el reintento paquete por paquete.

## Órbita (pantalla 12)

Posiciones y velocidades de la Tierra y Marte: [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) (en vivo con `npm start`, o la copia guardada `data/ephemeris_mer.json`). Trayectoria: problema de Lambert (H. Curtis, *Orbital Mechanics for Engineering Students*, algoritmo 5.2), solo gravedad del Sol.
