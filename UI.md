# Sky Bounce — UI Documentation

## Layout

The page uses a two-column CSS Grid on desktop, collapsing to a single column on mobile.

```
┌──────────────────┬──────────────────────┐
│   .hud-panel     │    .game-shell       │
│   (280–360 px)   │    (320–420 px)      │
└──────────────────┴──────────────────────┘
```

Both panels are glassmorphism cards: `rgba(255,247,237, 0.74)` background, `backdrop-filter: blur(16px)`, white-tinted border, warm shadow.

## Components

### HUD Panel (`.hud-panel`)

| Element | Selector | Purpose |
|---|---|---|
| Eyebrow label | `.eyebrow` | "TypeScript Canvas Game" — genre tag |
| Title | `h1` | "Sky Bounce" |
| Description | `.description` | One-line game hint; hidden below 420 px |
| Score card | `.stat-card` + `[data-score]` | Current height score, updated every frame |
| Best card | `.stat-card` + `[data-best]` | All-time best score from localStorage |
| Controls hint | `.controls` | Keyboard shortcut badges; hidden below 420 px |
| Restart button | `.restart-button[data-restart]` | Starts a new game; always visible |

### Game Shell (`.game-shell`)

Contains the canvas and two absolutely-positioned overlays.

#### Canvas (`.game-canvas`)

- Logical size: **420 × 720 px** (7:12 aspect ratio)
- Physical size: scales to fit available width via CSS (`width: min(100%, 420px); height: auto`)
- DPR: capped at ×2; `setTransform` applied in `resizeCanvas()`
- `touch-action: none` prevents scroll interference
- `aria-label` provided for accessibility

#### Game Over Overlay (`.overlay[data-overlay]`)

- Covers the entire canvas area (inset 12 px to match canvas border-radius)
- Hidden via `.hidden` class (sets `display: none`)
- Shows on game over; any pointer event on it restarts the game
- Contains `.overlay-card` with title "Падение" and restart instructions

#### Touch Controls (`.touch-controls`)

- Two full-height buttons covering the lower portion of the canvas
- Visible only on screens ≤ 640 px (`display: none` by default; `display: grid` at breakpoint)
- `.touch-zone-left[data-touch="left"]` / `.touch-zone-right[data-touch="right"]`
- `pointer-events: none` on container; `pointer-events: auto` on each button
- Active state scales the button to 0.98 for tactile feedback

## Color Palette

| Token | Value | Usage |
|---|---|---|
| Brand orange | `#f97316` | Page background gradient start |
| Brand pink | `#fb7185` | Page background gradient end |
| Surface | `rgba(255,247,237, 0.74)` | Panel backgrounds |
| Text primary | `#1f2937` | Body text, player body |
| Text accent | `#7c2d12` | Description, controls, overlay |
| Eyebrow | `#9a3412` | Eyebrow label, stat labels |
| CTA gradient | `#ea580c → #dc2626` | Restart button |
| Canvas bg | `#fed7aa` | Fallback before first frame |

### Canvas Colors

| Element | Color |
|---|---|
| Background gradient top | `#fff7ed` |
| Background gradient mid | `#fed7aa` |
| Background gradient bottom | `#fb923c` |
| Grid lines | `rgba(120,53,15, 0.08)` |
| Static platform | `#15803d` |
| Moving platform | `#0f766e` |
| Fragile platform | `#b45309` |
| Platform highlight | `rgba(255,255,255, 0.35)` |
| Player body | `#1f2937` |
| Player eyes | `#f8fafc` |
| Player hat | `#f59e0b` |
| Player feet | `#ef4444` |

## Typography

- Font stack: `"Trebuchet MS", "Avenir Next", sans-serif`
- Title: `clamp(2.4rem, 5vw, 3.3rem)` / `clamp(2rem, 8vw, 2.7rem)` on mobile
- Stat values: `1.6rem`, bold
- Eyebrow: `0.78rem`, uppercase, `letter-spacing: 0.12em`

## Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `≤ 920 px` | Single-column layout; game shell moves above HUD panel (`order: -1`) |
| `≤ 640 px` | Touch zone buttons become visible; reduced padding; smaller fonts |
| `≤ 420 px` | Description and controls hint hidden to save vertical space; reduced top padding |

## Accessibility

- `aria-label` on `<canvas>` describes the game field
- `aria-hidden="true"` on `.touch-controls` hides decorative touch buttons from screen readers
- Buttons use native `<button type="button">` — keyboard focusable and activatable
- `touch-action: manipulation` on buttons suppresses double-tap zoom

## DOM Structure

```html
<div id="app">
  <main class="layout">
    <section class="hud-panel">
      <p class="eyebrow">…</p>
      <h1>Sky Bounce</h1>
      <p class="description">…</p>
      <div class="stats">
        <div class="stat-card"><span>Высота</span><strong data-score>0</strong></div>
        <div class="stat-card"><span>Рекорд</span><strong data-best>0</strong></div>
      </div>
      <div class="controls">…</div>
      <button class="restart-button" data-restart>Новая попытка</button>
    </section>
    <section class="game-shell">
      <canvas class="game-canvas" …></canvas>
      <div class="overlay hidden" data-overlay>
        <div class="overlay-card">…</div>
      </div>
      <div class="touch-controls" aria-hidden="true">
        <button class="touch-zone touch-zone-left" data-touch="left">…</button>
        <button class="touch-zone touch-zone-right" data-touch="right">…</button>
      </div>
    </section>
  </main>
</div>
```
