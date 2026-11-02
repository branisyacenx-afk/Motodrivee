# Phase 3: lightweight avenue street lamps

## Changes
- Adds decorative street lamps along selected avenue sidewalks.
- Uses three InstancedMesh batches for poles, arms, and lamp heads, keeping the added geometry to three draw calls.
- Places lamps at regular block intervals and keeps them outside the road surface.
- Lamps are visual only: no collision, traffic, delivery, or real-time light simulation changes.

## Performance and validation
- Instancing avoids creating a separate render object for every lamp.
- Geometry and materials are owned by the city group and released by the existing city disposal traversal.
- TypeScript, ESLint, and production build are checked by pull request CI.
- Visual placement and shadow appearance still require review in the deployed game on a phone.
