# SOURCES — QUEST(ION)

Official NASA / JPL sources used for the game's educational content. The list comes from `data/content/sources.json` (the game's SOURCES screen reads that same file). Every item in `data/content/*.json` carries its own `source_url`.

Game numbers (budget, mass, energy, points, stars, rocket limits, Signal Run memory in MB) are **simulated values** and are labeled as such on screen.

## List

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

## Signal Run (Screen 16b): what happens to a packet that doesn't arrive

Team decision: it should work like the real mission, and the player should learn this before playing. What the official sources say:

| Fact | Source |
|---|---|
| Mars Odyssey and Mars Global Surveyor relayed most of the rovers' data. | [JPL, Aug 10, 2004](https://www.jpl.nasa.gov/news/relays-from-mars-show-international-interplanetary-networking/) |
| An orbiter received "data previously collected and stored by the rover": data is stored and sent in a later pass. | [JPL, Aug 10, 2004](https://www.jpl.nasa.gov/news/relays-from-mars-show-international-interplanetary-networking/) |
| Spirit had 256 MB of flash memory. | [JPL, Jan 24, 2004](https://www.jpl.nasa.gov/news/spirit-condition-upgraded-as-twin-rover-nears-mars/) |
| Flash keeps information even when power is off; Spirit had to reformat it in February 2004. | [JPL, Feb 5, 2004](https://www.jpl.nasa.gov/news/mars-exploration-rover-mission-status-8/) |
| RAM (128 MB) only holds data while the rover stays awake until its next communication session. | [JPL, 2009](https://www.jpl.nasa.gov/news/team-continues-analyzing-spirit-computer-reboots-and-amnesia-events/) |

**Conclusion used in the game:** there is no time limit in hours. A packet that doesn't arrive stays stored in flash and can be sent again in the same window or in the orbiter's next pass. The real limit is memory space. **Inference (not stated verbatim in the sources):** that a failed packet is "resent"; the sources say stored data is transmitted later, but they don't describe retrying packet by packet.

## Orbit (Screen 12)

Positions and velocities of Earth and Mars: [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) (live with `npm start`, or the saved copy `data/ephemeris_mer.json`). Trajectory: Lambert's problem (H. Curtis, *Orbital Mechanics for Engineering Students*, Algorithm 5.2), Sun's gravity only.

## Signal delay (Screen 16)
- Earth–Mars distance on the day of the play session: NASA/JPL Horizons (same file as the orbit). Minutes = distance / speed of light (299,792.458 km/s; 1 AU = 149,597,870.7 km).

