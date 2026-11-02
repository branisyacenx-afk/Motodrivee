# Phase 1 — Foundation audit

Audit date: 2026-11-02
Repository baseline: `main` after merging PR #1.

## Confirmed project structure

- React 18 + TypeScript + Vite application.
- Three.js world is created by `GameWorld` and mounted by `GameScreen`.
- Gameplay modules cover bike motion, collisions, traffic, delivery orders, city layout, and rendering.
- Player profile is stored in browser localStorage.
- Supabase is used for leaderboard access and a realtime rider-position broadcast channel.
- The current realtime channel shares rider poses only; it is not an authoritative multiplayer game server.

## Risks and gaps found during source inspection

1. `index.html` used the Vite favicon, a generic development title, and Bolt default social-preview metadata.
2. Profile reads and writes accessed localStorage without guarding browser storage exceptions. A blocked or full storage area could interrupt app initialization or profile updates.
3. There is no `test` script or visible automated test suite in `package.json`.
4. Supabase client construction originally assumed both Vite environment variables were present. This pass adds an explicit configuration check and keeps single-player bootable without cloud credentials.
5. The world uses a fixed generated city layout and culls some nearby meshes, but does not yet stream world chunks. Large-world streaming remains future work.
6. Client-side wallet and score progression must not be treated as secure for competitive or real-value economies.

## Changes in this phase-1 baseline pass

- Replaced generic page metadata and Vite favicon reference with Swift Drop branding.
- Added a project-owned SVG favicon and corrected social-preview metadata.
- Added `.env.example` documenting the public Supabase environment variables required for cloud features.
- Guarded profile localStorage reads/writes and rejected non-finite numeric values during profile loading.
- Added a Supabase configuration guard. When credentials are absent, the game can run in single-player mode while leaderboard and shared-city features report unavailable.
- Added a GitHub Actions workflow to run TypeScript, ESLint, and production-build checks on pushes and pull requests.

## Verification status

The source changes are committed to the phase-1 development branch. The GitHub integration can read and write files but cannot execute Node.js commands directly. The new CI workflow is intended to run `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run build`. Treat the changes as pending verification until the workflow completes successfully.
