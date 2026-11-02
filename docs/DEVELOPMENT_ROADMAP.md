# Motodrivee — Development Roadmap

## Product direction

Motodrivee is an Algeria-inspired 3D motorcycle delivery game. The current project is an early playable prototype; this roadmap separates existing foundations from future work and avoids treating planned features as completed.

## Engineering principles

- Preserve the current React, TypeScript, Vite, and Three.js architecture unless profiling or a concrete limitation justifies a change.
- Make incremental, reviewable changes. Do not replace working systems wholesale.
- Keep gameplay responsive on mobile devices; profile CPU, GPU, memory, draw calls, and loading time on real target devices.
- Load the world progressively. Do not attempt to keep a huge open world fully resident in memory.
- Keep authoritative rewards, currency, inventory, and leaderboard validation on trusted server-side code as the game moves beyond prototype scope.
- Document configuration and migrations; never commit secrets or service-role keys.

## Current foundation (verify before changing)

The project has a React/TypeScript front end and a Three.js game world, with prototype systems for motorcycle movement, traffic, delivery orders, garage/progression, local persistence, leaderboard integration, and an early realtime presence experiment. These systems should be inspected and tested before extending them. Local persistence and basic realtime presence are not equivalent to cloud saves or production multiplayer.

## Phased roadmap

### Phase 1 — Stabilize the foundation
- Map the existing application flow, game loop, scene lifecycle, and state ownership.
- Identify performance bottlenecks and mobile input issues.
- Add or improve error handling, loading states, and cleanup for Three.js resources and realtime subscriptions.
- Establish repeatable build, lint, type-check, and test commands.
- Record known limitations and avoid regressions in existing screens and gameplay.

### Phase 2 — Scalable open-world architecture
- Divide the world into streamed chunks with a bounded active radius.
- Add distance-based level of detail, frustum culling, and instancing for repeated props.
- Use deterministic world generation so streamed areas remain consistent.
- Add loading/unloading boundaries and memory budgets.
- Build a small representative test area before expanding the map.

### Phase 3 — Algerian environments
- Create modular environment kits inspired by distinct Algerian regions and architecture.
- Start with one polished district, then expand to additional city and desert environments.
- Add locally grounded road layouts, signage, storefronts, landmarks, and ambient details.
- Treat real-world city likeness as an art direction goal, not a claim of accurate geographic mapping unless verified map data is integrated.

### Phase 4 — Motorcycle handling and delivery gameplay
- Improve acceleration, braking, steering, suspension feel, collisions, and camera response.
- Add distinct motorcycle classes with balanced handling and upgrade trade-offs.
- Expand pickup/drop-off objectives, route choices, delivery ratings, and mission variety.
- Provide accessible mobile controls and configurable sensitivity.

### Phase 5 — Accounts, cloud saves, and secure progression
- Introduce authentication and user profiles.
- Move durable inventory, currency, upgrades, and progression to a trusted persistence layer.
- Validate rewards and leaderboard submissions server-side; do not trust client-provided scores or currency changes.
- Add safe database migrations, row-level security policies, and abuse/rate-limit controls.

### Phase 6 — Multiplayer
- Define the target experience first: friends, public sessions, races, cooperative deliveries, or shared free-roam.
- Treat current realtime position broadcasting as a prototype, not complete multiplayer.
- Add session/lobby lifecycle, identity, reconnect handling, interpolation, latency handling, and abuse controls.
- For competitive or economy-sensitive gameplay, move authoritative simulation and rewards to a dedicated game server rather than trusting clients.

### Phase 7 — Content, operations, and release
- Add mission/content configuration and telemetry with privacy-conscious data collection.
- Test on a representative range of Android devices and browsers.
- Establish crash reporting, performance budgets, backups, and deployment rollback procedures.
- Release in small milestones, starting with a stable single-player vertical slice before scaling world size or player counts.

## Immediate next steps

1. Inspect the current source and package scripts; document what is actually implemented.
2. Run the existing build and type checks and record failures without masking them.
3. Fix lifecycle, input, and stability issues before adding large features.
4. Produce a small, measurable vertical slice: one Algerian-inspired district, one motorcycle, traffic, and a complete delivery loop.
5. Add automated checks for the most important gameplay and data flows.

## Definition of done for each phase

A phase is complete only when its changes build successfully, relevant tests pass, mobile performance is measured on target devices, existing gameplay has been regression-tested, and the implementation and limitations are documented.
