# Session Log

## 2026-04-21 — Session 190
- Fixed hunt chase behavior with explicit state machine (`_huntState`):
  - **Root cause**: No separation between chase/search states. Ghost at 85% player speed during "search" felt like full chase. Noise (200px) and electronics (150px) continuously leaked player's room to ghost even after LOS broke. No intermediate "move to last seen position" phase.
  - **New state machine**: `"chase"` → `"lastSeen"` → `"search"`
    - **chase**: has LOS, beeline in same room, BFS cross-room. Speed = `huntSpeedLOS` (1.1x+) with 20% acceleration ramp.
    - **lastSeen**: lost LOS, BFS to last known room, then to exact last known XY. Speed = `huntSpeedBase` (0.85x). Transitions to search when reaching last seen position.
    - **search**: random wander in room, expand to neighbors after 3 points. Speed = `huntSpeedBase * 0.55` (0.47x). Noticeably slower than player.
  - **State transitions**: LOS acquired → chase. LOS lost → lastSeen. Reached last seen pos → search. Noise/electronics in search → lastSeen (redirected, not full chase). Smudge confusion → search.
  - **Last seen position**: `_huntLastKnownX/Y` only updated during chase (LOS active). Noise/electronics update room only, NOT exact position.
  - **Revenant**: speed now uses `_huntState !== "chase"` instead of `huntLostSightTimer > 0`.
  - **Debug HUD**: shows State (CHASE/LASTSEEN/SEARCH), LOS yes/no, lost sight timer, detect source, last seen room + coords, search count.
  - **Debug overlay**: orange X marker at last seen position, room box labeled with hunt state.
  - **Debug dump**: now includes `state`, `detectSrc`, `lastKnownPos`.
- All gameplay tests pass

## 2026-04-21 — Session 189
- Fixed environment-based sanity detection (lit vs dark):
  - **Root cause**: `_roomAtPoint()` returned `null` when player stood in doorway connector rects (separate from room rects). Sanity code treated `null` as "safe (outside)" → zero drain in doorways regardless of lighting.
  - **Fix**: Replaced `_roomAtPoint()` with doorway-aware `_ghostRoom()` for sanity detection. When player is in a doorway, resolves to the nearest overlapping room (same algorithm ghost system already used).
  - **Single source of truth**: New detection block runs every frame (not gated by safeTimeOver/ghostHunting), writes `_sanTrk.roomLabel`, `_sanTrk.roomLit`, `_sanTrk.inDark`, `_sanTrk.isOutside`, `_sanTrk.powerOn`.
  - **Passive drain** and **sprint drain** both read from `_sanTrk` instead of doing their own `_roomAtPoint` lookups.
  - **HUD Environment section** redesigned with 5 diagnostic rows: Room (label), Room Light (On/Off), Power (On/Off), Env Status (Lit/Dark/Safe), Darkness Drain (rate or Off).
  - **Flashlight does NOT count** as room lighting for sanity — only room light switches + breaker power.
  - **Outside detection**: `playerOutside` (y > 720) plus Yard room label both gate the outside-safe check.
- All gameplay tests pass

## 2026-04-21 — Session 188
- Added difficulty rules to sanity system and HUD:
  - **Difficulty presets corrected**: `sanityDrainSpeed` 100/150/200/200/200 → 85/100/115/130/145 (Amateur→Insanity)
  - **Insanity startingSanity**: 75 → 100 (matches baseline)
  - **Multiplier moved**: `_diffSanityDrainMult` removed from `drainSanity()` (instant hits); now applied to 3 continuous drain sites: passive darkness, ghost sighting, sprint
  - **HUD Difficulty section** (replaces old Modifiers section in expanded breakdown):
    - Difficulty name with colored star rating (1–5 stars, green→red)
    - Drain Multiplier (e.g. "x0.85" for Amateur)
    - Setup Protection countdown or "None"
    - Hunt Protection "On"/"Off" based on `safeTimeOver`
  - Setup phase (300/120/0/0/0s) and hunt protection gating already correct — no changes needed
- All gameplay tests pass

## 2026-04-21 — Session 187
- Aligned sanity system to exact baseline rules and redesigned HUD:
  - **Constants changed**:
    - `SANITY_DRAIN_DARK`: 0.06 → 0.12%/s
    - `SANITY_DRAIN_LIT`: 0.02 → 0.00%/s (no drain in lit rooms)
    - Sprint drain: 0.06 → 0.08%/s
  - **Instant hits changed**:
    - Ghost event: 3 → 5%, Spirit Box: 1.5 → 3%, EMF5: 1 → 2%, Ghost writing: 2 → 3%
    - Ouija question: 2 → 5%, Ouija break: 4 → 10%
  - **Removed**: hunt passive drain (was 0.6%/s) — hunts no longer drain sanity per baseline
  - **Sanity Meds default**: 40 → 35% (Amateur difficulty preset also updated)
  - **Status thresholds** match baseline exactly:
    - Stable (net >= -0.01), Draining Slowly (-0.01 to -0.15), Draining (-0.15 to -0.30), Draining Fast (< -0.30), Recovering (> 0)
  - **Expanded breakdown** redesigned with exact baseline categories:
    - Environment: Darkness On/Off, Base Drain, Power Off Multiplier (when active), Effective Drain
    - Movement: Sprinting On/Off with rate
    - Ghost: Ghost Nearby / Phantom Stare (continuous sight drain), or Ghost Effects Off
    - Recovery: Sanity Meds On/Off (shows recent use)
    - Modifiers: Difficulty multiplier (only when ≠ 1.0)
    - Recent: last 3 instant hits with friendly names from lookup table, 5s fade
  - Recent hit decay reduced from 6s to 5s
  - Friendly name mapping for all 20 instant hit sources
  - Rate display now shows "%/s" suffix for clarity
  - Ghost-specific abilities (Banshee, Wraith, Jinn, Moroi, Poltergeist, Onryo) unchanged in code but show with friendly names in Recent section
- All gameplay tests pass

## 2026-04-21 — Session 186
- Redesigned sanity HUD for readability and friendlier UX:
  - **Main pill** (always visible, 136×42px): wider layout with 3 clear rows:
    - Row 1: "SANITY" label + large percentage (15px bold)
    - Row 2: rounded bar with tick marks at 25/50/75%
    - Row 3: human-readable status ("Stable" / "Draining" / "Draining Fast" / "Recovering") + numeric rate
  - **Expanded breakdown** (click pill to toggle): grouped into labeled sections with headers + separator lines:
    - **Environment**: Darkness / Room Lights / Safe Zone + Power Off Penalty (when active)
    - **Movement**: Sprinting in Dark
    - **Ghost**: Ghost Nearby / Phantom Stare + Hunt Drain
    - **Modifiers**: Difficulty multiplier (only shown when ≠ 1.0)
    - **Recent**: last 3 instant hits with title-cased names, signed amounts, 6s fade
  - Each row shows On/Off state clearly — active rows in bright warm text with red/green values, inactive rows in dark muted gray with "Off" label
  - Status word is color-coded: red (draining fast), amber (draining), green (recovering), gray (stable)
  - Panel width matches pill width (136px) for visual alignment
  - All information preserved from previous version, just reorganized and renamed
- All gameplay tests pass

## 2026-04-21 — Session 185
- Expanded sanity HUD with live breakdown panel showing every real sanity factor:
  - **Tracking system**: `_sanTrk` object records continuous drain rates per frame and instant hits with 6s decay
  - `_sanTrkReset()` called at top of each `update()` frame — zeros continuous rates, ages/prunes recent hits
  - `_sanTrkHit(source, amount)` records instant events with sign (+/-)
  - **Instrumented 4 continuous drain paths**: passive room drain (line 5394), ghost sighting (line 5092), hunt drain (line 5987), sprint in dark (line 7387)
  - **Instrumented `drainSanity()`** (line 1001) to auto-record all instant hits — covers 20 event sources
  - **Instrumented 3 gain paths**: sanity meds (line 2909), tarot fate +25 (line 19232), tarot saint +50 (line 19277)
  - **Breakdown panel** (click sanity pill to toggle):
    - NET RATE line: color-coded sum of all continuous drains
    - Active factors: each with label, source detail, rate in %/s
    - Power off multiplier (shown only when ≠ 1.0)
    - Difficulty multiplier for instant hits (shown only when ≠ 1.0)
    - Inactive factors collapsed into one gray line
    - RECENT HITS section: last 3 instant events with source + amount, fading over 6s
  - Panel is 170px wide, dark background, compact 11px line height
  - Click the sanity pill (top-left) to expand/collapse
- All gameplay tests pass

## 2026-04-21 — Session 184
- Added dedicated sanity HUD panel — top-left, below difficulty badge at position (8, 46)
  - Dark semi-transparent rounded pill background (98×28px)
  - "SANITY" label (7px bold monospace, muted color)
  - Large percentage readout (13px bold, right-aligned within pill)
  - Horizontal bar meter (88×4px) with tick marks at 25/50/75%
  - Three color tiers: green (>60%), amber (31-60%), red (≤30%)
  - Low-sanity effects: flickering alpha (dual sine waves at /180 and /67), brief red flash on percentage text (80ms every 600ms), glowing bar tip with 6px shadow blur
  - Hidden during death animation and post-death phase
  - Reads live `playerSanity` value — no duplicate state
- Replaced old comment "(Sanity bar, temp badge, and noise bar removed)" with updated note
- No old in-game sanity display existed to remove — the van's sanity monitor panel is separate and unchanged
- All gameplay tests pass

## 2026-04-21 — Session 183
- Fixed journal not working during post-death ghost phase:
  - **Root cause**: `DEBUG_GHOST_BEHAVIOR` block (line 2703) intercepted J/j key for `_triggerForceEvent()` and returned early, preventing the journal toggle at line 2807 from ever firing. Debug mode is always on (`true`).
  - **Fix**: added `_postDeathPhase === 0` guard to the debug key block so it's skipped during post-death, letting J reach the journal handler
- Enabled ghost movement during post-death phase:
  - Desktop keyboard movement: `_postDeathPhase === 1` now allowed in the movement gate (line 7192), speed reduced to 55% for floaty feel
  - Mobile joystick movement: same gate change (line 7201), same 55% speed multiplier
  - Normal room collision still applies (canMoveTo has no death gate)
  - Spectral rendering already existed (flickering transparent blue sprite)
- **Inputs during dead ghost phase**:
  - Allowed: WASD/arrow movement (55% speed), journal toggle (J), journal ghost guess, Escape to close journal, mobile joystick
  - Blocked: flashlight, inventory cycle, item drop, item use, interact/E, Escape→lobby, sprint (no effect at 55%), all debug hotkeys (ghost cycling, force hunt, etc.)
- All gameplay tests pass

## 2026-04-21 — Session 182
- Removed death message text from kill animation blackout phase:
  - Stripped "ELIMINATED" header (`#cc2020`, bold 28px) and "the ghost got you" subtext (`#884040`, 13px) from the blackout phase (2.6–3.2s of death animation)
  - Black fade remains — just no text on it
- Journal already works during post-death (toggle at line 2808 runs before the `_postDeathPhase > 0` guard at line 2810; timer tick already in main loop from Session 181)
- Ghost phase overlay already has no text (stripped in Session 181) — only quiet dark vignette
- No other death message screens exist in the codebase
- All gameplay tests pass

## 2026-04-21 — Session 181
- Refined post-death flow for subtlety and cinematic feel:
  - **Bug fix**: journal froze the post-death timer — `_postDeathTimer` tick was inside `update()` which is skipped when `journalOpen` is true; moved tick to main `loop()` function so it runs regardless of journal state
  - **Removed all death text**: stripped "YOU DIED" header, countdown timer bar, "Open journal [J] to identify the ghost" hint, "Xs remaining" countdown from ghost phase overlay; only quiet dark vignette with subtle blue wash remains
  - **Cinematic extraction loading screen**: replaced generic fade-to-black with a styled transition matching the load-in aesthetic:
    - Background: `#030206` with purple-red vignette
    - "PHANTOM RESPONSE UNIT" header in `#4a2030`
    - "Leaving site" main text in `#c0a8a0` (Georgia font + red shadow)
    - "Returning to base..." with animated dots in `rgba(160,120,120,0.75)`
    - Maroon progress bar (`#6a3040`) — visually distinct from load-in's difficulty color bar
    - Fade in/out alpha matching load-in pattern
  - Loading duration increased from 2.0s to 2.5s for better pacing
- All gameplay tests pass

## 2026-04-21 — Session 180
- Added post-death ghost phase: after the 3.2s death animation, player respawns at exact death location as a spectral ghost for 5 seconds before transitioning to lobby
- **Flow**: alive → death animation (3.2s) → ghost spectral phase (5s) → loading transition (2s) → pre-game lobby with results
- **Ghost spectral phase** (5s):
  - Player rendered as pale/transparent with spectral blue tint, soft flickering (desaturated + brightness 1.6 + sepia + hue-rotate 200°)
  - Player is immobile — keyboard, mobile joystick, interactions all blocked
  - Journal/notebook access works — player can open journal and pick ghost guess during this window
  - Dark vignette overlay with "YOU DIED" header, countdown bar, and journal hint text
  - Ghost guess made during this window is preserved for round results/XP calculation
  - No hunts can start (huntCooldown forced to 999), no re-kill possible (postDeathPhase guard on kill check)
- **Loading transition** (2s): fade to black with subtle static bars and pulsing "Loading..." text
- After loading completes, `_endRound(true)` runs with the player's final ghost guess
- State variables: `_postDeathPhase` (0=none, 1=ghost, 2=loading), `_postDeathTimer` (countdown), `_deathPosX/_deathPosY` (death location)
- Input blocking: post-death guard on flashlight, inventory, drop, use, interact, Escape→showTitle; only journal toggle and journal Escape close pass through
- All gameplay tests pass

## 2026-04-21 — Session 179
- Fixed ghost hunt doorway crossing to use centered approach/cross/exit path
  - **Root causes**: (1) ghost approached doorways at steep diagonal angles from off-axis room centers — axis-separated collision fallback slid it along the door frame edge instead of steering center, (2) exit point was computed toward dest room center creating a diagonal exit vector, (3) no crossing-axis awareness so horizontal vs vertical passages were treated identically
  - **Fix**: new `_computeCrossingPoints(dw, fromRoom, toRoom)` helper determines crossing axis (vertical vs horizontal based on room positions), then computes 3 aligned points:
    - `ax, ay` — approach point: 14px into FROM room, aligned with doorway center on the perpendicular axis (ghost lines up before entering)
    - `cx, cy` — crossing center: doorway rect center (unchanged)
    - `ex, ey` — exit point: 14px into TO room, aligned with doorway center (straight-through exit)
  - Approach phase now targets `ax, ay` (alignment) instead of `cx, cy` (doorway center)
  - Collision bypass margin expanded by 4px around doorway rect during crossing for smoother room→doorway boundary transition
  - Applied to both warning and active hunt crossing paths
  - Debug overlay: orange approach dot, yellow center dot, green exit dot, dashed line tracks current phase target
- All gameplay tests pass

## 2026-04-21 — Session 178
- Replaced the plain death sequence with a cinematic 5-phase jumpscare kill animation (3.2s total):
  - **IMPACT** (0–0.15s): White flash + red surge, violent camera shake (35+px)
  - **LUNGE** (0.15–0.85s): Ghost sprite scales 2x→11x toward camera, darkening backdrop, static bars begin, vignette closes in
  - **FACE** (0.85–1.8s): South-facing ghost face dominates screen at 10x–15x with wobble, heavy horror filter (desaturated/sepia/contrast 1.9), red vignette tightens, persistent static overlay
  - **COLLAPSE** (1.8–2.6s): Ghost dissolves into static, near-total darkness, dense static bars
  - **BLACKOUT** (2.6–3.2s): Solid black, "ELIMINATED" text fades in, transitions to results
- 3 random animation variants: (0) direct lunge — smooth scale-up, (1) flicker-rush — ghost rapidly appears/disappears while growing, (2) static-collapse — heavy static with ghost emerging from noise
- Phase-based camera shake: violent during IMPACT, sustained decay through LUNGE/FACE, gentle fade through COLLAPSE
- New `sndDeathJumpscare()` layered audio: impact thud + static burst at t=0, shriek layers at 80ms/260ms, sustained drone at 850ms, decaying static at 1650ms
- Ghost sprite rendered with horror CSS filter chain (desaturate → sepia → hue-rotate per ghost type → low brightness → high contrast)
- State variables: `_deathVariant` (0–2), `_deathGhostImg` (captured south-facing sprite at kill)
- All existing death flow preserved: kill trigger, movement freeze, results popup, round reset cleanup
- All gameplay tests pass

## 2026-04-21 — Session 177
- Added committed doorway-crossing state (`_huntCrossing`) to eliminate ghost hesitation/oscillation at doorway thresholds during hunts
  - **Root causes**: (1) `_ghostRoom()` flips between rooms mid-doorway, triggering premature search/wander, (2) detection updates cause `_huntPathIdx` reset + path rebuild mid-crossing, (3) every frame independently re-evaluates movement without commitment
  - **3-phase crossing**: approach → cross → exit, with distance thresholds (8px, 4px, dest-room-check). 2s timeout safety net.
  - `canGhostMoveTo` grants unrestricted movement within the doorway rect during active crossing
  - Same crossing logic applied to both warning phase and active hunt movement
  - Crossing state cleared on round reset and stuck recovery
  - Debug HUD shows crossing phase, from→to rooms, and elapsed time
  - Debug overlay draws doorway rect (green), center dot (yellow), exit dot (green), dashed path line, and phase label during crossing
- All gameplay tests pass

## 2026-04-21 — Session 176
- Fixed ghost hunt doorway traversal — 3 root causes identified and fixed:
  1. **LOS beeline across rooms** — ghost with LOS through a doorway would beeline straight to the player instead of using BFS waypoints, causing diagonal wall clipping at doorway edges. Fix: beeline only when ghost and player are in the SAME room; cross-room movement always uses BFS waypoints through doorway centers.
  2. **Single-rect walkable containment** — `canGhostMoveTo` required the ghost's entire 4px collision box inside ONE walkable rect. At room-doorway boundaries where the box straddles two rects, the move was rejected. Fix: during hunts, if single-rect fails, fall back to a 4-corner check (each corner must be in at least one walkable rect).
  3. **Warning phase same issue** — warning phase LOS also beelined across rooms. Same fix applied.
- Added debug: waypoint line in Hunt Debug panel (index, doorway/room type), cyan/orange dot + dashed line on active waypoint in world view, **GHOST→NEXT ROOM** button in debug controls
- All gameplay tests pass

## 2026-04-21 — Session 175
- Added debug **LIGHTS ON** / **LIGHTS OFF** buttons in the collapsible debug controls panel
- LIGHTS ON: flips breaker on (`housePowerOn = true`) + sets all `roomLights[].on = true`
- LIGHTS OFF: sets all `roomLights[].on = false` (breaker stays as-is)
- Buttons are side-by-side on one row at the bottom of the debug controls panel (open with T)
- Click-only, no keyboard shortcut (avoiding further key conflicts)
- All gameplay tests pass

## 2026-04-21 — Session 174
- Added debug "No Detection" toggle (`_dbgNoDetect`) — press **[N]** or click the **DETECT ON/OFF** button in the collapsible debug controls panel
- When ON, ghost cannot sense the player through any path: LOS, noise, electronics, closet reveal, furniture spot-check, hunt start seeding, non-hunt noise routing, or kill check
- Ghost still hunts, moves, searches rooms, and expands search normally — only player detection is suppressed
- Hunt Debug panel shows `!! DETECTION DISABLED !!` and `Detect: DISABLED` when active; Ghost Info panel shows `!! NO DETECTION [N] !!`
- 10 detection paths guarded by the toggle across warning phase, active hunt, electronics, closet reveal, furniture spot-check, `_initHuntLastKnown`, `ghostHearNoise`, and the kill check
- All gameplay tests pass

## 2026-04-21 — Session 173
- Rebuilt hunt detection/search rules to remove omniscient player tracking:
  - **Warning phase completely rewritten** — ghost no longer reads `_roomAtPoint(pcx, pcy)` to path toward the player. Now uses the same detection rules as active hunt: LOS raycast (`_huntHasLOS`) and range-gated noise (200px). When undetected, ghost searches outward from its own room via random adjacent room expansion (same system as active hunt search). Warning phase builds LOS/noise-based `ghostLastKnownRoom` / `_huntLastKnownX/Y` that carry into active hunt.
  - **Warning→Hunt transition no longer re-reads player position** — it carries over whatever the warning phase determined. If warning never detected the player, ghost starts the active hunt searching its own room. Old code: `_huntLastKnownX = pcx; _huntLastKnownY = pcy;` regardless of detection. New code: only falls back to ghost's own room if `ghostLastKnownRoom` is null.
  - **Noise detection range-gated to 200px** in both warning and active hunt phases. Old code had no range check — any `playerNoise > threshold` revealed the player's room from anywhere on the map.
  - **Electronics detection rebuilt** — old code: held active electronic leaked `_huntLastKnownX = ppx; _huntLastKnownY = ppy` (exact coordinates) every frame with no range or hiding check. New code: range-gated to 150px, blocked by hiding (closet/furniture), reveals ROOM only (not exact position), logged in debug.
  - **Kill eligibility now requires active detection** — new `_huntKillWindow` system: LOS sets 1.5s kill window, noise/electronics set 0.8s. Ghost must have recently detected the player to kill. Prevents random-walk kills where ghost stumbles into a hidden player.
  - **Detection tracking** — `_huntDetectSrc` (none/LOS/noise/electronics/special) and `_huntKillWindow` (countdown) track current detection state.
  - **Hunt Debug panel updated** — added `Detect:` line showing detection source + kill window, `Kill:` field now shows actual kill eligibility (detection + grace + proximity).
  - Cursed hunt starts (`_initHuntLastKnown`) unchanged — player explicitly triggered the ghost, so position seed is intentional punishment (still respects hiding from Session 172 fix).
  - All tests PASS

## 2026-04-21 — Session 172
- Fixed hidden players being unfairly found at hunt start:
  - Root cause: `_initHuntLastKnown()` seeded the ghost with the player's exact position and room at hunt start. It checked for safe zone (y>720) and unhuntable rooms (Yard), but NOT for hiding state. A player hiding in a closet or behind furniture before a cursed hunt (Music Box, Summoning Circle, Voodoo, Tarot, Ouija) would have their exact position handed to the ghost.
  - Fix: added `isHiding && (hideSource === "closet" || hideSource === "furniture")` check to `_initHuntLastKnown()`. When player is hidden, ghost is seeded with its own room center instead of the player's position — same behavior as the warning→hunt transition already had.
  - Warning→hunt transition (line ~5425) already checked hiding — added debug tracking variables there too for consistency.
  - Added `_huntStartSource` ("player" / "hidden→ghost_room" / "safe→ghost_room") and `_huntStartHidden` (bool) debug variables
  - Added `Start: hid=Y/N src=...` line to Hunt Debug panel
  - 6 call sites affected: Music Box, Summoning Circle, Voodoo, Tarot Reaper, Tarot Death, Ouija break (all direct hunts that skip warning phase)
  - Normal periodic hunts were NOT affected (they use warning phase which already had the fix)
  - Ghost types that still intentionally bypass hiding during active hunt: Deogen (`always_knows_player_pos`) ignores wall LOS but still respects closet/furniture cloak
  - All tests PASS

## 2026-04-21 — Session 171
- Split debug HUD into 3 separate panels and made controls collapsible:
  - **Panel 1 — Ghost Info** (top-right, 250px): compact ghost identity, hunt state, sanity, speed, noise. Always visible when debug is on.
  - **Panel 2 — Hunt Debug** (below ghost info, 210px, red border): hunt-specific search/tracking info. Only appears during hunts/warnings. Shows: ghost room, search target room, last known room + coords, target source (LOS/NOISE/LAST/SAFE), LOS status, hidden status, cloak details, kill state.
  - **Panel 3 — Debug Controls** (below hunt panel, 180px): collapsible button section. Toggle bar `[+]/[-] Debug Controls` expands/collapses the 4 force buttons (Hunt/Event/Scare/Interact).
  - Toggle controls: click the bar or press `T` key
  - Controls start collapsed by default to save screen space
  - Buttons null out their hit rects when collapsed so clicks pass through
  - Reduced font to 9px, tighter padding, narrower panels — significantly less screen clutter
  - No hunt/search/ghost behavior changes — UI/layout only
  - All tests PASS

## 2026-04-21 — Session 170
- Added hunt/search debug HUD lines (debug-only, no behavior changes):
  - `Search:` line — ghost's current room, search target room, search count, remaining BFS waypoints
  - `State:` line — LOS status, hidden status, last known player room, player's current room
  - Widened debug HUD panel from 240px to 280px to fit new lines
  - Both lines only appear during hunts/warnings (null otherwise)
  - All values read directly from existing hunt state variables

## 2026-04-21 — Session 169
- Fixed ghost hunt door traversal — hunting ghost now passes through interior doors cleanly:
  - Root cause: `canGhostMoveTo` blocked all closed doors unconditionally. The proactive door-slam had a 0.8s cooldown, so during that window the ghost hit the next door and got stuck. The fallback opened the door but didn't retry movement (went to stuck timer instead).
  - `canGhostMoveTo`: skips door collision when `ghostHunting || huntWarning` — ghost passes through freely
  - Added `_huntOpenDoorsAtGhost()`: after each hunt movement, opens any closed door overlapping the ghost + plays slam sound (respects 0.4s sound cooldown, leaves UV fingerprints)
  - Warning phase and chase phase both call the helper after movement
  - Simplified stuck-recovery `else` blocks in both phases — removed now-redundant door-finding code
  - Normal ghost roaming, scare events, player movement: door collision unchanged
  - LOS raycast still blocks on closed doors (correct — ghost can see through doors it opened, not through ones it hasn't reached yet)
  - All tests PASS
- Fixed ghost unfairly targeting player in van/yard during hunts:
  - Root cause: 7 independent code paths fed raw player coordinates (pcx/pcy) into ghost hunt targeting with no zone check. When player was in the van (y≈926), `_roomAtPoint` returned the Yard room, ghost BFS-pathed to the front door and waited there.
  - Added `_playerInSafeZone` flag (pcy > 720) gating all hunt target acquisition
  - Added `_isHuntableRoom()` to exclude Yard from ghost search targets
  - Added `_initHuntLastKnown()` helper for safe hunt-start initialization (used in 7 cursed/music-box/debug/voodoo/tarot hunt starts)
  - Warning phase: player room forced null when in safe zone; ghost drifts to ghostFavRoom instead of van
  - Active hunt: LOS forced false, noise reacquisition blocked, electronics leak blocked, Deogen always-knows disabled in safe zone
  - Warning→hunt transition: treats safe-zone same as hidden-at-transition (ghost searches own room)
  - Give-up timer uses extended 18s when player is in safe zone (matches hidden timing)
  - Debug HUD: added Target line showing source (SAFE ZONE / LOS / noise / lastKnown) + last-known coordinates
  - All tests PASS (ghost now targets Garage instead of Yard when player is outside)
- Fixed ghost doorway traversal and cross-room movement during hunts:
  - Added `_ghostRoom()` helper that resolves doorway positions to the nearest connected room (fixes `_roomAtPoint` returning null when ghost stands in a doorway)
  - Updated all ghost room lookups (BFS pathfinding, hunt chase, warning phase, room presence checks, debug HUD) to use `_ghostRoom` instead of `_roomAtPoint`
  - Increased waypoint advance threshold from 8px to 14px — ghost no longer stalls near doorway centers
  - Added stuck recovery to hunt chase movement (was completely missing — warning and roam had it, hunt chase did not)
  - Stuck timer in hunt uses 1.0s threshold (faster than roam's 2.5s) so ghost recovers quickly during active chase
- All tests PASS
- Fixed ghost doorway threshold jitter during hunts:
  - Root cause: `canGhostMoveTo` required the ghost's full 16×16 body to fit inside a single walkable rect. Doorways are 38px wide but room walkable rects are inset 3px from room edges, creating a narrow overlap zone at each threshold. When the ghost approached diagonally, the 16×16 body straddled the room-doorway boundary — neither rect contained it fully — causing the slide mechanic to fall back to Y-only movement for multiple frames (visible as hesitation/jitter).
  - Fix: during hunts (`ghostHunting || huntWarning`), `canGhostMoveTo` uses a 4×4 effective collision size for the walkable containment check instead of 16×16. This gives 6px tolerance per side, eliminating threshold straddling entirely. The yard boundary check (`y > 714`) still uses full GHOST_SIZE so the ghost can't escape outside.
  - Safety: room-to-room gap without a doorway is 6px (3px inset × 2 sides), which is larger than the 4px body — ghost cannot clip through walls into adjacent rooms.
  - All tests PASS

## 2026-04-16 — Session 168
- Enabled ~12 previously disabled features (removed `if (false &&` guards):
  - Photo Camera evidence capture with star ratings
  - Objectives HUD (bottom-left 3-item tracker with completion flash)
  - Hunt Warning Overlay ("GHOST HUNT STARTING!" red pulsing text)
  - Ghost interactions: door touch, Yurei door slam, light switch toggle, breaker flip, nearby interaction marks
  - Photo capture feedback, bone proximity prompt, placement preview hint
  - Spirit Box overlays, world item pickup prompt, keypad prompt
  - Held item name label, sanity med flash (+35% overlay)
- Activity graph + sanity bar in Threat Monitor panel (expanded panel, 4 click-bound updates)
- Ghost object throwing during hunts (12%/sec for non-Poltergeist, EMF 2 at impact)
- UV fingerprints on doors from ghost touch/slam (Ultraviolet evidence ghosts only)
- EMF emissions on all ghost interaction types (door touch 2-3, Yurei slam 3, light switch 2, breaker 4, nearby 2)
- Breaker trip sound effect (procedural Web Audio)
- Proactive hunt door slam (ghost slams doors as it approaches, 0.8s cooldown)
- All tests PASS (lint clean, smoke PASS, gameplay PASS)

## 2026-04-16 — Session 167
- Hunt atmosphere improvements:
  - Heartbeat vignette gains red tint as ghost closes in (quadratic blend — subtle until very close)
  - Ghost's search room + adjacent rooms flicker more aggressively during hunts (lower threshold), giving directional cue
  - Flashlight dims smoothly based on ghost proximity during hunts (up to 55% reduction at point-blank)
  - Ghost footstep volume now distance-based: full at <80px, fades to 15% at 350px+
  - Ghost hunt moan volume now distance-based: full at <60px, fades to 10% at 360px+
- ESLint cleanup: 47 warnings → 0 warnings
  - Prefixed all unused variables/functions with underscore
  - Converted catch(_e) and catch(_) to bare catch {}
  - Removed dead pcx/pcy declaration in doInteract()
- All tests PASS (syntax OK, 0 lint errors/warnings, smoke PASS, gameplay PASS)

## 2026-04-16 — Session 166
- Added pixel art silhouettes for all 7 previously-missing items in both `drawEquipment()` pegboard cards and `_drawShopItemIcon()` shop preview: Photo Camera, Salt, Firelight, Sound Sensor, Motion Sensor, Head Gear, Parabolic Microphone
- Added Firelight and Parabolic Microphone to TRUCK_CATALOG, SHOP_CATALOG, and ITEM_MAX_QTY so they can be added/removed from the pre-game truck loadout tab
- All items on the pegboard are pickupable via the existing click handler (no logic change needed)
- Van pegboard (equipmentList) automatically reflects whatever was loaded in the pre-game TRUCK tab via `_roundLoadout` → `equipmentList` at game start

## 2026-04-16 — Session 165
- Flashlight distance falloff: fog gradient now starts dimming at 24px world (was 135px); aggressive stops ensure visible near/far difference even in small rooms
- UV light: removed `_uvDark` overlay that was darkening already-lit areas; fixed premultiplied-alpha edge artifact by using same hue at zero-alpha for terminal gradient stop
- Video camera blur: downscale-blur approach (1/4 res → blur → upscale) replaces full-canvas blur — ~16× cheaper; fixed `destination-in` composite mode not being reset across frames (caused blank blur from frame 2 onward)
- Camera static: noise dots + horizontal scan tears overlaid on blur; pre-allocated canvases prevent per-frame GC pressure
- Camera pixelation approach tried and reverted back to gaussian blur per user preference
- Photo camera and objectives HUD disabled (code kept, `&& false` guards); video camera re-enabled for viewfinder/NV
- Persistent save: `localStorage` saves `_selectedChar`, `_layoutPresets`, `_layoutActive`, `_roundLoadout` on every mutation; restored on page load
- Door raycast light-leak fix: expanded door blocking rect by 8px along long axis in `_flRayDist` — covers the 6px gap between narrow door rect and wider doorway connector rect that was letting thin lines of light slip through on both sides of closed doors

## 2026-04-07 — Session 164
- Mode select cards: replaced placeholder photo areas with drawn scenes (lone investigator + flashlight for SP, 4 faded figures + "COMING SOON" stamp for MP, lit room + ghost book + arrow for Training)
- Difficulty selector moved from map page to investigator page
  - Removed full strip from `_drawPageMap`
  - Replaced summary badge on `_drawPageProfile` with compact `‹ / ›` arrow picker
  - Click handlers: arrows on page 2 cycle `_selectedDifficulty` ±1; removed old page-0 diff clicks
- Map polaroid, map name scrap, and van inventory shifted down 20px on investigator page

## 2026-04-07 — Session 163
- PixelLab walk animations fully wired for all 6 characters
  - Downloaded ZIPs for John, Chad, Tiffiny, Loren, Candy, Samuri → extracted to `sprites/characters/{name}/`
  - Pre-load walk frames at page startup (`_plWalkImgs` cache); `_applyCharSprites()` uses cache instead of creating new Images
  - `_applyCharSprites()` now called at game start (was only on photo-click — root bug causing no walk animation)
  - `_drawPlayerSprite` fallback: if walk frame not loaded, try idle frame before procedural art
  - Procedural pixel art character no longer appears when PixelLab char selected
- Motel (Gallow's Inn) improvements
  - All furniture removed from Map 1
  - Door frame markers: 5px bright `#c89448` trim drawn on BOTH sides of every door after room edges, so doors visible from both rooms
  - Red tint fixed: `sunrise`/`sunset` `bg` changed to neutral `#020205` (same as night); `fogColor` also neutralized; colored atmosphere only applies to outside directional light
- Tool readout HUD moved from screen-center to bottom-center above inventory arc
  - Thermometer, EMF Reader, Video Camera pills now anchor at `canvas.height - 30 - 24 - 52`, centered at `canvas.width/2`
- Bug fix: `_nearWI` → `nearWI` typo on bone proximity prompt line

## 2026-04-06 — Session 162
- Map 2 — Gallow's Inn: fully playable second map
  - `buildMap(id)` architecture: `_currentMapId` module-level var set from resolved `_mid`; all map data rebuilt each round
  - Map 1 layout: E-W hallway spine (y:340-390), 4 north rooms (Reception/101/102/Suite), 4 south rooms (Manager/103/104/Laundry), Storage, Lobby, Yard
  - Furniture: 40+ pieces across all rooms — beds, nightstands, dressers, TV stands, reception desk, key rack, washing machines, dryers, storage shelves, lobby benches + vending machines
  - Floor textures: hallway threadbare carpet runner, guestroom worn carpet strips, reception linoleum tiles, laundry/storage concrete tile, lobby checkered tile
  - Room edge highlights: `_RHL` made ternary — map-0 original 14-entry array vs map-1 11-entry array
  - Front door marker: `_fdx/_fdr/_fdcx` derived from `_currentMapId`; same dynamic variables for inside + outside view
  - Motel flat roof: tar-and-gravel texture, parapet rim, HVAC units, water tower, hallway spine visible on roof, south facade with windows + neon sign, front entrance
  - Fog light spill: `fDoor.label === "Front Entrance"` added to find clause; map-1 uses Lobby rect for spill area
  - Bone exclusion: `r.label !== "Lobby"` added alongside Foyer exclusion
  - Map name HUD: `_mapNameMap` updated with id 1 → "Gallow's Inn"

## 2026-04-05 — Session 161
- Phase 51 — Ghost LOS + speed rebalance
  - Replaced 350px distance check with room-identity check: `_roomAtPoint(ghost) === _roomAtPoint(player)` → `_hasLOS`
  - `_huntLastKnownX/Y`: seeded when hunt starts, updated each frame ghost has LOS; ghost chases stale coords when sight is lost
  - `ghostLastKnownRoom`: updated on LOS; ghost re-roams to it when hunt ends
  - Give-up: `huntLostSightTimer` reaches `_huntGiveUpTime` (8s normal, 4s when hiding) → `_endHunt()` fires
  - Speed: `huntSpeedBase 1.0 → 0.85` (search), `huntSpeedLOS 1.4 → 1.1` (chase); all per-ghost overrides scaled proportionally
  - Deogen exception: `always_knows_player_pos` → `_alwaysKnows` bypasses same-room check
  - Removed on-screen overlays: hunt text, presence flash badge, evidence notification overlays; ghost activity stays on minimap
  - Fixed game-freeze: `playerOutside` was `draw()`-local; duplicated `const` in `update()` → ReferenceError; fixed by adding it to `update()` scope
  - Fixed `isSprinting` ReferenceError: moved to module-level `let`; removed local `const` from `update()`; `sndFootstep`/`_tickAudio` can now read it

## 2026-04-05 — Session 160
- Phase 50 — Death sequence
  - `_deathTimer`: 2.5s countdown initiated on ghost catch instead of immediate `_endRound(true)`
  - `sndDeath()`: broadband static burst + high shriek + low subsonic thud; much louder/heavier than ghost scream
  - Death overlay: instant red flash → fast black-in (0.4s) → "ELIMINATED" + "the ghost got you" fade in
  - Controls frozen during death sequence (_deathTimer gate in movement block)
  - `_endRound(true)` fires when timer expires; results popup appears over corkboard as normal

## 2026-04-05 — Session 159
- Phase 49 — Ghost presence detection
  - `_roomAtPoint(ghostX, ghostY)` compared to `_roomAtPoint(player center)` each update frame
  - Edge detect: `_prevGhostInRoom` → fires once when ghost transitions into player's room
  - `sndColdWind()`: low noise + 48Hz rumble + staggered bass; plays on entry
  - `ghostPresenceFlash = 3.0`: "PRESENCE FELT" cyan-white overlay (3s, fade-in/out); subtler than evidence flashes
  - Gated on `safeTimeOver && !ghostHunting`

## 2026-04-05 — Session 158
- Guest button click handler wired (`_enterCorkboard()` on `b.id === "guest"`)
- Start investigation was blocked because no localStorage session → `menuPhase = "profile"` → login gate
- Guest button already rendered + registered in `_profBtnRects`; click handler was the missing piece

## 2026-04-05 — Session 157
- Phase 48 — Ghost status HUD badges (top-left, below evidence count)
  - "GHOST ATTRACTED" amber pulsing badge when ghostAttractTimer > 0 && !ghostHunting; warns player ghost is heading their way
  - Thaye age badge: shows "THAYE Xm (Y%)" where X = elapsed minutes, Y = current hunt threshold; color red <3m, amber 3-7m, green ≥7m (corresponds to tier drops)
  - Badges stack dynamically below smudge badge

## 2026-04-05 — Session 156
- Phase 47 — Ghost activity heat map on minimap
  - ghostActivityRooms: Map<room, cumulative_strength>; updated every time recordGhostActivity() fires
  - Drawn as 6b in minimap pipeline — red (#ff3010) hottest, orange (#e07020) warm, dark red (#a04010) cool
  - Alpha scales 0–32% based on normalized heat fraction; most active room is always fullest
  - Gives players a way to identify ghost's favourite room from the van without entering the house

## 2026-04-05 — Session 155
- Phase 46 — Ghost scare events
  - ghostScareTimer: initialized to 60–120s on round start; fires independently of evidence events
  - On scare: ghostAppearTimer = 0.4s (brief flash), ghostHuntFlash = 0.6s (red screen tint), -5% sanity, sndGhostScream()
  - sndGhostScream(): noise burst + descending sawtooth shriek with stagger
  - Gated on safeTimeOver, ghost not hunting, ghost within 200px
  - Resets to 60–180s after each scare

## 2026-04-05 — Session 154
- Phase 45 — Ghost Orb evidence polish
  - orbSeenFlash: 2s blue-purple overlay "GHOST ORB DETECTED" on first orb sighting per round
  - _orbSeenThisRound flag prevents repeated notifications; resets in startRound()
  - Detection uses _orbsInCameraView() — same cone geometry as existing render, ensures badge matches screen
  - Orb visual: outer pulsing halo (r=22, sin-animated), inner glow expanded to r=12, floor alpha 0.15→0.20
  - All 7 canonical evidence types now have detection notifications

## 2026-04-05 — Session 153
- Phase 44 — Evidence detection flash expansions
  - ghostWriteFlash: 2s purple overlay "GHOST WRITING DETECTED" when ghost writes in open book
  - uvMarkFlash: 2s violet overlay "UV FINGERPRINT DETECTED" when new UV mark deposited on door
  - freezingFlash: 2s cyan overlay "FREEZING TEMPERATURES DETECTED" on first thermometerReading ≤ 0°C
  - All 6 evidence types now have detection notifications (EMF5, DOTS, GhostWrite, UV, Freezing from Phase 40/44; SpiritBox has its own overlay)

## 2026-04-05 — Session 152
- Phase 43 — Per-ghost hue tint on passive appearances
  - getGhostHue(): 24-entry map of ghost names to hue-rotate degrees (Spirit 0°, Banshee 280°, Demon -20°, Yurei 160°, Oni -40°, etc.)
  - Applied as CSS filter on passive ghostAppearTimer renders (non-hunt, non-warning)
  - ctx.filter template: saturate(15%) sepia(0.5) hue-rotate({hue+180}deg) saturate(180%) brightness(0.85)
  - Hunt warning stays orange, active hunt stays red — only passive tint uses ghost hue

## 2026-04-05 — Session 151
- Phase 42 — Crucifix charges system
  - Crucifix now blocks hunt START (hunt roll passes → check crucifix → blocked with charge cost) instead of ending active hunt
  - 2 charges per Crucifix item (charges field initialized on first use); spent state when charges reach 0
  - Visual: cross dims to dark grey/brown when spent; 2 gold dot indicators below cross
  - sndCrucifix(): three-tone holy ringing (880, 1760, 1320 Hz sine waves with stagger)
  - "CRUCIFIX ACTIVATED" overlay: gold text + radial edge glow; 2.2s with fade-in/fade-out

## 2026-04-05 — Session 150
- Phase 41 — Oni + Myling specialRule implementations
  - no_mist_form (Oni): ghostAppearTimer bumped to max(8) on ghost events; ghost stays fully visible much longer
  - more_active_near_players (Oni): when player is < 120px away, effectiveRate = activityRate × 1.8 → event interval reduced from ~5.3s to ~2.9s average
  - high_parabolic_activity (Myling): each ghost event spawns an extra EMF source (L2–4) and extra ghostInteractMark at ghost position

## 2026-04-05 — Session 149
- Phase 40 — Evidence detection flashes + hunt pressure scaling
  - emfL5Flash: 2s overlay "EMF LEVEL 5 DETECTED" (red) on edge-detect of emfLevel reaching 5
  - dotsFlash: 2s overlay "D.O.T.S. FIGURE DETECTED" (purple) on edge-detect of dotsDisturbTimer going > 0
  - Both have 0.375s fade-in and 0.8s fade-out; appear below screen center (y+40..+56)
  - Hunt check interval: non-Demon ghosts now scale 4-6s (full sanity) → 1.5-2.5s (zero sanity) for pressure

## 2026-04-05 — Session 148
- Phase 39 — Ghost interaction audio + flash appearance
  - sndDoorCreak(): low sawtooth creak + noise burst; fires on regular ghost door open/close; ghost flashes 0.8s
  - sndLightClick(): sharp noise burst + square tick; fires when ghost flips light switch; ghost flashes 0.6s
  - Yurei door slam already had sndDoorSlam(); now also bumps ghostAppearTimer to 1.2s
  - Brief ghost flash makes interactions feel visceral without cheap jumpscares

## 2026-04-05 — Session 147
- Phase 38 — Proximity audio events
  - sndGhostBreath(): quiet hiss + soft tone; fires every 3.5–6.5s when ghost is within 90px and not hunting
  - sndWhisper(): mid-freq noise burst + airy tone; fires every 8–20s when playerSanity < 20%
  - sndGhostMoan(): low warble sawtooth; fires every 8–14s during active ghost hunt
  - New timers: _sndBreathTimer, _sndWhisperTimer, _sndMoanTimer; all reset in startRound()

## 2026-04-05 — Session 146
- Phase 37 — Incense system polish
  - smudge_extended_pacify: incensePacified now uses beh.incenseDuration (Spirit = 180s, others = 90s)
  - smudge_room_trap (Yurei): on incense activation, resets ghostRoamTimer, sets ghostHomeTimer = full pacify duration; canMigrate gated on !(smudge_room_trap && incensePacified > 0)
  - SMUDGED HUD badge: shown top-left below evidence badge while incensePacified > 0; countdown in seconds, pulsing alpha

## 2026-04-05 — Session 145
- Phase 36 — Evidence system polish
  - newEvidenceFlash state: {name, timer 2.5s} set when player clicks neutral→confirmed in journal
  - "NEW EVIDENCE CONFIRMED" + evidence name drawn center-screen with fade-in (0.375s) and fade-out (last 1s); dark strip background
  - Evidence count badge: "EVIDENCE X/3" drawn below sanity bar (top-left HUD), always shown after safe time; green at 3, amber at 1-2, dim at 0
  - Flash and badge reset properly in startRound()

## 2026-04-05 — Session 144
- Phase 35 — Ghost behavior visual events
  - Onryo candle extinguish flash: orange radial burst (r 8→30px, 0.45s) at candle position when ghost snuffs it out
  - Poltergeist throw arcs: small brown rectangle flies parabolic arc from ghost to EMF landing spot (0.35–0.55s duration); one arc per thrown item
  - Both state arrays reset in startRound(); animations tick in update() using delta

## 2026-04-05 — Session 143
- Phase 34 — Hunting improvements
  - Revenant LOS HUD: during active hunt, shows "IT SEES YOU" (red) when huntLostSightTimer==0, "SEARCHING" (blue) when ghost lost trail — only visible for Revenant (speed_jumps_on_los)
  - Yokai voice detection HUD: pulsing "YOKAI HEARS YOU" warning when Spirit Box is listening AND Yokai is within 200px AND not hunting; helps player understand voice-aggression mechanic

## 2026-04-05 — Session 142
- Phase 33 — Ghost event visual interactions
  - emfPulses[]: expanding ring visual (orange level 4, red level 5) spawned on EMF 4-5 events; radius expands 60px/s, alpha decays 2.5/s
  - ghostInteractMarks[]: dark brown elliptical smear marks left at ghost position on interactNearby action; max 12; visible without tools
  - Both arrays reset in startRound()

## 2026-04-05 — Session 141
- Phase 32 — Thermometer HUD + frost visual
  - Temperature badge: shown below sanity bar when temp < 15°C; color-coded (white/cold blue/cyan freezing); includes ❄ icon when freezing
  - Frost vignette: radial blue-white gradient at room edges when thermometerReading ≤ 0°C; intensity scales with depth below 0°C (max -6°C); animated sparkle dots from gameTime

## 2026-04-05 — Session 140
- Phase 31 — Footstep sounds
  - sndFootstep(surface): wood/tile/concrete/grass/van surface detection from room label; sprint vol 0.10 vs walk 0.06
  - sndGhostFootstep(): deeper creak+noise; fires at stride rate scaled by ghost huntSpeedLOS during hunt
  - Myling (silent_hunt_footsteps) skips ghost footsteps entirely
  - Player stride: 0.44s walk, 0.26s sprint; timer resets when player stops moving
  - All wired in _tickAudio(); timers reset in startRound()

## 2026-04-05 — Session 139
- Phase 30 — Ambient soundscape
  - sndCreak(): double-tone wood creak; fires every 6–16s in dark rooms (65% chance), 12–22s lit (30% chance)
  - sndDrip(): water drip; fires every 4–12s in rooms labeled Bath/Laundry/Kitchen (55% chance)
  - sndLowHeartbeat(): sub-bass dual pulse; fires when sanity < 30%, BPM scales with panic (40+sanity_deficit)
  - All gated on safeTimeOver && !ghostHunting (no ambience during hunts — silence is scarier)
  - Timers reset in startRound() with randomized offsets to stagger first occurrences

## 2026-04-05 — Session 138
- Phase 29 — Photo Camera evidence
  - pegQty 0 → 1 (Photo Camera now available on pegboard)
  - R key: detects Ghost/EMF Activity/Fingerprint/Salt Footprint/Ghost Writing/Freezing Temperature/D.O.T.S. Figure within 200px
  - Each type captured once per round; photosTaken[] stores evidence types
  - White screen flash (0.22s) with captured type label; sndPhotoShutter() click sound
  - _endRound(): +25 XP for ghost photo, +10 XP per unique evidence photo type
  - photoFlashTimer ticks in update loop; state reset in startRound()

## 2026-04-05 — Session 137
- Phase 28 — Spirit Box static + D.O.T.S. audio
  - sndSpiritBoxStatic(): short radio noise burst every 100–160ms while spiritBoxListenTimer > 0
  - sndSpiritBoxResponse(): three-tone frequency sweep on confirmed ghost response (spiritBoxTimer transition)
  - sndDotsPing(): dual-harmonic soft ping when dotsDisturbTimer transitions from 0 to > 0
  - All three wired in _tickAudio(delta) with transition flags (_sndPrevSBResp, _sndPrevDots)
  - Reset flags in startRound()

## 2026-04-05 — Session 136
- Phase 27 — Audio system
  - AudioContext created lazily on first keydown or click (browser autoplay policy)
  - _playTone(freq, dur, vol, type, attack, release) — oscillator helper
  - _playNoise(dur, vol, cutoffFreq) — white noise burst with lowpass filter
  - Named sounds: sndEMFTick (rising-pitch clicks per level), sndHuntWarning (low two-beat drone), sndHuntPulse (heartbeat thud every 0.78s), sndGhostEvent (crackle), sndDoorSlam (thud), sndSaltCrunch (brief crunch)
  - _tickAudio(delta): EMF tick timer scales with emfLevel; hunt warning fires once on transition; hunt pulse every 0.78s while ghostHunting; called at bottom of update()
  - Ghost event crackle wired to ghostEventTimer branch
  - Yurei door slam wired to closeDoor action execution
  - Salt crunch wired to ghost step detection
  - Audio state reset in startRound() (_sndPrevHunting, _sndPrevWarning, timers)

## 2026-04-05 — Session 135
- Phase 26 — Salt item
  - pegQty 0 → 2 (Salt now available on the pegboard)
  - World item visual: off-white elliptical granule mound; `it.stepped=true` shows darkened + drag scuff marks
  - HUD icon: flat salt pile in _drawHUDIcon switch
  - Ghost step detection: every frame after ghost moves, checks placed Salt within 18px; Wraith skips (no_footprints)
  - On step: `saltIt.stepped = true`, pushes 3 UV marks tagged `salt:true` into uvMarks[]
  - UV renderer split: fingerprints draw ridge arcs + palm smudge; salt footprints draw diffuse oval + 4 toe dots + heel blob

## 2026-04-05 — Session 134
- Phase 25 — Balance pass
  - Demon `frequent_hunts`: hunt check interval 1.5–2.5s (was 3–5s)
  - Power-off sanity multiplier: 1.6× → 1.35× (breaker starts OFF, early game was too punishing)
  - Shade no-hunt radius: 60px → 80px (more distinctly shy, player investigating from 70px no longer provokes)
  - Revenant `speed_jumps_on_los`: 0.4× speed when huntLostSightTimer>0 (lost trail), 2.1× when in LOS range
  - Mare `turns_off_lights`: 3× extra action weight on `touchLightSwitch` when the nearby switch is currently ON
  - Yurei `autonomously_closes_doors`: finds OPEN doors within 80px and adds `closeDoor` action (3× weight); executes by setting door.open=false

## 2026-04-05 — Session 133
- Phase 22 — Van minimap enhancements
  - EMF hotspot blips: placed active EMF Readers within 150px of level 4–5 source show pulsing dot (orange=4, red=5)
- Phase 23 — Round results XP
  - XP level-up loop: each level costs 30% more XP; leveledUp flag triggers "LEVEL UP!" badge
  - Results popup: level + LEVEL UP! badge, XP progress bar with fraction text
- Phase 24 — Hiding mechanic
  - hideTimer: counts up when player is still in a Closet/Walk-In room ≤120×120px
  - HIDING indicator at top-left (yellow → green at full hide)
  - Hiding reduces catch radius 18→10px; hunt LOS giveup time 5→3s when hideTimer > 3
  - Noise decays 3× faster while hiding (playerNoise extra drain)
  - hideTimer decays at 2×/s when moving or leaving the room

## 2026-04-05 — Session 132
- Phase 15 — Raiju: disrupts_electronics → turns off active items within 100px during hunt; occasional power cut
- Phase 16 — The Twins: dual_presence → decoy EMF fires in second room every 8–22s; ghostSpecialState.twinRoomA/B assigned at setup
- Phase 17 — The Mimic: copy_random_ghost → swaps form every 60–120s; getGhostBehavior now reads mimicTarget's behavior
- Phase 18 — Moroi: speed scales 1.0×→2.0× with sanity loss; spirit box adds −5% on top of base −3%
- Phase 19 — Hunt warning border: amber pulsing + "⚠ GHOST NEARBY ⚠"; hunt overlay now also shows remaining seconds
- Phase 20 — Ghost breaker event: non-Jinn ghosts near breaker have 6% action chance to cut power
- Misc: debug HUD shows Mimic current form + swap timer; null lines filtered from debug HUD array

## 2026-04-05 — Session 131
- Phase 7 — HUD + Ghost Special Rules
  - Sanity bar: top-left screen-fixed, 90×7px, color-coded (green/yellow/red), label below
  - Shade: no-hunt-when-group → won't hunt if player within 60px (shy near presence)
  - Onryo: flame_blocks_hunt → threshold=0 if active Incense/Firelight within 180px of ghost
  - Onryo: hunt_on_flame_extinguish → monitors flame count; 65% hunt trigger when last flame goes out, 1.5s warning
- Phase 8 — More Ghost Special Rules
  - Deogen: slows_near_target → fast (1.8×) at range, near-crawl (0.2×) within 30px, smooth lerp
  - Hantu: speed_from_cold → 2.0× speed at <5°C, 0.8× at >15°C via thermometerReading
  - Jinn: cant_turn_off_breaker → steers ghost away if within 60px of BREAKER_X/Y
- Phase 9 — Poltergeist + Banshee
  - Poltergeist: mass_throw_sanity_drain → 2–4 EMF spike scatter on roam, sanity drain (throwCount × 1.5%) if within 200px
  - Banshee: wail_on_roam → −4% sanity drain + brief red tint if player within 250px at roam start
- Phase 10 — Firelight Candle
  - pegQty raised 0→2 (now available on pegboard)
  - E-key interaction: lighter+lit→lights candle; E again→blows out
  - Ghost passes within 50px: 30% chance per second to extinguish candle
  - Active glow: warm flickering radial gradient when lit (uses gameTime for flicker)
  - Contextual E prompt: "light candle" / "blow out candle" / "need lit Lighter"
- Phase 11 — Sanity Meds
  - R key when Sanity Meds held: consume item, +35% sanity via setSanity()
  - HUD name suffix: " [R to use]" when selected
- Phase 12 — Yokai Aggression
  - Spirit Box response near Yokai: huntCooldown reduced by 8s
- Phase 13 — Atmosphere
  - Pre-event light flicker: subtle when ghostEventTimer < 1.5s (not during hunt)
  - Power-off drain multiplier: ×1.6 when breaker is off (darker = more terrifying)
- Phase 14 — Debug HUD
  - Added: playerNoise%, power state, ghostStuckTimer to debug readout line

## 2026-04-05 — Session 130
- Phase 4 — Evidence audit
  - EMF: held reader detects at 120px, placed active EMF Reader detects at 150px (player must be within 160px of placed reader to read it)
  - Ghost Orb camera-only enforcement confirmed already working — no changes needed
  - Freezing Temperatures thermometer system confirmed working — no changes needed
- Phase 5 — Player systems
  - Ouija break: 20% chance triggers a cursed hunt (no warning) when safeTimeOver; Demon immune (ouija_safe rule); hunt duration 25–35s
  - Sprint sanity drain: +0.8%/s extra loss when sprinting in a dark (unlit) room on top of passive dark drain
  - Held EMF Reader at level 4–5: makeNoise(0.4/s) — ghost can hear the device spiking
  - Held Spirit Box while active: makeNoise(0.35/s) — ghost hears chatter
- Phase 6 — Map/environment
  - Breaker starts OFF at round start — player must find the garage breaker to restore power
  - Room lights start randomized: ~40% on, ~60% off (felt off/ghost-influenced state)
  - Breaker flip: makeNoise(0.6) — loud clunk alerts ghost
  - Breaker prompt updated: color-coded ● POWER ON / ○ POWER OFF

## 2026-04-05 — Session 129
- Phase 1 — Core sanity plumbing
  - Added setSanity(v) helper (clamps 0–100); drainSanity() for discrete events unchanged
  - Routed all direct playerSanity mutations: startRound reset, passive drain (3 sites), voodoo pin, tarot fate/dawn/eclipse/saint/death
  - Added finalSanity snapshot to _resultsPopup object; displayed in results popup below ghost type label
  - Added gameRunning guard to passive drain block to prevent post-round ticks
- Phase 2 — Hunt + sanity events
  - Demon huntThreshold override → 100 (hunts at any sanity via quadratic curve)
  - Added _huntCooldownMult() → 0.55 for Demon, 1.0 others
  - Added _endHunt(cooldown) helper; replaced all 4 hunt-end sites (incense, crucifix, LOS loss, timeout)
  - Event drain hooks: spirit box response −3%, EMF5 near player −2%, ghost writing −3%, ouija question −5%, ouija break −10%; all exempt for Demon on ouija (ouija_safe rule)
  - Light flicker during huntWarning/ghostHunting: dual-frequency sin interference on powered lights
- Phase 3 — Ghost AI
  - Added ghostStuckTimer + playerNoise state variables; both reset in startRound()
  - Added makeNoise(amount) + ghostHearNoise() helpers (Yokai threshold 0.25 vs 0.55 standard)
  - Sprint footstep noise: 0.6/s sprinting, 0.15/s walking; decays 0.45/s; ghostHearNoise() called each frame
  - Door slam noise: makeNoise(0.7) when player opens a door
  - Stuck detection: ghostStuckTimer increments when fully blocked; after 2.5s teleports ghost to room center + recomputes path

## 2026-03-26 — Session 128
- Handheld camera viewfinder mode + NV toggle
- Removed PiP top-right box entirely
- holdingCamera = gameRunning && inventory[selectedSlot] === "Video Camera"
- When holdingCamera: normal room-visibility fog replaced with _applyCameraConeFog() on main fogCtx; player sees through 60° cone (same narrow FOV from camera system); flashlight glow overlay skipped
- N key toggles cameraNightVision (works when holding camera or in CCTV view)
  - NV on: green tint rgba(0,50,0,0.60) applied to world; fog fill #001400 (dark green); phosphor shimmer after fog
  - NV off: no tint; fog fill #050505 (near-black); same narrow cone shape
- _applyCameraConeFog(fCtx, W, H, zoom, camX, camY, facing, nightVision): extracted shared fog logic from renderCameraFeed; both handheld mode and CCTV renderCameraFeed now call this
- _drawViewfinderChrome(): corner brackets (green if NV on, grey if off), CAM/NV badge top-left, REC badge top-right when heldItemOn, NV/REC hint bottom-left, scanlines
- cameraNightVision reset on round start
- renderCameraFeed simplified: calls _applyCameraConeFog instead of repeating cone logic

## 2026-03-26 — Session 127
- Unified video camera system: shared renderCameraFeed core, handheld PiP, night vision, recording
- renderCameraFeed(tCtx, tFogCtx, W, H, zoom, camX, camY, facing): shared core function
  - Draws world (walls/rooms/doors/items-as-dots/player) from camera POV; no room-light overlays (NV sees dark)
  - Green tint pass before fog: rgba(0,50,0,0.60)
  - Fog: dark-green fill (#001400) + 60° cone punch clipped to camera's room; adjacent rooms through open doors
  - Vignette + fog stamp; phosphor shimmer overlay
- Handheld PiP: pipCanvas/pipFogCanvas 234×176 created once at init (PIP_ZOOM=1.2)
  - Shown in draw() after main fog stamp when Video Camera is selected slot
  - Position: top-right corner, x=canvas.width-244, y=10
  - renderCameraFeed() uses player pos + playerAngle as camera (live viewfinder)
  - _drawPiPChrome(): green border, HANDHELD CAM/NV badges, REC indicator (blinks when heldItemOn), scanlines
  - heldItemOn (R toggle) = handheld recording
- CCTV: drawCameraView() now calls renderCameraFeed(ctx, fogCtx, W, H, gameZoom, cam.x, cam.y, cam.facing)
  - cctvRecording state (R key in cameraViewMode toggles); REC dot only shown when cctvRecording
  - _drawCCTVChrome() updated: NV badge, conditional REC, R hint in bottom bar

## 2026-03-26 — Session 126
- CCTV camera viewing station in van
- State: cameraViewMode (bool), cameraViewIndex (int); reset on round start
- getPlacedCameras(): returns [{x,y,facing}] for all floor Video Cameras + Tripod.mountedCamera
- nearCCTV(): proximity check at x:305, y:904 — east side of van north wall
- Van draw: CCTV monitor box at x:283–323, y:893–910; active/inactive screen states; blink light; "CAM" label
- E key: enter cameraViewMode when nearCCTV(); ESC closes; ←/→ cycle cameras (consumes input, no game movement)
- drawCameraView(): full-canvas replace of normal draw when cameraViewMode is true
  - World drawn (walls, rooms, room-light overlays, doors, items as dots, player dot) centered on camera position
  - fogCanvas filled black, then narrow 60° cone punched (destination-out) clipped to camera's room
  - Adjacent rooms revealed through open doorways if doorway center falls within cone angle
  - Radial vignette (screen-space source-over) on fogCanvas for edge falloff
  - fogCanvas stamped to main ctx
  - _drawCCTVChrome() overlay: scanlines, top bar (CCTV FEED / CAM N/N), blink REC dot, bottom bar (ESC / cycle hint)
- No-signal screen: static stripes + "NO SIGNAL" text when no cameras placed
- Loop: when cameraViewMode, drawCameraView() replaces draw() + overlay stack; update() still runs (ghost moves)

## 2026-03-26 — Session 125 (revised)
- All three visual fixes for camera/furniture/tripod
- Root causes diagnosed:
  - Camera-on-furniture: furniture was drawn AFTER worldItems (line ~2087 vs ~1724), so furniture rendered ON TOP of camera body
  - Furniture occlusion: getVisibilityData() falls back to rooms[0] when player is outside; previous check saw curRoom=foyer and drew nightstand from outside
  - Tripod camera: -8px offset put camera at front leg tip (cy-7.5) not mount head (cy); looked detached
- Fix 1 (draw order): moved furniture block to BEFORE worldItems loop; camera on furniture now naturally layers on top of surface
- Fix 2 (furniture occlusion): replaced getVisibilityData() check with direct player-in-room test — find which rooms[] rect contains the furniture piece, then check player.x+8/y+8 is inside that room; no fallback
- Fix 3 (furniture placement): changed snap from furniture center to clamped probeX/probeY (inset 4px on sides, 2px top/bottom); camera can be placed anywhere across the surface
- Fix 4 (camera draw cleanup): removed the ctx.restore/re-push hack inside Video Camera draw block — no longer needed since draw order handles layering
- Fix 5 (tripod camera): reverted translate to (cx, cy) — the actual column mount center; added a two-tone bracket ring drawn before the camera body to visually show the physical mount connection

## 2026-03-26 — Session 124
- Camera placement fixes (3 fixes)
- Fix 1 (furniture snap): preview now snaps to center of matched furniture rect instead of floating at probe point; placed camera centered on surface
- Fix 2 (tripod mount): worldItems tripods without mountedCamera are now valid placement targets (18px radius); on commit, sets tripod.mountedCamera + tripod.cameraFacing instead of creating a new worldItem; camera drawn at tripod center with its own ctx.rotate(cameraFacing) at 0.75× scale
- Fix 3 (player angle lock): placementPreview stores lockedPlayerAngle at preview start; while preview.active, playerAngle is frozen to lockedPlayerAngle each frame; placementPreview.angle = raw mouse targetAngle (no lerp); player sprite doesn't rotate during placement
- Preview probe uses lockedPlayerAngle direction (fixed forward direction) not playerAngle

## 2026-03-26 — Session 123
- Camera furniture placement system added
- furniture[] const array: {x,y,w,h,label} entries; currently: Nightstand at foyer bottom-left (306,694,30×18)
- placementPreview state: {active, x, y, angle, valid} — updated each frame in update() while G held
- G keydown: Video Camera → sets placementPreview.active=true (no instant drop); all other items keep existing instant floor placement
- G keyup: if preview active + valid + Video Camera still held → commits worldItem at preview pos/angle; always clears preview
- preview.valid = any furniture rect contains the preview center point
- preview.angle tracks playerAngle live — rotate mouse to rotate camera before placing
- World draw: furniture rendered as warm-wood nightstand (shadow, top surface, drawer line+knob); camera ghost drawn at preview position with blue (valid) or red (invalid) fill+rim + dashed direction arrow
- HUD overlay: "release G to place camera / aim mouse to rotate" or "no surface — aim at furniture / release G to cancel"
- Tripod attachment (E key) unchanged and compatible — placed camera can still be picked up and mounted on tripod

## 2026-03-26 — Session 122
- Tripod basics implemented
- Tripod worldItem gets mountedCamera:null on placement (G key)
- E near tripod while holding Video Camera (selected slot) → attaches camera (removes from inventory, sets mountedCamera)
- E near tripod otherwise → pickup; if mountedCamera set, returns both Tripod + camera to inventory (checks 2 free slots)
- pegQty raised to 1 so Tripod appears in van equipment for testing
- Floor art: 1.5× scale (ctx.scale(1.5,1.5) inside the already-0.5× block); shadow ellipse, 3 legs, leg-tip circles, center column; camera block drawn on top when mountedCamera is set
- Held art: folded tripod column with crossed legs at bottom, head mount at top
- HUD pickup prompt: shows "mount camera on tripod" (blue), "pick up tripod + camera", or "pick up tripod" depending on state; blocked msg if inventory full
- Camera attachment is world-state only; inventory always stores separate strings

## 2026-03-26 — Session 121
- Spirit Box redesigned as player-triggered active tool (was passive periodic ghost event)
- R key starts a 2.5s listen window (spiritBoxListenTimer); hand art shows amber glow + pulsing tuner dial during window
- At window end, conditions evaluated: holding Spirit Box, ghost has evidence, within 180px, ghost in same room as player, room lights off; 85% chance in debug / 65% normal
- Removed Spirit Box from the periodic ghost event block entirely
- 3 distinct overlays with pill background: "listening" (amber pulsing dots during window), "no response" (grey dashes, 2s timeout), "response" (cyan ◈...◈ with fade, existing spiritBoxTimer)
- spiritBoxNoResponse cleared via setTimeout(2000) — brief flash then disappears
- spiritBoxListenTimer + spiritBoxNoResponse added to state vars and round-reset

## 2026-03-26 — Session 120
- Thermometer implemented
- roomTemps[]: one float (°C) per room index; initialized to 20 on round start
- Ghost cooling: each update frame, finds which room ghost is in by bounding box; lerps that room toward coldTarget (−10°C if Freezing Temperatures evidence, else 5°C); rate = 6°C/s in DEBUG_GHOST, 1°C/s normal
- Warmup: rooms not containing ghost drift back toward 20°C at 1°C/s
- Freezing threshold: 0°C (readout labels FREEZING below 0, COLD below 10)
- Thermometer readout: screen-center overlay when Thermometer is held item; shows temp with color (white=normal, blue=cold, cyan=freezing), label, and current room name
- Hand art updated: display color shifts to ice-blue when freezing; shows live rounded temp value
- No breath/fog evidence indicator as requested; evidence comes purely from reading the number

## 2026-03-26 — Session 119
- UV Light (Ultraviolet) evidence implemented
- uvMarks[] array added: persistent per-round array of {x,y} fingerprint locations
- Ghost event: on Ultraviolet evidence, finds nearest door within 80px of ghost, places mark at knob position; deduplicates by 12px radius; capped at 8 marks total
- markInUVCone(mx,my): checks held UV Flashlight (uvFlashlightOn + selected slot) and all active placed UV Flashlights; both use 180px range, PI/9 half-angle cone; returns true if mark is illuminated
- UV marks drawn in world after doors, before floor textures: radial purple glow + fingerprint ridge arcs + palm smudge ellipses; drawn only when markInUVCone returns true
- Placed UV Flashlight beam visual was already implemented; no changes needed there
- Held UV visual (fog partial-erase + hand art + enlarged panel) was already implemented
- uvMarks = [] added to round-reset block
- Debug ghost fires Ultraviolet every 2s; foyer doors are within 80px of ghost spawn → marks appear quickly

## 2026-03-26 — Session 118
- Ghost Writing implemented as location-based evidence
- Ghost Book has 3 visual states: closed cover (inactive), open blank with ruled lines (active, unwritten), open written with ink scrawls (written)
- Ghost event fires when: ev includes "Ghost Writing" AND an active unwritten book is within 120px of ghost
- Written state is permanent (persists as found evidence); writeAnimTimer=1.8 drives scribble shake+glow fade
- EMF event spawned at book location on writing (level 2-3, 10s duration) — writing counts as a ghost interaction
- Active indicator dot turns purple (bright during animation, dim after) when book is written
- Ghost Book drop now initializes written:false, writeAnimTimer:0 on the worldItem
- writeAnimTimer decays in the same ghost-evidence section as dotsDisturbTimer
- Ultimate Ghost (DEBUG_GHOST) fires Ghost Writing every 2s at 100% → place a book in the foyer to test

## 2026-03-26 — Session 117
- EMF Reader redesigned as location-based evidence (matches Phasmophobia behavior)
- Added emfSources[] array: each ghost interaction event pushes {x, y, level, timer} at ghost's position
- Removed global emfLevel/emfDecayTimer; emfLevel is now derived each frame from nearest source within 100px of player
- EMF only reads when EMF Reader is in the selected inventory slot (held); idle if holstered
- All ghosts generate EMF 2–4 on interactions; ghosts with "EMF Level 5" evidence get 30% chance of level 5
- Sources last 8–14s, capped at 6 (oldest removed if overflow); jitter ±10px so sources scatter slightly
- Display code (bar meter in hand + enlarged panel) unchanged — still reads emfLevel correctly
- Debug ghost fires EMF every 2s at 100%; walk into foyer with EMF Reader to see bars

## 2026-03-26 — Session 116
- Added getDotsProjectorAtGhost(): checks ghost (ghostX/Y) against actual cone geometry of each active D.O.T.S. projector (fwd 0–95px, lateral ±fwd×0.65+9); returns projector or null
- Removed old fixed-position stick figure from D.O.T.S. field draw — full ghost body replaces it
- Ghost visibility changed: ghost ONLY drawn when dotsDisturbTimer>0 AND getDotsProjectorAtGhost() returns a projector; unconditional DEBUG_GHOST draw removed
- D.O.T.S. ghost appearance: same body structure as normal ghost but all colors green-tinted; bright green eye glow; flickering green pulse dot on torso; scan-line shimmer overlay (1px lines every 3px)
- Fade: ctx.globalAlpha ramps from 0→1 over first 1.5s of disturb window, full after that
- Ghost keeps walking naturally while visible in D.O.T.S. form (movement code unchanged)
- Fog still handles wall/room occlusion — ghost in foyer hidden from outside by fog automatically
- Debug ghost: dotsDisturbTimer still fires every 2s at 100% in DEBUG_GHOST mode → ghost practically always visible once projector is placed in foyer

## 2026-03-26 — Session 115
- Added master ITEMS registry (const ITEMS[]) — single source of truth for all 28 items; replaces itemColors and directionalTools
- itemColors and directionalTools now derived from ITEMS via Object.fromEntries / Set filter — no game logic changed
- equipmentList now derived from ITEMS (spread map) — qty starts at pegQty, still mutable per session
- Added 15 stub items: Firelight, Head Gear, Motion Sensor, Parabolic Microphone, Photo Camera, Salt, Sound Sensor, Tripod + 7 cursed (Music Box, Ouija Board, Voodoo Doll, Haunted Mirror, Summoning Circle, Monkey Paw, Tarot Cards)
- All stubs have pegQty:0 — show as EMPTY on pegboard; can be enabled by setting pegQty > 0 in ITEMS
- pegboard virtualW now computed dynamically from item count; cols auto-scales as ITEMS grows
- shapes[i]() call wrapped with fallback — items without custom art show a grey ? card with category colour strip; no crash risk
- R key handler simplified: Flashlight/UV have dedicated paths; all other held items fall through to heldItemOn toggle (stub support)
- Phasmophobia name mapping noted in registry comments: Ghost Book=Ghost Writing Book, UV Flashlight=UV Light, Lighter=Igniter

## 2026-03-26 — Session 114
- Added canGhostMoveTo(nx, ny, confineRoom): mirrors canMoveTo — same door blocking, same walkable-rect containment
- confineRoom param restricts ghost to one specific room (inset 3px like walkable list); pass null for free roam later
- Ghost movement uses wall-sliding identical to player: try full move, then x-only, then y-only, then pick new target
- If fully blocked: 0.3s pause then new random target (prevents infinite stuck loop)
- Target picking: inset by GHOST_SIZE (16px) from room edges; falls back to room center if spot is invalid
- DEBUG_GHOST test ghost always passes ghostFavRoom as confineRoom — never leaves foyer
- Normal ghosts (DEBUG_GHOST=false) will pass null — free to roam when roaming is implemented

## 2026-03-26 — Session 113
- Ghost visibility: no change to fog system needed — ghost drawn in world space under fog canvas; walls/unlit rooms occlude it naturally
- Removed: mist aura circle, ghost name label — ghost is now a plain in-world entity
- Ghost movement: replaced instant-teleport drift with smooth waypoint walking (speed 1.4px/frame, ~47% of player)
- Waypoints: random positions inset 14px from room edges; pauses 0.6–2.2s at each; picks new target on arrival
- Ghost faces direction of travel (ghostMoveAngle = atan2 toward target); holds last angle when paused
- Walk animation: ghostWalkCycle accumulates while moving; same sin-based leg/arm swing as player
- New state vars: ghostTargetX/Y, ghostMoveAngle, ghostPauseTimer, ghostWalkCycle; all reset on startGame()

## 2026-03-26 — Session 112
- Ghost visible appearance: decayed player proportions — identical body structure to player sprite (same leg/arm/body/head coords)
- Dead pallor skin #adb89a (grey-green), bloodless grey hands, bare rotted feet, washed-out jacket
- Sunken eye sockets: large dark ellipses (2.0×1.5) replacing player's tiny 1.5px dot eyes; faint grey iris glow inside
- Sunken cheek shadows, forehead wound/gash, rot stain on torso
- Ghost always rotates to face the player (ghostFaceAngle = atan2 toward pcx,pcy)
- Faint cold mist aura (barely visible pulse, rgba 160,220,200)
- Debug ghost name label drawn dimly above head (only in DEBUG_GHOST mode)
- Structure is ready to extend: different ghosts can get small tweaks on top of this base

## 2026-03-26 — Session 111
- Added DEBUG_GHOST flag (top of file, alongside DEBUG_COLLISION)
- ultimateGhost object: all 7 evidence types, spawns in Foyer, never roams
- pickGhost() routes to ultimateGhost when DEBUG_GHOST=true; pins ghostFavRoom to rooms.find("Foyer")
- Evidence fires every 2s at 100% success in debug mode (vs 7–16s at 70%/25% normally)
- Safe-time check bypassed for debug ghost — evidence triggers immediately on round start
- Ghost rendered as pulsing blue stick figure with "GHOST" label; drawn in world-transform space
- To disable: set DEBUG_GHOST=false — all normal ghost behavior restores automatically

## 2026-03-25 — Session 110
- Flashlight fog cone now only clears fog when Flashlight is the selected slot (flashlightHeld check added to drawFlashlightInRoom)
- UV Flashlight split from regular flashlight: separate uvFlashlightOn bool; R key toggles it independently
- UV fog helper drawUVFlashlightInRoom: range 180 (vs 300), partial erasure (fillStyle rgba 0,0,0,0.55) — dimmer reveal
- UV flashlight dropped → uvFlashlightOn reset to false; display/label both updated to use uvFlashlightOn
- Lighter visibility: when lighter selected + lit, radial gradient fog clear r=65 (soft center fade) in destination-out block
- No candle item exists yet — lighter is the only warm-light source

## 2026-03-25 — Session 109
- D.O.T.S. grid refinement: rows 0–6, 15px spacing, 9px col spread, 1.0px dot radius — denser, sharper field (49 dots vs 24)
- Ghost figure preserved in field; works identically (dotsDisturbTimer check unchanged)
- Flashlight placed: gradient cone (0.38→0) + arc close path + lens glow dot; more visible and realistic
- UV Flashlight placed: purple gradient cone (mirrors flashlight)
- Sound Recorder placed: two staggered pulse rings (700ms offset) + steady red REC dot above
- Video Camera placed: blue FOV fan + blinking red REC dot (600ms on/off blink)
- Incense placed: warm orange radial glow around burning tips (r=28) — makes it feel lit
- Lighter held: small orange radial glow (r=55) in world space when lighter selected + lit; weaker than flashlight

## 2026-03-25 — Session 108
- Fixed Q key cycling: lighter now reachable as virtual 4th slot (selectedSlot === inventory.length when hasLighter)
- Lighter HUD slot highlights with white border + dark bg when selected; label shows "Lighter [LIT]" when lit
- Fixed placed tool active state: worldItems.push now uses `active: heldItemOn` instead of `active: false`
- Items turned on before placing (e.g. active D.O.T.S., recording Sound Recorder) stay active on the floor

## 2026-03-25 — Session 107
- Ghost now has a position (ghostX,ghostY) and favorite room (ghostFavRoom) set in pickGhost()
- Favorite room picked from interior rooms (w≥80, h≥80, w<400, h<400) — excludes outside and connectors
- Ghost drifts within favorite room slowly (12% chance per second to reposition)
- Periodic interaction check every 7–16s: 70% success rate in favorite room, 25% outside it
- Evidence: only fires if ghost's evidence[] includes that type
- EMF Level 5: raises emfLevel=5 on event; decays 1 level per 1.5s; EMF Reader (held+display) shows 5-bar rising meter, all red at level 5
- D.O.T.S. Projector: fires if active placed projector within 150px of ghost; draws green stick-figure outline in dot field for 5s with 2s fade; only on the projector nearest to ghost
- Spirit Box: fires only if player holds active Spirit Box (heldItemOn) within 180px of ghost; shows "◈ . . . ◈" screen-center overlay for 3.5s
- All 3 evidence types check ghost.evidence[] — wrong ghosts cannot fake evidence
- New state vars: ghostX,ghostY,ghostFavRoom,ghostEventTimer,emfLevel,emfDecayTimer,dotsDisturbTimer,spiritBoxTimer

## 2026-03-25 — Session 106
- Removed panel box/frame from enlarged held-item display; item art now floats at fixed screen position (center ~744,510)
- Item name label kept with drop-shadow text instead of box border
- Added heldItemOn (bool) and heldItemUsing (bool) state vars; reset in showGame(), on Q (slot switch), on G (drop)
- R key handler expanded: Flashlight/UV toggle flashlightOn; Sound Recorder/D.O.T.S./Video Camera/Incense/EMF/Spirit Box/Thermometer toggle heldItemOn; Lighter only when no held item
- Hold-to-use: in update(), R held while Sound Recorder is on sets heldItemUsing=true (recording mode)
- Sound Recorder now has 3 visual states: off (dark), on/idle (green mic + dim red REC), recording (red body tint + bright green mic + bright red REC) — in both hand and enlarged display
- D.O.T.S. Projector, Video Camera, Incense now respond to R key via heldItemOn

## 2026-03-25 — Session 105
- Floor items: ctx.scale 0.75→0.5 (half player size)
- In-world hand item: ctx.scale 1.6→0.65, translate 10,-6→7,-3 (half player size, close to hand)
- Lighter in-hand: same scale/translate change
- Added screen-fixed enlarged held-item display: panel at (698,462) 92×92px, item drawn at 3.5× scale
- Display shows all 13 inventory items + lighter with full state-based art (flashlightOn for torches, lighterLit for lighter, TODO placeholders for others)
- Display hidden when nothing held; item name label above panel
- Panel uses same dark/amber palette as existing HUD

## 2026-03-25 — Session 104
- Held item scaled up: translate(7,-4) → translate(10,-6), added ctx.scale(1.6,1.6) — items ~60% larger in hand
- Lighter also scaled up to match
- Flashlight: off=dark lens, on=bright yellow lens + two-layer glow halo
- UV Flashlight: off=dim purple lens, on=bright violet lens + purple glow
- Lighter: unlit=body only, lit=orange flame body + yellow tip + warm glow halo (all more prominent)
- Video Camera, Sound Recorder, D.O.T.S., Incense: `const xOn = false; // TODO` placeholder for future held-state wiring
- Crucifix and Sanity Meds: detailed single-state visuals; comments note no game state yet
- Ghost Book: open two-page ruled visual
- Thermometer: probe shaft + teal display with °C label
- EMF Reader: all 4 LEDs always lit (no held off-state yet)

## 2026-03-25 — Session 103
- Placed items scaled to 0.75× with ctx.scale inside their draw block (feels smaller than player)
- Player: arms added (left swings, right stiffens when holding), shoes added, ears added, hair arc added, leg swing amplitude increased to 4, shadow enlarged
- Held item: replaced colored stub with per-item mini art at right-hand position (translate(7,-4)) — 10 items have custom mini visuals (Flashlight, UV Flashlight, Video Camera, EMF Reader, Spirit Box, Sound Recorder, D.O.T.S. Projector, Thermometer, Ghost Book, Lighter); others fallback to colored stub
- Right arm no longer swings when holding an item (rightSwing=0 when holdingItem)
- walkCycle bodyBob removed (arms provide the sense of motion instead)

## 2026-03-25 — Session 102
- Replaced 12×12 colored-square world item art with per-item top-down detailed visuals
- Each item drawn with ctx.save/translate(cx,cy)/rotate(f)/restore so facing is automatic
- Items with detailed art: Flashlight, UV Flashlight, Video Camera, D.O.T.S. Projector, Sound Recorder, EMF Reader, Spirit Box, Thermometer, Ghost Book, Lighter, Incense, Crucifix, Sanity Meds
- All on/off states visually distinct (lens glow, LED color, REC dot, flame, ember tips, ghost writing)
- Facing arrow removed (orientation now shown by the art itself)
- Active indicator dot kept as small screen-aligned dot at item origin (top-right)
- Label moved up to cy-14 to clear larger item silhouettes

## 2026-03-25 — Session 101
- Fixed broken pegboard: adding D.O.T.S. Projector in Session 100 pushed equipmentList to 13 items but shapes[] only had 12 entries
- shapes[12]() was undefined → TypeError → ctx.restore() never called → canvas save stack leaked every frame, corrupting all rendering
- Fix: inserted D.O.T.S. Projector shape at index 8 in shapes[] (after Sound Recorder)
- Fix: switched from 4-per-row to 5-per-row layout so 13 items fit in 3 rows without needing rowEy[3]
- Updated virtualW from 1260 → 1060 (5 cols × 200 + 60)

## 2026-03-25 — Session 100
- worldItems now store {name, x, y, facing, active} — facing = playerAngle at drop time
- Added lighterLit bool; lighter shows bright yellow flame glow when lit
- Added keybinds.use = "r"; R toggles nearest placed item OR held flashlight/lighter
- Per-item placed visuals: Flashlight beam cone, D.O.T.S. dot grid, Sound Recorder pulse ring, Video Camera red dot, direction arrow for directional tools, green/dark active indicator dot
- D.O.T.S. Projector added to equipmentList (qty:2) and itemColors (#40c070)
- Sound Recorder qty updated from 0 → 2
- directionalTools Set added for tools that show facing arrow when placed
- "Use / Toggle" keybind added to Options tab (keybinds.use, default R)

## 2026-03-25 — Session 99
- Fixed keybind rebinding bug: `rw` was missing from the click handler's journal constants block
- `rx + rw - 14` evaluated to NaN → keybind row hit-test always failed silently
- Fix: added `const rw = 350;` to the click handler journal section (matching drawJournal)

## 2026-03-25 — Session 98
- Options tab: removed "Movement Speed" setting; movement speed is no longer player-adjustable
- Sensitivity repurposed as "Flashlight Sensitivity" — lerp rate for playerAngle tracking cursor
  - Low (0.5×) = sluggish atmospheric tracking; High (2.0×) = near-instant snap; Default 1.0×
- Added sprint: hold Sprint key (default: Shift) to move at 1.6× speed
- Sprint added to keybinds object and keybind table in Options tab
- keydown/keyup listeners now also store e.key.toLowerCase() so modifier keys (Shift → "shift") work with keybinds system

## 2026-03-25 — Session 97
- Added Options journal tab (tab index 2): Settings on left page, Key Bindings on right page
- Added state vars: sensitivity (float 0.5–2.0), keybinds (object), rebindingAction (null or action string)
- Sensitivity controls: [-] [value] [+] buttons + visual bar; affects movement speed via multiplier
- Keybind rebinding: click a row on right page → row highlights gold + shows "press any key..." → next keypress sets binding
- ESC cancels rebind without changing the key; rebindingAction reset on showGame()
- All 9 actions rebindable: up/down/left/right/interact/flashlight/journal/drop/inventory
- Movement code now uses keybinds[action] + arrow key fallback; interaction keys use keybinds too
- Tab labels updated: 3 tabs at spacing 130px, width 118px; "Evidence & Suspects" shortened to "Evidence"

## 2026-03-25 — Session 96
- Journal redesigned as open two-page book spread (760px wide, 496px tall)
- Left leather spine at x=20, center crease at x=402 with shadow gradient, dark gap
- Both pages drawn by shared drawPage() helper (aged paper, ruled lines, border)
- Tab 0: Evidence on left page (7 rows, 30px spacing), Suspects list on right page (2 cols of 12)
- Tab 1: Ghost list all 24 on left page (1 col, 18px rows), Selected ghost details on right page
- Ghost detail right page shows: name, 3 evidence pills, notes (word-wrapped), behaviour hint
- Right page title = selected ghost name when on Ghost Guide tab
- All click coordinates updated to match new lx/rx layout
- Tabs repositioned above left page as "Evidence & Suspects" and "Ghost Guide"

## 2026-03-25 — Session 95
- Evidence: single click on row cycles neutral → confirmed (green ✓) → crossed (red ✕) → neutral
- Ghost list: single click on row cycles neutral → selected ★ → crossed (strikethrough) → neutral
- Selecting a neutral ghost makes it the guess; the previous guess goes neutral automatically
- Crossing out the current guess sends playerGuess back to "Spirit"
- Removed separate ✕ button from ghost rows — full row is the click target now
- Evidence hit area widened to 200px (covers label), no separate second box

## 2026-03-25 — Session 94
- Journal redesigned for single-click / tap interaction (no right-click split)
- mousedown listener reverted to click; contextmenu suppressor removed
- Evidence rows: left ✓ box = toggle confirmed, separate right ✕ box = toggle crossed out
- Ghost rows: click name/body = set as guess, small ✕ button on right edge = toggle crossed out
- Ghost row ✕ button drawn at gCol+halfW-18; strikethrough spans from name to ✕ button
- Evidence hint updated: "✓ = have it   ✕ = ruled out"
- Ghost hint updated: "Click name = set guess  ·  ✕ button = cross out"

## 2026-03-25 — Session 93
- Ghost list now supports 3 states: selected guess (★), crossed out (✕ + strikethrough), neutral
- Added ghostStates{} object (ghost name → "crossed"); reset in showGame()
- Left click = set as active guess (also un-crosses the ghost if it was crossed)
- Right click = toggle crossed out
- canvas "click" listener changed to "mousedown" to capture right-click (button===2)
- contextmenu event suppressed on canvas to prevent browser right-click menu
- Ghost row visuals: gold bar + gold text (guess), red bar + red text + strikethrough (crossed)
- Bottom hint updated: "Left click = set guess · Right click = cross out"

## 2026-03-25 — Session 92
- Evidence states upgraded: checkedEvidence (Set) replaced with evidenceStates (object: ev → "confirmed"|"crossed")
- Click cycles: neutral → confirmed → crossed → neutral
- Narrowing logic: confirmed must be in ghost's evidence[], crossed must NOT be in evidence[]
- playerGuess now defaults to "Spirit" on round start (no longer null)
- Ghost tab: clicking a ghost always sets it as the guess (no deselect); exactly one guess at all times
- HUD and keypad text updated to always show current guess
- Result screen noGuess path preserved but unreachable now

## 2026-03-25 — Session 91
- Removed all old prototype systems
- ghostFlash draw block removed from draw()
- HUD objective text (notebook.found based) removed
- HUD proximity prompts for notebook and photo removed
- HUD clue display (notebook.found / photo.found) removed
- `let guessing`, `const guessBoxes`, `selectGhost()`, `drawGuess()` removed
- Journal Evidence tab: notebook/photo "clues collected" section removed; matchClue1/matchClue2 narrowing replaced with evidence-checkbox-only logic
- Title screen updated: "Find the notebook." → "Identify the ghost."

## 2026-03-25 — Session 90
- Added playerGuess (null or ghost name string), keypadOpen (bool); both reset in showGame()
- Journal Ghost Guide tab: click any ghost row to set playerGuess; ★ marker + gold highlight on selected row; click again to deselect; bottom hint shows current guess
- Added nearKeypad() helper (van north wall ~x:210, y:900); E opens keypadOpen
- Van keypad device drawn in van interior: small dark box with status LED (red/green) + "KPD" label
- drawKeypad(): dark panel at canvas center; shows current guess + action button; "Open Van Doors" (green) when vanDoor closed, "Leave Site" (red) when open; ✕ close button top-right
- "Leave Site" click: ends round, sets roundOver=true, evaluates guess vs currentGhost
- Removed old exit-zone trigger (was the only round-end path)
- drawResult() rewritten: shows player's guess, actual ghost name, outcome headline; handles no-guess case cleanly
- game loop: keypadOpen blocks update(); drawKeypad() called after draw()
- ESC handler: keypadOpen closes first; removed guessing from ESC path

## 2026-03-25 — Session 89
- Real ghost system: currentGhost is the one hidden identity for the run, chosen by pickGhost() from the 24-ghost roster
- Removed ghost.visible = true from update loop — ghost position still tracked internally, never rendered
- Removed the semi-transparent roaming ghost rect from draw()
- ghostFlash, ghost position/speed kept for future use (hunt system etc.)

## 2026-03-25 — Session 88
- Replaced ghost roster with full 24-ghost list (Spirit through Thaye)
- Evidence types updated to exact canonical names: EMF Level 5, Spirit Box, Freezing Temperatures, Ultraviolet, Ghost Writing, Ghost Orb, D.O.T.S. Projector
- Each ghost has exactly 3 evidence types matching the official list
- The Mimic: evidence[] = [Spirit Box, Freezing Temperatures, Ultraviolet]; fake Ghost Orb mentioned in notes only — does not affect narrowing logic
- Evidence tab suspect list: updated to 3 columns of 8 at 14px rows to fit all 24 ghosts
- Ghost Guide tab: updated to 2 columns of 12 at 24px entries (name + 3 abbreviated pills per entry)
- evAbbr map added inside Ghost Guide tab for consistent pill labels

## 2026-03-25 — Session 87
- Added D.O.T.S. Projector as 7th evidence type
- Expanded ghost roster to 12: Wraith, Poltergeist, Banshee, Shade, Demon, Phantom, Jinn, Mare, Revenant, Oni, Yurei, Goryo
- Every ghost has a unique 3-evidence combo (verified across all 12); unique clue/clue2 pairs per ghost
- Evidence tab: 7 checkboxes at 22px spacing (was 6 at 26px); suspect list now 2-column (6 per col, 18px rows)
- Ghost Guide tab: compact 30px entries (name + 3 pills + truncated note); 12 entries fit in jh
- Checkbox click coords updated to jy+132+i*22

## 2026-03-25 — Session 86
- Expanded ghost roster from 3 to 6: Wraith, Poltergeist, Banshee, Shade, Demon, Phantom
- Each ghost now has: name, clue, clue2 (legacy), evidence[] (3 types), notes (behavior text)
- Added evidenceTypes[] const (6 types: EMF Level 5, Spirit Box, Freezing Temps, UV Fingerprints, Ghost Writing, Orbs)
- Added journalTab (0=Evidence, 1=Ghost Guide) and checkedEvidence Set; both reset in showGame()
- Journal redesigned with two clickable tabs drawn above the spine
- Tab 0 (Evidence): field clues section, 6 checkable evidence types, narrowed suspect list (combines old clue match + evidence match)
- Tab 1 (Ghost Guide): one entry per ghost with name, 3 evidence pills, behavior note
- Journal click handler extended: tab switching + checkbox toggle
- Guess screen updated: 6 ghost boxes at y:200+i*38, click-only (removed 1/2/3 key handler)

## 2026-03-25 — Session 85
- Journal screen redesigned to look like a physical aged notebook
- Leather spine (left strip) with stitching dots; paper body with age gradient + edge darkening
- Ruled lines (faint blue) + red margin line; dog-ear bottom-right corner; corner shadow
- "CASE FILE" tab sticker top-right; italic serif title "Investigation Notes" with underline
- Evidence and ghost list use italic Georgia serif — handwritten feel
- Possible ghosts: highlighted yellow row + ▸ arrow; ruled-out ghosts dimmed + struck through
- Ink smudge decoration bottom-left; close hint styled "[ J ] close journal"
- All logic/data identical — visual only

## 2026-03-25 — Session 84
- World item drop/place/pickup system added
- worldItems[] array: {name, x, y}; cleared on showGame()
- G key: places selected inventory item 22px in front of player (based on playerAngle); removes from inventory; flashlight turns off if dropped
- E key: extended to pick up nearby world items first (radius 30); respects 3-item limit and lighter exception; blocked silently if full
- World items drawn as 12×12 colored squares with short name label above
- "E — pick up" prompt shows when near a world item; grayed out + message if blocked
- "G — place/drop selected" hint shown in HUD when holding an item

## 2026-03-25 — Session 83
- Inventory/pickup system implemented
- "Flashlight" added to equipmentList (qty:2, index 0) with torch silhouette shape
- Player starts with no flashlight; F key gated on inventory.includes("Flashlight")
- Pickup: click slot on pegboard — lighter→hasLighter (free slot), others→inventory[] (max 3, no dupes)
- Q key cycles selectedSlot through inventory
- Inventory HUD: 3 slots + lighter slot at bottom-left; selected slot highlighted gold
- Held-item visual: colored stub drawn on player in rotated local space (forward = -y)
- showGame() resets inventory, hasLighter, selectedSlot, flashlightOn to false/empty
- Clue lines moved up to y:530/544 to clear inventory HUD space

## 2026-03-25 — Session 82
- Removed pegZoom and all pegboard zoom code; pegboard hint simplified back to scroll-only
- Added gameZoom variable (default 1.8, range 0.8–3.0); const ZOOM = gameZoom in draw()
- +/= or numpad+ zooms in gameplay; -/_ or numpad- zooms out; gated to gameRunning only
- Zoom% shown in HUD top-right below mode label

## 2026-03-25 — Session 81
- Fixed pegboard zoom: replaced e.key ("+"/"=") with e.code ("Equal"/"Minus"/"NumpadAdd"/"NumpadSubtract")
- Replaced translate/scale/translate chain with single ctx.setTransform() call — atomic and unambiguous
- toFixed(1) on pegZoom to avoid floating point drift (0.6000000001 etc)

## 2026-03-25 — Session 80
- Added pegZoom variable (default 1.0, range 0.6–2.0); resets on pegboard open
- +/= zooms in, -/_ zooms out; board translate now: translate(bx,by) → scale(pegZoom) → translate(-pegScrollX,0)
- maxScroll computed live: max(0, virtualW - bw/pegZoom)
- Scroll indicator thumb width and position adjust with zoom
- Hint updated to show current zoom %

## 2026-03-25 — Session 79
- Pegboard reorganized into 3 rows × 4 items (row=floor(i/4), col=i%4); 6 placeholder cols per row
- rowEy = [8, 154, 300]; card 160×130px; colSpacing 200px; virtualW 1260px; maxScroll 596
- Peg shafts now short nubs above each row's card (not long shafts from y=0)
- Labels and qty badge repositioned for smaller card

## 2026-03-25 — Session 78
- Expanded equipmentList to 11 items; added qty field to all
- New items: Sound Recorder (qty:0 = empty slot demo), Sanity Meds, Lighter, Incense, Crucifix
- qty=0 slot: dark card (#0e0c08), EMPTY label, dim name/desc
- qty>0 slot: colored card + silhouette + green ×N badge top-right
- Board widened to 3900px virtual, 16 placeholder slots, max scroll 2000px
- New silhouettes drawn for all 5 new items

## 2026-03-25 — Session 77
- Revised pegboard layout: cards widened to 180px (matches original silhouette offsets), 240px slot spacing
- Added 10 dotted-outline placeholder slots across 2430px virtual board (only 6 filled)
- Max scroll bumped to 800px to show empty expansion space
- Labels re-centered on 180px card (ex+90)

## 2026-03-25 — Session 76
- Fixed rain on road: rain block was drawn before road fillRect which painted over it; moved rain to after road+tape, before van body
- Rain opacity bumped 0.30→0.35 for road visibility
- Sunrise/sunset outside gradient peak raised 0.22→0.36, mid 0.09→0.15

## 2026-03-25 — Session 75
- Rain clip rect now branches on playerOutside: outside → rect(60,60,700,922) covers roof+yard+road; inside → rect(60,720,700,262) keeps interiors dry

## 2026-03-25 — Session 74
- Rain clipped to outside rect (ctx.clip) — no rain inside house or van
- Removed post-fog screen-space blood moon / nightrain tints — they were bleeding interior rooms
- Blood moon + nightrain env.tint alphas raised to compensate (0.35→0.55, 0.30→0.50, 0.20→0.32)
- Sunrise/sunset outside gradient peak raised 0.10→0.22 so exterior wash is clearly visible

## 2026-03-25 — Session 73
- Replaced flat foyer/van sunlight fills with clipped radial gradients centered at each opening
- Foyer: gated on front door open; gradient from door threshold (400,720) radius 90px, clipped to foyer rect
- Van: gated on vanDoor.open; gradient from east opening (360,926) radius 80px, clipped to van interior
- Closed door now = zero light leak in all cases

## 2026-03-25 — Session 72
- Refined sunrise/sunset directional sunlight: outside peak reduced 0.16→0.10, foyer now gated on front door open (rgba 0.04 flat instead of gradient), van stays always-on at 0.04
- Foyer leak removed when front door closed — walls now believably block sunlight
- No changes to movement, camera, collision, van, fog, or roof

## 2026-03-25 — Session 71
- Fixed van/movement crash: `const mode` was declared in screen-space section but used in world-space block above it — ReferenceError stopped draw() mid-execution
- Fix: moved `const mode = envModes[envModeIdx]` to top of draw(), changed `const env = ENV[envModes[envModeIdx]]` to `ENV[mode]`, removed duplicate declaration

## 2026-03-25 — Session 70
- Removed skyGlow full-world tint from ENV (was the main "light passes through walls" culprit)
- Removed sunrise/sunset screen-space gradients entirely
- Added world-space directional sunlight clipped to: outside rect (0.16 peak), foyer (0.07 peak), van interior (0.05 flat)
- Fog naturally blocks the world-space tint from reaching deeper rooms
- ENV simplified: sunrise/sunset have no tint; only blood moon/rain keep the old tint system
- Foyer gets slight warmth leak; hallway and beyond get nothing

## 2026-03-25 — Session 69
- Removed M key — player can no longer manually switch modes
- envModeIdx now set randomly on Start button click
- Sunrise/sunset gradient alphas cut roughly in half (~0.65→0.30 peak, bloom 0.45→0.20)
- Blood moon radial alpha reduced (0.55→0.28 peak)
- Night rain tint reduced (0.22→0.15)

## 2026-03-25 — Session 68
- Sunrise: directional LinearGradient right→left (bright orange east, shadow west) + radial bloom at right horizon
- Sunset: directional LinearGradient left→right (bright red-orange west, shadow east) + radial bloom at left horizon
- Blood moon: radial gradient from top-center (eerie red glow overhead, dark at edges)
- Night rain: flat blue-gray tint; blood moon rain: blood moon + extra dark haze
- Removed screenTint property from ENV — lighting handled directly per mode in draw()
- Sunrise/sunset fog opacity lowered slightly (0.80/0.83) so warm ambient color bleeds through more

## 2026-03-25 — Session 67
- Fixed env mode visual bug: tints were applied in world space BEFORE fog, so fog covered them — moved to screen-space screenTint drawn AFTER fog stamp so it tints all visible content
- Mode label fixed: was nearly invisible (#4a4040 dark gray); now warm-white #d0c8b0 with shadow, clean switch statement for label strings
- Each mode now clearly distinct: sunrise=orange, sunset=red-orange, bloodmoon=crimson, nightrain=blue, night=none

## 2026-03-25 — Session 66
- ENV reworked: fogColor (colored tinted fog per mode), skyGlow (full-world ambient tint), stronger outsideAlpha + tint values
- Sunrise: warm orange glow/tint, fog barely opaque (0.82), outside not darkened at all
- Sunset: deep red-orange, slightly more fog
- Blood moon: crimson sky glow + tint, full dark fog with red cast
- Night: pure cold dark, no glow
- Rain modes: visible blue-gray ambient cast
- Roof-reveal circle replaced: soft radial gradient (clear center → fade at 200 world units), matching sight range style

## 2026-03-25 — Session 65
- Added ZOOM = 1.8 constant; world transform now: translate to screen center → scale(ZOOM) → translate to player
- Fog canvas uses identical zoom transform
- Sight gradient radii scaled by ZOOM (90→162, 260→468 screen px) so sight range feels same in world units
- Flashlight glow radius scaled by ZOOM
- Mouse facing simplified: player always at canvas center, so atan2(mouseY - h/2, mouseX - w/2)

## 2026-03-25 — Session 64
- 6 environment modes: night, nightrain, sunrise, sunset, bloodmoon, bloodmoonrain
- M key cycles modes; current mode shown top-right HUD
- Each mode changes: bg sky color, outside dark overlay alpha, fog fill alpha, color tint (outside+roof), rain toggle
- Rain: 120 scrolling line particles, drift right+down, wrap around player, only drawn in rain modes
- Fog alpha lowered in sunrise (0.90) and sunset (0.92) so more ambient light leaks through everywhere
- Outside circle fog-clear: when playerOutside + front door CLOSED, punch 160px circle in fog extending into roof area; when door OPEN, skip (interior wedge handles visibility instead)

## 2026-03-25 — Session 63
- Roof fully redrawn: south+east exterior wall faces with brick rows + eave shadow for 3D depth
- 4 roof sections (west wing, east wing, garage, foyer) with distinct tones + south-slope ambient tint
- Shingle rows (6px horizontal, per section), N-S ridge (west wing), E-W ridge (east wing + garage)
- Roof valleys (dark creases where sections meet), fascia/eave boards on all 4 edges + gutters
- Chimney: brick body + mortar grid + cap slab + drop shadow

## 2026-03-25 — Session 62
- Outside night: dark overlay (rgba 0.52) over full yard+road area; removes broad daytime look
- Front-door exterior light: small warm radial gradient glow at walkway side of front door (x:400, y:726)
- Roof: drawn over house footprint (x:80–740, y:80–720) only when playerOutside (player.y+8 > 720)
- Roof has wing color variation, hallway ridge line, edge highlights/shadows, chimney detail
- When player goes inside, roof disappears — interior fully readable again

## 2026-03-25 — Session 61
- Van redesigned top-down: drop shadow, roof cutaway showing floor, north highlight, south shadow, cab bulkhead, side portholes, monitor shelf with blue-glow screens, 4 wheel top-down ovals
- Pegboard moved to south interior wall (long side); equipment stubs hang from peg holes
- nearPegboard() updated to south wall position (y:950)
- Equipment screen silhouettes redrawn: EMF wand+LEDs, Spirit Box radio+grill, UV torch+bloom, open Ghost Book+writing, Video Camera+lens, Thermometer+bulb+scale

## 2026-03-25 — Session 60
- Added van equipment wall: pegboard visual on west interior wall, nearPegboard() proximity check
- E key near pegboard opens equipmentOpen overlay; Escape closes it; update() pauses while open
- drawEquipment(): dark panel, peg-hole grid, 6 items each with silhouette, name, short desc
- Equipment list: EMF Reader, Spirit Box, UV Flashlight, Ghost Book, Video Camera, Thermometer
- View-only — no pickup or inventory logic yet

## 2026-03-25 — Session 59
- Replaced cube player with top-down person sprite: head (ellipse), body (jacket rect), legs (two rects)
- Walk animation: legSwing (sin-based offset, legs alternate) + bodyBob only while isMoving
- walkCycle increments each frame while moving; isMoving flag set after movement check
- Player still rotates with playerAngle; eyes on head mark facing direction

## 2026-03-25 — Session 58
- Player sprite now rotates to face mouse: body drawn with ctx.save/translate/rotate using playerAngle
- Front face visible as a bright highlight strip + dark nose dot on top edge of rotated rect
- Shadow offset rect gives subtle depth; gameplay readability preserved

## 2026-03-25 — Session 57
- Fixed gray-screen bug: mouse-facing code in update() referenced camX/camY which are only defined in draw()
- Fix: compute local _camX/_camY inline in update() using same formula as draw()

## 2026-03-25 — Session 56
- 360-degree mouse aiming: mousemove listener on canvas stores mouseX/mouseY in screen coords
- playerAngle now computed each frame via atan2(mouse - playerScreenPos); movement no longer affects angle
- Flashlight cone and visibility wedges automatically follow the new angle (no other changes needed)

## 2026-03-25 — Session 55
- Added roomLights array (one per interior room); switch at top-right corner of each room
- E key near switch toggles light on/off; green/gray indicator drawn at switch position
- Added flashlightOn toggle (F key); playerAngle tracked from movement input via atan2
- Fog canvas now checks room light state: lit rooms erase full rect; dark rooms skip (flashlight only)
- Flashlight: 40° arc (±20°), 220px range, drawn as pie slice clipped to current + adjacent rooms
- Doorway wedges skipped for unlit adjacent rooms; flashlight still shines through them

## 2026-03-25 — Session 54
- Added sight range: radial gradient drawn on fogCanvas after destination-out pass
- Inner radius 90px fully clear, soft fade starts at 0.6, outer radius 260px near-opaque
- Player screen position computed from world coords minus camX/camY for accurate centering

## 2026-03-25 — Session 53
- Replaced even-odd rect visibility with doorway-wedge FOV system
- Added offscreen fogCanvas; darkness drawn there, destination-out punches holes for visible areas
- getVisibilityData(): finds current room + builds wedge {room, e1, e2} for each open doorway
- Wedges: triangle from player position through doorway edge points, extended 2000px, clipped to adjacent room
- Closed doors block sight completely; open doors show only the cone through the opening

## 2026-03-25 — Session 52
- Added visibility system: rectsOverlap + getVisibleRects helpers
- Darkness overlay uses canvas even-odd fill — outer rect = dark, visible room rects = punched holes
- Player sees current room + any room reachable through an open doorway
- Closed doors block sight; open doorway connectors included so gaps stay visible

## 2026-03-25 — Session 51
- Player now spawns inside the van (x:240, y:918); same on reset
- Added vanDoor object (starts closed); east wall blocked until opened
- Van rear opens like a trailer: closed = solid dark panel; open = ramp lying flat east with slat lines
- E key opens/closes van from inside or outside; HUD prompt shows state

## 2026-03-25 — Session 50
- Added doors array (17 doors, one per doorway); each has open state, label, blocker rect
- canMoveTo now checks closed doors before walkable rects
- E key toggles nearest door (<40px); existing notebook/photo inspect unchanged
- Doors draw as warm wood panel when closed (with knob hint), swung stub when open
- HUD shows "Press E to open/close door" prompt when near one

## 2026-03-25 — Session 49
- Full color pass: replaced blue-gray placeholder tones with warm neutrals, wood browns, cool slate, concrete
- Floors: hallway/foyer warm taupe, living room wood brown, kitchen cool stone, bedrooms soft warm gray, baths cool slate
- Furniture: beds warm wood headboard + colored bedding, couch warm brown, tables walnut, counters greige, appliances gray
- Outside: grass deep green, walkway concrete, driveway/road warm asphalt

## 2026-03-25 — Session 48
- Added floor textures: wood strips (living room), tile grid (kitchen, bathrooms), strip lines (hallway)
- Added wall edge shading loop: NW highlight + SE shadow on all interior rooms
- Added furniture shadows (dark SE offset rects) on major pieces
- Added detail accents: stove burner glow, pillow hints on beds, water tint in tub, hanging clothes in closets

## 2026-03-25 — Session 47
- Removed room-name labels from gameplay draw loop
- Added top-down furniture blocks to all 12 rooms: living room, dining, kitchen, utility, garage, master bed, bedroom 2, master bath, main bath, walk-in, study, coat closet
- All furniture is visual only, no collision changes

## 2026-03-25 — Session 46
- Replaced vanBody blocker with vanWalls array: north/south/west walls solid, east wall absent (back door open)
- Player can now walk into van from the east/right side freely; blocked on all other sides

## 2026-03-25 — Session 45
- Added vanBody blocker in canMoveTo: player cannot walk through van, bounces off all sides
- Flipped van visual: cab window moved to west/left side; green back door seam added on east/right side

## 2026-03-25 — Session 44
- Removed all road/van collision: replaced Road Left/Right/Van Interior/Road South with one room (x:60,y:880,w:700,h:102)
- Removed van-specific connectors; Yard↔Road connectors still work
- Van is now visual only — no solid walls around it

## 2026-03-25 — Session 43
- Fixed road walkability: Road Left/Right both h:100; Road South x:180,y:960,w:180,h:22 below van only
- Van Interior h:78→72 so it ends at y:960, no overlap with Road South
- Fixed connector y values: Road Left/Right ↔ Road South now at y:947 (correctly bridges both walkable areas)
- Yellow tape left/right extended to y:986; bottom at y:982

## 2026-03-25 — Session 42
- Added road south strip room (x:60, y:960, w:700, h:20) below van to bridge Road Left and Road Right
- Added connectors: Road Left ↔ Road South (y:960) and Road Right ↔ Road South (y:960)
- Yellow tape now wraps full outside area: left/right edges run to y:984, bottom edge at y:980

## 2026-03-25 — Session 41
- Fixed van entrance: moved from west/back to east/right side; connector now spans full van height (h:78)
- Yellow tape reordered to draw before van (van covers it visually); removed bottom tape line
- Road Right h extended to 90 so it covers full van footprint

## 2026-03-25 — Session 40
- Split Outside room into 4: Yard (y:720-880), Road Left (x:60-180, y:880-940), Road Right (x:360-760, y:880-940), Van Interior (x:180-356, y:888-966)
- Added 3 new connectors: Yard↔RoadLeft, Yard↔RoadRight at y:880; RoadLeft↔VanInterior at x:180 (back wall)
- Van body is now solid on north, south, east sides — only west/back entrance opens into interior
- No house changes

## 2026-03-25 — Session 39
- Van enlarged to 180×80px with body, roof stripe, side panel, window, wheels, and "HAUNTED VAN" label
- Outside room deepened h:200→h:220; road strip deepened to 100px (y:880–980)
- Exit zone moved to x:200, y:920 (near van side door)
- Yellow boundary tape moved to y:936 (bottom), side edges extended to h:220
- Ghost bounds extended to y:940

## 2026-03-25 — Session 38
- Outside zones drawn as visual layers over Outside room: grass (left+right), walkway (center, aligns with foyer door), driveway (garage side), road (bottom strip)
- Removed Garage↔Outside connector — foyer front door is now the only house entrance/exit
- Van moved to y:888, sits clearly on road strip
- Exit zone at y:895 near van

## 2026-03-25 — Session 37
- Replaced two small outdoor rooms (Front Yard + Driveway) with one large Outside rect (x:60, y:720, w:700, h:200)
- Added yellow boundary tape on bottom (y:916) and both side edges (x:60, x:756)
- Street and van pushed south to y:900/905 to sit at the bottom of the outside area
- Exit zone moved to y:908, ghost bounds extended to y:920
- Front door and all house connectors unchanged

## 2026-03-25 — Session 36
- Added outside area: Front Yard (walkable, x:200-600, y:720-840) and Driveway (x:560-740, y:720-820)
- Two new connectors: Foyer↔Front Yard and Garage↔Driveway at y:720
- Street drawn at y:840-900 (visual only, asphalt with curb line)
- Van drawn on street (~x:230, y:845) with dark blue-grey body and label
- Exit zone moved to near van on street (x:280, y:848) — player must walk outside to escape
- No house rooms, connectors, or collision changed

## 2026-03-25 — Session 35
- Redesigned house layout from scratch: original suburban horror layout inspired by spatial feel of reference image, not copied
- 14 rooms: Hallway, Foyer, Master Bed, Master Bath, Walk-in (dead-end), Living Room, Dining Room, Kitchen, Utility, Garage, Bedroom 2, Main Bath, Study, Coat Closet
- 16 doorway connectors covering all room transitions
- Master chain: Master Bed → Master Bath → Walk-in only (no shortcuts)
- Garage accessed only via Utility → Garage (not from foyer)
- Study accessed only via Bedroom 2 (dead-end branch)
- Multiple routing loops: Foyer→Hallway→Living or Foyer→Main Bath→Living, LR→Dining or LR→Kitchen
- Updated evidence spawns, exit position, ghost bounds, player/ghost start positions
- Outer walls simplified to 4 segments; interior wall gaps from room spacing

## 2026-03-24 — Session 1
- Set up project planning files
- Defined game concept: top-down pixel horror, Phasmophobia-inspired
- Decided: browser-first, vanilla JS, single-player MVP
- Next: build canvas scaffolding and get a player moving

## 2026-03-24 — Session 2
- Built canvas scaffold: game loop, player rect, WASD/arrow movement, room boundary
- Added title screen with Start button; canvas hidden until clicked
- Next: ghost entity or multi-room tilemap

## 2026-03-24 — Session 3
- Replaced 1px border room with solid wall rects (20px thick, color #2a2a2a)
- Floor is now a separate inner rect; collision clamps to floor, not room outer edge
- Next: ghost entity (hidden, roaming inside the floor)

## 2026-03-24 — Session 4
- Added gameRunning flag to control loop and screen state
- ESC key returns to title screen and resets player to (380, 280)
- showTitle() / showGame() functions handle screen switching
- "ESC — Lobby" hint drawn in bottom-left corner of canvas

## 2026-03-24 — Session 5
- Added notebook object with 3 fixed spawn positions inside the floor
- spawnNotebook() picks one randomly each time START is clicked
- Notebook drawn as a small green rect (12×16) before the player
- Next: player pickup interaction with notebook, or ghost entity

## 2026-03-24 — Session 6
- Added notebook.found flag; resets on spawnNotebook()
- nearNotebook() checks distance < 40px
- E key sets notebook.found = true when close
- Proximity shows "Press E to inspect" hint; found dims the notebook and shows message
- Next: ghost entity (roaming, hidden)

## 2026-03-24 — Session 7
- Added ghostNames list (5 types) and currentGhost variable
- pickGhost() called on START; resets each round
- After notebook inspected, message shows "the ghost is a [name]"
- Next: ghost entity that moves around the room

## 2026-03-24 — Session 8
- Added exit zone (60×10px, bottom-center of floor); dim until notebook found, then lit yellow
- playerOnExit() checks AABB overlap; sets roundOver=true when triggered post-notebook
- drawResult() draws full-canvas result screen with ghost name
- ESC works from result screen too; roundOver flag reset on return
- Next: ghost entity, or sanity/threat system

## 2026-03-24 — Session 9
- Replaced ghostNames array with ghosts array: [{name, clue}, ...]
- 3 ghost types: Wraith, Poltergeist, Banshee — each with 1 text clue
- Notebook now shows clue text, not ghost name
- Result screen still reveals ghost name after escape
- Updated PROJECT_PLAN.md to reflect actual progress
- Next: ghost entity (roaming rect) or player guess UI

## 2026-03-24 — Session 10
- Added guessing state between exit and result
- drawGuess() shows clue + 3 ghost choices; 1/2/3 keys pick
- guessCorrect flag set; result screen shows correct (green) or wrong (red)
- ESC works from guessing state too
- Next: ghost entity (roaming rect on the floor)

## 2026-03-24 — Session 11
- Fixed loop: requestAnimationFrame now always fires (was returning early, breaking guess→result transition)
- Added selectGhost(index): shared path for keyboard and mouse
- Added canvas click listener: maps click to guessBoxes AABB, calls selectGhost
- guessBoxes array defines box rects shared by drawGuess and click detection

## 2026-03-24 — Session 12
- Added loopRunning flag; loop() only starts if not already running
- Fixes speed stacking caused by multiple loop() calls on repeated START clicks
- No other behavior changed

## 2026-03-24 — Session 13
- Title screen: added control cheatsheet and clearer loop description
- Game HUD: added live objective line (find notebook → reach exit)
- Proximity/clue text: centred, more descriptive
- Guess screen: footer hint updated ("abandon round")
- Result screen: ESC hint updated ("return to the lobby and play again")
- No logic changes

## 2026-03-24 — Session 14
- Added arrowKeys array; keydown calls e.preventDefault() for arrow keys only
- Objective text moved from y=68 (inside room) to bottom-right at x=790, y=590 (right-aligned)
- Updates dynamically: "find the notebook" → "reach the exit" after pickup

## 2026-03-24 — Session 15
- Added clue2 to each ghost object
- Added photo evidence: red 14×12 rect, 3 spawn positions, spawnPhoto() called on start
- nearPhoto() + E key interaction mirrors notebook pattern
- Photo dims to dark red when found
- HUD: notebook clue (green) and photo clue (red) stacked above bottom bar after discovery

## 2026-03-24 — Session 16
- Replaced ghost clues with overlapping set: Wraith+Poltergeist share clue1; Wraith+Banshee share clue2
- One clue alone leaves 2 candidates; both together uniquely identify each ghost
- No code changes except the ghosts array

## 2026-03-24 — Session 17
- Added journalOpen flag; reset in showGame()
- J toggles journal during gameplay; ESC closes it first before checking other states
- drawJournal(): semi-transparent overlay, shows found/missing clues, ghost list filtered by evidence
- Possible ghosts shown bold+white with ▶; eliminated ghosts dimmed with ✕
- update() skipped while journal is open (movement paused); draw() + drawJournal() still run

## 2026-03-24 — Session 18
- Added ROUND_TIME=90, timeLeft, lastTime, lostRound flag
- showGame() resets timer and sets lastTime = performance.now()
- update() computes delta each frame, subtracts from timeLeft; skipped while journalOpen
- Timer hits 0: gameRunning=false, lostRound=true
- drawLose(): red lose screen showing ghost name; ESC returns to lobby
- Timer drawn top-right: grey normally, red under 20s
- ESC now also clears lostRound

## 2026-03-24 — Session 19 — Plan update only
- Removed 90s lose-timer concept from PROJECT_PLAN.md and TASKS.md
- Replaced with safe-time window idea: ghost is passive at round start; danger begins after safe time ends
- Lose condition will come from ghost danger/hunt system, not a countdown
- Next: ghost entity (roaming rect), then safe-time + hunt system

## 2026-03-24 — Session 20
- Renamed ROUND_TIME/timeLeft to SAFE_TIME/safeTime; added safeTimeOver flag
- update(): ticks safeTime down; stops at 0 and sets safeTimeOver=true; no fail state
- HUD top-right: green "Safe: Xs" during safe period, red "Danger" after
- Journal open pauses safeTime tick (existing journalOpen guard in update())
- showGame() resets safeTime=20, safeTimeOver=false, lastTime=performance.now()
- Next: ghost entity (roaming, activates when safeTimeOver)

## 2026-03-24 — Session 21
- Renamed arrowKeys → movementKeys; added "w","a","s","d" to the preventDefault list
- Fixes WASD not working; arrow keys still blocked from scrolling
- No other changes

## 2026-03-24 — Session 22
- Added ghostFlash object {active, x, y, alpha, timer} and flashCooldown
- After safeTimeOver: flashCooldown ticks down; triggers flash at random floor pos every 5–10s
- Flash fades over 0.6s via alpha = timer/0.6; drawn as pale blue-grey rect (globalAlpha)
- showGame() resets ghostFlash.active=false, flashCooldown=6
- Next: ghost entity that roams and causes lose condition

## 2026-03-24 — Session 23
- Added ghost object {x, y, width:18, height:24, speedX:1.2, speedY:0.9, visible}
- showGame() places ghost at random floor position, visible=false
- update(): when safeTimeOver, ghost.visible=true; moves by speed each frame; bounces off floor edges
- draw(): ghost drawn as semi-transparent (alpha 0.45) pale blue-grey rect; distinct from flash
- Next: ghost hunt mode (chases player, lose condition)

## 2026-03-24 — Session 24
- Replaced single room/floor with rooms[] array (5 rooms) + doorways[] array + walkable[]
- canMoveTo(nx,ny): AABB overlap check against all walkable rects; includes wall sliding
- Player starts in foyer (175,160); exit moved to outside strip near van
- Evidence spawns updated to indoor-only positions (foyer, living room, kitchen, dining room)
- Ghost bounces in indoor bounding box (x:50-700, y:90-520)
- Ghost flash picks a random indoor room for its position
- draw(): background→rooms→doorways→labels→van→caution tape→exit→evidence→ghost→player→HUD
- Next: remaining rooms (hallway, bedrooms, basement) or ghost hunt mode

## 2026-03-24 — Session 25
- Replaced 5-room layout with 9-room house shell using exact pixel coords from house plan
- Rooms: master bath, master bed, kitchen/dining, bedroom 3, living room, bedroom 2, bathroom, office/bedroom, laundry
- doorways[] cleared (empty) — connections not wired yet
- Player starts in living room (360,310); ghost bounces in house bounds (100-640, 100-470)
- Removed van/caution tape draw; room labels now #555
- Next: add doorway rects to connect rooms

## 2026-03-24 — Session 41
- Walk-in Closet snapped to x:330, y:330, w:150, h:120 (flush between master bath east, hallway west, above living room)
- Walk-in connector updated: h:41→h:38 (gap is now standard 6px)
- Kitchen/Dining extended south: h:300→h:360 (bottom y:660→y:720) — breaks rectangular footprint
- Right outer wall shortened: h:690→h:600; bottom wall split into left (y:786) and right (y:696) segments
- Kids closets repositioned flush-left: BR1 x:570→x:540, Linen x:690→x:660, BR2 x:810→x:780
- Kids closet connectors updated: x:551/671/791 (was x:581/701/821)
- Next: ghost hunt mode

## 2026-03-24 — Session 40
- Kids closets resized to 60×40, centered under rooms; connectors updated to w:38 cross-axis
- Garage split: x:174 w:156 (main garage); Storage at x:120 w:54 h:150 (separated strip with one connector at x:155)
- Coat Closet slightly reduced to 72×72; Walk-in label shortened to "Walk-in"
- Removed house shell fillRect — walls[] array now defines all wall material explicitly
- Closet labels shortened to fit small rooms ("Closet", "Linen", "Walk-in")
- Next: ghost hunt mode

## 2026-03-24 — Session 39
- Kid BR1, Kids Bath, Kid BR2 shrunk from h:180 to h:120 (y:180-300)
- Added 6 new closet/storage rooms: Walk-in Closet, Coat Closet, Storage nook, BR1 Closet, Linen, BR2 Closet
- Added 5 new connectors (kids room→closet use standard h:38; master bed→walk-in and foyer→coat closet use h/w:41 due to 9px walkable gap)
- Garage Storage nook needs no connector — overlaps garage walkable rect directly
- Next: ghost hunt mode

## 2026-03-24 — Session 38
- Added walls[] array: 9 wall segments (outer perimeter + interior dividers)
- Wall color #1e1610 (darker than house shell #2a2018); drawn after shell, before rooms
- Visual/structural only — canMoveTo and walkable[] unchanged
- Next: ghost hunt mode

## 2026-03-24 — Session 37
- Added camera-follow: camX/camY computed from player center each frame
- ctx.save() / ctx.translate(-camX, -camY) / ctx.restore() wraps all world draw calls
- HUD, debug legend drawn after ctx.restore() — screen-fixed
- No collision logic changed; all positions remain world coordinates
- Next: ghost hunt mode

## 2026-03-24 — Session 36
- Scaled entire house layout 1.5x: rooms, doorways, houseShell, player start, exit, notebookSpawns, photoSpawns, ghost spawn, ghost bounce bounds
- Player width/height/speed unchanged; collision logic unchanged; room relationships unchanged
- House now extends beyond 800×600 canvas — expected, no camera yet
- Next: ghost hunt mode

## 2026-03-24 — Session 35
- Added houseShell rect (x:80,y:80,w:520,h:460) drawn before rooms with fill #2a2018
- The 6px gaps between adjacent rooms now read as visible wall thickness (dark warm brown)
- Outside canvas remains #111 (black void); wall color is distinct from both void and floor colors
- No collision, room positions, or connector geometry changed
- Next: ghost hunt mode

## 2026-03-24 — Session 34
- Set DEBUG_COLLISION = false; overlay hidden, collision logic unchanged
- Next: ghost hunt mode

## 2026-03-24 — Session 33
- Recalculated all 11 connector rects for full-containment collision
- Cross-axis dimension: 14px → 38px (16px into each room + 6px gap)
- Side connectors: x -= 16; floor connectors: y -= 16
- Player (16×16) can now be fully inside a connector at every point during a crossing
- Next: verify traversal with debug overlay, then remove debug flag

## 2026-03-24 — Session 32
- Fixed canMoveTo: changed from AABB overlap to full containment check (nx >= r.x, nx+w <= r.x+r.w, etc.)
- Debug screenshots confirmed partial overlap was allowing movement outside walkable bounds
- Walls now solid immediately; player can only move when fully inside a room or connector rect
- Next: verify with debug overlay, then remove DEBUG_COLLISION

## 2026-03-24 — Session 31
- Added DEBUG_COLLISION flag and overlay: green=room walkables, cyan=connectors, red=player rect
- Overlay mirrors the exact rects used by canMoveTo so the debug view is ground truth
- Next: inspect overlay, confirm gap/bridge alignment, then fix or verify collision

## 2026-03-24 — Session 30
- Fixed wall pass-through properly: rooms shrunk 3px inward in walkable (6px total gap between adjacent rooms)
- Connectors widened to 14px (from 6px) — extend 4px into each room, bridging the 6px gap reliably
- Verified connector math: every connector overlaps both rooms it bridges with margin to spare
- Walls are now solid; only connector openings allow room-to-room movement
- Next: ghost hunt mode

## 2026-03-24 — Session 29
- Fixed wall pass-through: walkable room rects now shrunk 2px inward on all sides
- Adjacent rooms no longer touch in walkable space; connectors are the only bridges
- Drawn room rects unchanged (visual is identical)
- Next: ghost hunt mode

## 2026-03-24 — Session 28
- Populated doorways[] with 11 open-gap connector rects (6px overlap on shared edges)
- Connects: Garage↔Laundry, Laundry↔Foyer, Foyer↔Hallway, Hallway↔Master Bed, Hallway↔Living Room, Hallway↔Kids Hallway, Hallway↔Kitchen, Master Bed↔Master Bath, Kids Hallway↔BR1/Bath/BR2
- walkable[] already spreads doorways — no other code changed
- House is now fully traversable
- Next: ghost hunt mode (chases player, lose condition)

## 2026-03-24 — Session 27
- Replaced 9-room layout with 12-room redesign using hallway-spine architecture
- Rooms: Main Hallway (spine), Foyer, Master Bedroom, Master Bath, Living Room, Garage, Laundry, Kids Hallway, Kid BR1, Kids Bath, Kid BR2, Kitchen/Dining
- All rooms grid-aligned on 20px grid; shared edges defined for future doorways
- Player start moved to Living Room (180, 360); ghost spawns in Kitchen (360+, 240+)
- Exit zone relocated to bottom of Foyer (355, 530)
- Evidence spawn points updated to valid indoor positions in new layout
- Ghost bounce bounds updated to match new house extents (x:80-600, y:80-540)
- Next: doorway walkable rects to connect rooms

## 2026-03-24 — Session 26
- Fixed room positions only (no size changes):
  - Living Room: x 300→280
  - Bathroom: x 560→480, y 260→420 (moved below Bedroom 2, no more overlap)
  - Laundry: y 350→210 (snaps below Master Bedroom)
  - Office/Bedroom: x 200→100, y 350→300 (stacks below Laundry)
- Ghost y-bound extended to 540 to cover Bathroom
- Next: doorway walkable rects to connect rooms
