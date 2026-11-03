# Phase 3 — Building facade detail pack

Adds ten lightweight facade-detail categories to eligible generated buildings:

1. Ground-floor entrance door panels
2. Entrance canopies
3. Door lintel / sign bands
4. Window sills
5. Slim window sunshades
6. Vertical facade pilasters
7. Split ground-floor plinth sections that leave the doorway clear
8. Entrance-level corner accents
9. Horizontal floor-band trim
10. Additional upper floor-band trim on taller buildings

Implementation:
- Deterministic selection based on each building's existing seed.
- InstancedMesh batches grouped by detail category within each streamed city chunk.
- Decorative only: no collision, navigation, traffic, delivery, or motorcycle-physics changes.
- Mobile visual appearance and performance require in-game validation.
