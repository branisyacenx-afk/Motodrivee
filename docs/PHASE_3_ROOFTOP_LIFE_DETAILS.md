# Phase 3 — Rooftop life details

Adds ten sparse decorative details to selected residential rooftops:

1. Solar panels / water-heating panels
2. Satellite dishes
3. Television antennas
4. Air-conditioning condenser units
5. Ventilation stacks
6. Small skylights
7. Roof-access rooms
8. Rainwater pipe outlets
9. Clothesline posts
10. Short rooftop safety-rail sections

Implementation notes:
- Details are grouped into at most ten InstancedMesh batches per streamed building chunk.
- Only eligible buildings are considered; deterministic building seeds keep placement stable.
- No collision, traffic, delivery, or motorcycle-physics changes.
- Visual placement and mobile performance still require in-game validation.
