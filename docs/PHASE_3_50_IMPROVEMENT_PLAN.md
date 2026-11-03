# Urban-life expansion — 50-step delivery plan

This roadmap groups the next 50 improvements into five safe batches. Each batch must pass CI and be visually checked before the next gameplay-sensitive changes are merged.

## A. Shopfronts and street commerce (1–10)
1. Shop side framing posts
2. Menu boards
3. Fascia trim
4. Warm shop lamps
5. Entrance planters
6. Waste bins
7. Foot rails
8. Display stands
9. Entrance mats
10. Shopfront framing accents

The current PR implements these as ten instanced shopfront detail categories.

## B. Residential architecture (11–20)
11. More varied window layouts
12. Ground-floor shop shutters
13. Balcony privacy screens
14. Facade color variation by district
15. Corner facade treatments
16. Roof parapets
17. Stairwell roof structures
18. External AC pipe details
19. Ground-floor entrance lighting
20. Building number plaques

## C. Public realm (21–30)
21. Bus stop route panels
22. Public benches variation
23. Drinking fountains
24. Public litter bins
25. Sidewalk tree guards
26. Street name plates
27. Pedestrian crossing signals
28. Tactile paving at crossings
29. Park path lights
30. Plaza seating clusters

## D. Vehicles and pedestrians (31–40)
31. Additional car silhouettes
32. More vehicle paint palettes
33. Vehicle wheel detail
34. Brake-light readability
35. Scooter/motorcycle traffic variety
36. Pedestrian clothing variation
37. Pedestrian walk-cycle polish
38. Better sidewalk spacing
39. Safer crossing behavior
40. Traffic density tuning

## E. Gameplay, audio, interface and performance (41–50)
41. Delivery pickup feedback
42. Delivery completion effects
43. Order difficulty tiers
44. District-based delivery bonuses
45. Improved minimap/route clarity
46. Better touch-control feedback
47. Audio mix and engine layers
48. Chunk build budget tuning
49. Geometry/material disposal audit
50. Mobile stress-test and regression checklist

## Release policy
- Keep each batch small enough to isolate regressions.
- Use instancing for repeated static decoration.
- Do not merge a batch until TypeScript, ESLint, and production build pass.
- Visual placement, controls, and mobile performance still require in-game testing.
- Multiplayer, persistence, and authoritative economy remain separate engineering projects; this list does not claim to implement them.
