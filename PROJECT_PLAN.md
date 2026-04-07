# Project Plan

## Milestones

### M1 — Scaffolding ✅
- [x] index.html + canvas setup
- [x] Game loop (update/render)
- [x] Player sprite moves around a room

### M2 — Map ✅ (partial)
- [x] House shell fill: wall gaps read as wall material; outer boundary defined
- [x] House layout scaled 1.5x: rooms, connectors, spawns, exit, ghost bounds all updated
- [x] Camera-follow: player centered on screen; world translates around them
- [x] Visual wall system: walls[] array with outer perimeter + interior dividers (visual only)
- [x] Closet/storage spaces: 6 walkable rooms + refinement pass (proper sizing, isolated garage storage, no filler fill)
- [x] Layout shape pass: walk-in snapped, kitchen extended south (irregular footprint), closets flush-left
- [x] Door system: 17 interactive doors, open/close with E, closed doors block movement
- [x] Visibility system: doorway-wedge FOV; offscreen fog canvas; triangle cast from player through open door edges
- [x] Sight range: radial gradient falloff layered on fog canvas; soft fade from 90px to 260px
- [x] Room lights + flashlight: switches per room (E), directional flashlight (F), 40° cone, unlit rooms stay dark
- [x] Tilemap rendering + second map (Gallow's Inn — motel, 11 rooms, medium)
- [x] Collision detection (walkable rect system, wall sliding)
- [x] Room connections: 11 open-gap connectors; house fully traversable
- [x] Multi-room layout: 12-room house (hallway spine, foyer, master suite, living room, garage/laundry, kids wing x3, kitchen/dining)

### M3 — Ghost & Evidence (in progress)
- [x] Ghost position + favorite room: ghost placed in random interior room at round start
- [x] Evidence interaction system: EMF Level 5 / D.O.T.S. Projector / Spirit Box — evidence-gated, favorite-room-weighted
- [x] Tool placement + activation system: placed tools have facing/active state, R toggles; active state preserved on drop; all placed tools have world-visible active visuals; flashlight/UV only reveal fog when held
- [x] Ghost entity (hidden, roaming internally, invisible to player)
- [x] Evidence system: 2 clues per ghost with deliberate overlap — both required to identify
- [x] Player guess / identification UI (1/2/3 key on guess screen)
- [x] Evidence journal UI (J key, shows clues + filtered ghost list)
- [x] Journal visual: aged paper, leather spine, ruled lines, serif handwritten feel
- [x] Journal tabbed: Evidence tracker (3-state cycling + suspect narrowing) + Ghost Guide (notes + evidence per ghost)
- [x] Journal open-book two-page layout: left/right pages with center crease, ghost details on right page
- [x] Journal Options tab: sensitivity slider, full keybind rebinding (9 actions)
- [x] Ghost roster: 24 ghosts, canonical evidence names, The Mimic fake-orb handled in notes only

### M4 — Win/Lose ✅ (partial)
- [x] Result screen shows ghost name after escape
- [x] Escape condition: van keypad (Open Doors → Leave Site); journal ghost guess with ★ selection
- [x] Safe-time window at round start (20s countdown; shows "Danger" when over)
- [x] Ghost flash event after safe time (visual presence, no damage yet)
- [x] Roaming ghost entity (bounces around floor after safe time, non-lethal)
- [x] 360-degree mouse aiming: flashlight and FOV follow mouse cursor
- [x] Player sprite rotates with mouse facing: front highlight + nose dot show direction
- [x] Person sprite + walk animation: top-down figure with animated legs while moving
- [x] Van equipment wall: view-only pegboard with 6 equipment items; van visual pass (top-down)
- [x] Outside night feel: dark overlay + front-door exterior light + conditional roof
- [x] Roof detail pass: 3D exterior wall faces, 4 roof sections, shingles, ridges, valleys, eaves, chimney
- [x] World item drop/place/pickup: G drops in front of player, E picks up, 3-item limit respected
- [ ] Ghost hunt / danger system (ghost chases player — causes lose condition)
- Note: the 90s countdown-to-lose timer has been removed; lose condition will come from ghost danger instead

- [x] 6 environment/weather modes (M key): night, nightrain, sunrise, sunset, bloodmoon, bloodmoonrain
- [x] Directional sunlight through openings: outside wash only; foyer/van get clipped radial spill gated on door state
- [x] Pegboard: 11 items, qty display, empty-slot state, 5 new silhouettes; 3-row layout (4/row), 18 slots, 1260px virtual board
- [x] Gameplay zoom: +/- keys adjust gameZoom (0.8–3.0); zoom% shown in HUD; pegboard unaffected
- [x] Weather leakage fixed: rain outside-only (clip rect); sky tints world-space only; no interior bleed
- [x] Rain on roof/road: clip expands to cover roof when playerOutside; interior always excluded; draw order fixed so rain appears on top of road surface
- [x] Gameplay zoom: ZOOM=1.8 scale on world+fog transform; all screen-space effects adjusted
- [x] ENV visual pass: colored fog, sky glow, directional light, soft-fade roof-reveal circle; random per session

### M5 — Polish
- [ ] Pixel art assets
- [ ] Ambient sound / music
- [ ] Menu screen

## Stack
- HTML5 Canvas
- Vanilla JS
- No build tools (for now)
