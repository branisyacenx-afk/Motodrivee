# Phase 3 — Street detail pack

This update adds ten lightweight visual detail batches at selected intersections:

1. Stop bars before selected crossings.
2. Sparse manhole covers.
3. Roadside drainage grates.
4. Pedestrian bollards.
5. Street waste bins.
6. Sidewalk planters.
7. Utility cabinets.
8. Pedestrian signal poles.
9. Reflective lane studs.
10. Raised visual warning tiles.

All details use InstancedMesh batches and are decorative only. They do not add collision, alter road dimensions, affect traffic, change delivery logic, or modify motorcycle physics.

The details are distributed at a sparse interval to limit geometry and draw-call cost. Validate visual placement and mobile performance in the deployed game.
