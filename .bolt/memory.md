# Project memory

## Product intent & audience

- 3D city delivery game: drive around a realistic daytime city, complete timed delivery orders, earn coins, and climb a leaderboard.
- Target: casual-to-midcore browser players who want quick sessions with progression (vehicle upgrades, unlocks).
- Core loop: Main menu → start shift → drive & deliver orders → end-of-shift summary (score + coins) → garage (spend coins) / leaderboard → new shift.
- User's expanded vision (not yet fully built): open world ~5000 km, 10,000+ buildings, 5+ states/districts, oases, plazas, parking areas; online multiplayer with friends; visible restaurants with signage; route-line delivery tracking.

## Brand personality & voice

- Arabic-language UI and content (user communicates in Arabic).
- Practical and encouraging; celebratory at end-of-shift without being verbose.

## Visual design & UX direction

- Realistic 3D daytime city visuals as the driving backdrop; UI overlays in 2D React/Tailwind.
- Screens built: main menu, driving/HUD, garage, leaderboard, end-of-shift.
- Garage: purchase/select bikes, change bike color, buy upgrades, edit rider name.
- Leaderboard: handles loading, error, and empty states cleanly.
- End-of-shift: shows score and coins, saves to local wallet, allows posting score to leaderboard or starting a new shift.
- Shared screen header component across menu/garage/leaderboard.
- lucide-react icons for UI/logo; Tailwind for styling.
- Delivery tracking: amber beam + restaurant name at pickup; green beam + district name at drop-off; dashed route line from bike to current target, visible through buildings.
- Audio: synthesized engine hum (scales with speed), chimes for pickup/on-time/late/crash/info events; mute button next to pause.
- Restaurants now have physical storefronts: signboard on block, colored awning, two support posts. Orders start from these venues; venue names displayed in 3D scene.

## Decisions, constraints & rationale

- Stack: Vite + React + JSX + Tailwind + lucide-react. No extra UI/icon packages unless explicitly requested.
- Path alias `@/` → `src/` for imports.
- Supabase used for leaderboard storage; leaderboard table migration applied and live.
- Scores submitted client-side → vulnerable to fake submissions. Server-side validation not yet implemented.
- Local wallet persists coins and best score on-device.
- Sound effects synthesized in-browser (no external audio assets).
- Restaurant venues implemented in layout generation; venue sign mesh module added; offer generator updated to source pickups from venues.
- Build + typecheck pass; visual/audio runtime not manually verified by the assistant.
- Massive-scale features (5000 km world, 10,000 buildings, multiplayer) deferred — user asked to "finish the whole project now" but assistant explained these need design decisions first; assistant proposed starting with multiplayer since it changes score persistence.

## Open questions & assumptions

- Should server-side score validation be added to prevent cheating?
- User has not confirmed the look/feel of built screens — visual QA pending.
- Persistence model for garage/upgrades beyond local wallet unclear (server-side vs client-only?).
- Multiplayer design undecided: how players see each other, shared vs instanced city, real-time sync approach — needs user decision before implementation.
- Additional wilayas/states, oases, plazas, parking areas: world expansion roadmap needs planning and user direction.
- User wants project fully finished regardless of size; assistant blocked on large features pending design decisions.