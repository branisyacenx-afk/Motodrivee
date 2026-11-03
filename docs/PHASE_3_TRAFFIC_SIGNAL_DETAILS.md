# Phase 3: intersection traffic signal details

## Changes
- Adds compact three-aspect traffic signal assemblies at a deterministic subset of city intersections.
- Uses five InstancedMesh batches for poles, housings, and red/amber/green lenses.
- Keeps the signal assemblies on sidewalk corners and limits their density to every fourth grid intersection.
- Signals are visual decoration only; they do not change traffic AI, right-of-way, collisions, delivery logic, or bike physics.

## Performance and validation
- Instancing keeps the added signal geometry to five draw calls for the city.
- The objects are owned by the city root and released by the existing city disposal traversal.
- TypeScript, ESLint, and production build are checked by pull request CI.
- Final visual placement and readability still need a play-test in the deployed game on a phone.
