# Phase 3 — Algiers-inspired district identity

## First visual slice

The generated city now assigns its six Algiers-inspired district labels to contiguous west-to-east bands instead of alternating the district name block by block. Each band uses a restrained building-facade palette:

- Bab El Oued: warm coastal plaster
- Hussein Dey: neutral urban tones
- Kouba: limestone and sand
- El Harrach: earthy tones
- Bir Mourad Rais: pale stone and sage
- Hydra: light stone and muted green

This is a visual identity pass over the existing procedural grid, not a geographically accurate reconstruction of Algiers. Road layout, collision, traffic, chunk coordinates, and renderer streaming behavior are unchanged.

## Validation

- Run the repository CI checks: TypeScript, ESLint, and production build.
- In the game, ride across several district bands and confirm the facade palette changes are visible but not overly saturated.
- Verify delivery pickup/dropoff district names remain consistent with the new contiguous layout.
- Revisit chunks after unloading to confirm their generated palette remains deterministic.

## Next visual work

Replace the generic grid with recognizable Algerian street details: sidewalks and curbs, crosswalks, local storefronts, Arabic/French signage, street furniture, palms and region-specific vegetation. Add recognizable landmarks only after the district-scale layout and performance budget are validated.
