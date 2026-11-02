# Phase 3: curbside parking bay markings

## Changes
- Adds marked curbside parking bays to selected horizontal streets.
- Uses one `THREE.InstancedMesh` for all bay markings to keep draw calls low.
- Keeps the markings decorative only: no changes to traffic, collision, road layout, delivery logic, or chunk streaming.

## Validation
- TypeScript, ESLint, and production build are checked by the pull request CI.
- Visual appearance should be reviewed in the deployed game on a phone after merge.
