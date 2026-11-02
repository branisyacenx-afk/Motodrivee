# Phase 2 — Mobile performance and world scalability

## First implementation slice

The renderer now selects conservative GPU settings for touch-first devices:
- Device pixel ratio is capped at 1.25 on coarse-pointer devices and 1.75 elsewhere.
- Directional shadow map resolution is 1024 on touch-first devices and 2048 elsewhere.
- Gameplay simulation, vehicle physics, traffic, collision rules, and delivery rewards are unchanged.

These are initial device-class defaults, not measured performance guarantees. Validate on representative Android phones and tune using frame-time measurements.

## Performance validation checklist

- Test on a low/mid-range Android phone and a newer Android phone.
- Compare frame pacing while stationary, driving through traffic, and near dense building blocks.
- Check visual shadow quality, text/HUD clarity, heat, battery drain, and browser stability.
- Keep a record of device model, browser, average FPS, 1% low FPS, and approximate session duration.

## Progressive city geometry slice

- Static building/tree geometry is now created one spatial chunk per rendered frame instead of building every chunk synchronously during world construction.
- Pending chunks are prioritized by distance whenever the rider enters a new chunk, so nearby geometry is generated first.
- Roads, ground, layout records, collision boxes, traffic lanes, and delivery data remain available up front; this slice reduces the initial geometry-build burst but is not yet full memory-bounded streaming.
- Distant generated chunks are hidden by the active-radius culling already in place. Geometry unloading/disposal and active collision-region indexing remain future work and must be implemented with explicit memory/lifecycle tests.

## Open-world architecture plan

1. Separate world generation into deterministic spatial chunks with stable chunk coordinates and seeds.
2. Keep a bounded active radius around the player; load nearby chunks and unload distant chunks.
3. Maintain a small overlap ring during transitions to avoid visible gaps.
4. Keep collision queries limited to active chunks instead of scanning every building in the full world.
5. Add LOD tiers and instancing for repeated props after profiling identifies expensive draw calls.
6. Stream district metadata and delivery points separately from render meshes so mission generation remains stable.

Do not increase the world dimensions until chunk loading, unloading, collision bounds, and memory limits are tested in a small prototype area.


## Bounded city geometry residency

- Building/tree geometry is retained only within a 900-world-unit unload boundary around the rider; the 630-world-unit active radius controls visibility, leaving a hysteresis band to avoid rapid unload/rebuild while moving near the edge.
- Chunks beyond the unload boundary are removed from the scene and their owned geometries/materials are disposed. Their lightweight layout records remain available so the geometry can be rebuilt when the rider returns.
- At most one nearby chunk is rebuilt per rendered frame, ordered by distance. This avoids a single large rebuild burst after entering a new area.
- The shared window texture is owned by the city root and is never disposed when an individual chunk unloads. It is disposed once when the full GameWorld is disposed. Road strip textures are cloned per mesh; the source texture is released after the clones are created, and clone textures are released with the city.
- This bounds resident building/tree render geometry, not all world memory: layout/collision/traffic/venue records and the full road/ground layer are still retained. Full procedural world streaming and collision-region indexing remain future work.

### Validation still required on devices

- Traverse far enough to cross multiple chunk boundaries, then return to an unloaded area and confirm buildings/trees rebuild without missing blocks.
- Check for visual popping at the 630-unit visibility and 900-unit unload boundaries.
- Repeat game sessions and watch memory/GPU stability; confirm no WebGL warnings or crashes.
- Compare mobile frame pacing during initial nearby chunk construction and after several unload/rebuild cycles.
