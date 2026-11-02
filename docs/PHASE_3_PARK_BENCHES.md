# Phase 3: lightweight park benches

## Changes
- Adds two small decorative benches to each generated park.
- Uses three InstancedMesh batches for wooden seats, backrests, and metal legs.
- Bench placement is derived from park rectangles and does not alter park layout or pedestrian routes.
- No collision, traffic, delivery, or bike physics changes.

## Performance and validation
- Instancing batches repeated furniture geometry into three draw calls.
- TypeScript, ESLint, and production build are checked by pull request CI.
- Bench placement and shadows still require visual review in the deployed game.
