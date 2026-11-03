# Phase 3: Rooftop Water Tanks

Selected medium and tall buildings now receive compact rooftop water tanks, a familiar detail in many Algerian urban neighborhoods.

- Tank bodies and lids are rendered with two InstancedMesh batches per city chunk.
- Placement is deterministic from the existing building seed and stays within each roof footprint.
- Tanks are visual-only: no collision, traffic, delivery, interaction, or bike-physics changes.
- The feature is limited to buildings at least 24 units tall to keep rooftops readable and avoid clutter.
