# Phase 3 — Street markings

## Zebra crossings

The city renderer now adds zebra crossings at alternating intersections in both street directions. The markings are built as two instanced meshes, keeping the addition to two draw calls rather than creating thousands of separate mesh objects.

The crossings are placed just beyond the road edge and use a small vertical offset to avoid z-fighting with the road surface. They are part of the shared static road layer, so they remain visible while building/tree chunks stream in and out.

## Scope

- No changes to driving physics, traffic paths, collision boxes, delivery logic, or chunk streaming.
- Crossings are intentionally placed at alternating intersections to balance visual density and mobile GPU cost.
- This is a stylized road-marking pass, not a full traffic-signaling implementation.

## Validation

- CI: TypeScript, ESLint, production build.
- Mobile visual check: confirm markings sit on the road, are not hidden by road texture, and do not distract while riding.
- Check intersections in both X and Z directions and inspect from low camera angles.
