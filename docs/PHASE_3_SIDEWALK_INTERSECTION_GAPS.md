# Sidewalk curb intersection gaps

## Problem
Continuous sidewalk curb strips crossed perpendicular streets at intersections, making the curb edges appear as raised barriers inside the roadway.

## Fix
- Split east-west curb runs into block-length segments and leave each north-south road's full width open.
- Split north-south curb runs in the same way at east-west roads.
- Keep the existing curb profile, material, height, and sidewalk offset.
- Keep the change visual-only; no changes to road width, collision, traffic, delivery logic, or bike physics.

## Performance
- Uses one InstancedMesh for the complete curb network.
- The instance capacity is sized for all horizontal and vertical block segments.

## Validation
TypeScript, lint, and production build run in pull request CI. Intersection appearance and driving feel should be checked in the deployed mobile game.
