# Sky Bounce — Game Design Document

## Concept

Sky Bounce is a browser-based endless vertical platformer inspired by Doodle Jump. The player controls a character that bounces automatically on platforms and must climb as high as possible without falling off the bottom of the screen.

## Core Loop

1. Character spawns on a wide starting platform and immediately bounces upward.
2. Player steers left/right to land on successive platforms.
3. Camera follows the player upward; platforms below the screen are despawned.
4. New platforms are spawned continuously above the visible area.
5. If the player falls below the camera view, the game ends.
6. The score equals the maximum height reached (logical pixels / 10, displayed as integer).
7. Best score is persisted in `localStorage` across sessions.

## Physics

| Constant | Value | Effect |
|---|---|---|
| `GRAVITY` | 1600 px/s² | Downward acceleration applied every frame |
| `JUMP_SPEED` | 860 px/s | Upward velocity set on each bounce |
| `MAX_FALL_SPEED` | 1100 px/s | Terminal velocity cap |
| `HORIZONTAL_SPEED` | 260 px/s | Constant left/right speed while input is held |

The logical coordinate space is **420 × 720 px** (7:12 ratio). All physics run in logical pixels; DPR scaling is applied only at render time.

The player wraps horizontally: exiting the left edge re-enters from the right and vice versa.

## Platform Types

| Type | Color | Behavior |
|---|---|---|
| `static` | Green (`#15803d`) | Fixed position, reusable indefinitely |
| `moving` | Teal (`#0f766e`) | Moves horizontally, bounces off side walls |
| `fragile` | Amber (`#b45309`) | Breaks on first contact, narrower (68 px vs 78 px) |

### Spawn Distribution (per platform)

- ~17% moving
- ~16% fragile
- ~67% static

Platforms are spaced **68–104 logical px** apart vertically (randomized). A buffer of 1.5 screen-heights of platforms is maintained above the camera at all times.

### Starting Platform

A fixed-width (110 px) static platform is placed at `y = VIEW_HEIGHT - 48` to guarantee a safe first bounce.

## Game States

| State | Description |
|---|---|
| Active | Physics running, input processed, score updating |
| Game Over | Physics frozen, overlay shown, score locked |

Transition to Game Over: player's Y > `cameraY + VIEW_HEIGHT + 80`.

Restart: Space key, tap on overlay, tap on canvas while game over, or "Новая попытка" button.

## Scoring

```
score = floor((startHeight - player.y) / 10)
```

`startHeight` is the player's initial Y position. Score only increases — it never decreases when the player moves down. Best score is saved to `localStorage` key `"sky-bounce-best"`.

## Camera

The camera moves **only upward**, tracking the player when the player rises above 35% from the top of the viewport:

```
targetCameraY = player.y - VIEW_HEIGHT * 0.35
cameraY = min(cameraY, targetCameraY)
```

## Controls

| Input | Action |
|---|---|
| `A` / `←` | Move left |
| `D` / `→` | Move right |
| `Space` | Restart (game over only) |
| Touch left half of canvas | Move left |
| Touch right half of canvas | Move right |
| Touch zone buttons (mobile) | Move left / right |
| Tap overlay / canvas | Restart (game over only) |

Window blur and `visibilitychange` (tab hidden) release all movement keys and pause the animation loop.

## Difficulty

Difficulty is implicit and constant — platform spacing and type ratios do not change with height. Perceived difficulty increases naturally as the player climbs faster and has less reaction time.

## Out of Scope

- No enemies or hazards beyond fragile platforms
- No power-ups or collectibles
- No sound or music
- No server-side logic or leaderboards
- No game engine — pure Canvas 2D
