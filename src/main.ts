import "./style.css";

// ── Viewport ─────────────────────────────────────────────────────────────────
const VIEW_WIDTH = 420;
const VIEW_HEIGHT = 720;
const MAX_DEVICE_PIXEL_RATIO = 2;

// ── Balance constants (GDD §8) ────────────────────────────────────────────────
const SCORE_PER_LAND = 100;
const BASE_SCROLL_SPEED = 50; // px/s
const ACCEL_STEP_SCORE = 500;
const SCROLL_SPEED_INCREMENT = 0.15; // +15% per step
const MAX_SCROLL_SPEED = 240; // px/s hard cap
const JUMP_FORCE = -450; // upward impulse (y-down convention)
const GRAVITY = 800; // px/s²
const MOVE_SPEED = 300; // px/s horizontal
const BREAKABLE_PLATFORM_CHANCE = 0.25;
const BREAKABLE_DELAY_MS = 750;

// ── Spawn / layout ────────────────────────────────────────────────────────────
const PLATFORM_HEIGHT = 14;
const BASE_PLATFORM_WIDTH = 78;
const START_PLATFORM_WIDTH = 110;
const H_MIN = 60; // min vertical gap between platforms
const H_MAX = 100; // max vertical gap
const W_EDGE = 16; // min distance from side walls

// ── Types ─────────────────────────────────────────────────────────────────────
type GameState = "MENU" | "PLAY" | "GAME_OVER";
type PlatformKind = "static" | "breakable";

type Platform = {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: PlatformKind;
  breakAt: number | null; // performance.now() timestamp when to remove
};

type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function required<T>(value: T | null, message: string): T {
  if (value === null) throw new Error(message);
  return value;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ── DOM setup ─────────────────────────────────────────────────────────────────
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

app.innerHTML = `
  <main class="layout">
    <section class="hud-panel">
      <p class="eyebrow">TypeScript Canvas Game</p>
      <h1>Sky Bounce</h1>
      <p class="description">
        Прыгай по платформам и не падай вниз.
      </p>
      <div class="stats">
        <div class="stat-card">
          <span class="stat-label">Рекорд</span>
          <strong class="stat-value" data-best>0</strong>
        </div>
      </div>
      <div class="controls">
        <span>A / D</span>
        <span>или</span>
        <span>← / →</span>
        <span>для движения</span>
      </div>
    </section>
    <section class="game-shell">
      <canvas
        class="game-canvas"
        width="${VIEW_WIDTH}"
        height="${VIEW_HEIGHT}"
        aria-label="Игровое поле Sky Bounce"
      ></canvas>
      <div class="menu-overlay" data-menu-overlay>
        <div class="overlay-card">
          <p class="overlay-title">Sky Bounce</p>
          <p class="overlay-hint">← / → для движения<br>Пробел / Enter для старта</p>
          <button class="action-button" type="button" data-start>START</button>
        </div>
      </div>
      <div class="gameover-overlay hidden" data-gameover-overlay>
        <div class="overlay-card">
          <p class="overlay-title">Падение</p>
          <p class="overlay-score" data-score-line>Ваш счёт: 0</p>
          <p class="overlay-score" data-best-line>Ваш лучший счёт: 0</p>
          <button class="action-button" type="button" data-replay>REPLAY</button>
        </div>
      </div>
      <div class="touch-controls" aria-hidden="true">
        <button class="touch-zone touch-zone-left" type="button" data-touch="left">
          <span>Влево</span>
        </button>
        <button class="touch-zone touch-zone-right" type="button" data-touch="right">
          <span>Вправо</span>
        </button>
      </div>
    </section>
  </main>
`;

const canvas = required(
  document.querySelector<HTMLCanvasElement>(".game-canvas"),
  "Game canvas was not found."
);
const menuOverlay = required(
  document.querySelector<HTMLDivElement>("[data-menu-overlay]"),
  "Menu overlay was not found."
);
const gameoverOverlay = required(
  document.querySelector<HTMLDivElement>("[data-gameover-overlay]"),
  "Gameover overlay was not found."
);
const bestLabel = required(
  document.querySelector<HTMLElement>("[data-best]"),
  "Best score label was not found."
);
const scoreLineEl = required(
  document.querySelector<HTMLElement>("[data-score-line]"),
  "Score line element was not found."
);
const bestLineEl = required(
  document.querySelector<HTMLElement>("[data-best-line]"),
  "Best line element was not found."
);
const startButton = required(
  document.querySelector<HTMLButtonElement>("[data-start]"),
  "Start button was not found."
);
const replayButton = required(
  document.querySelector<HTMLButtonElement>("[data-replay]"),
  "Replay button was not found."
);
const leftTouchZone = required(
  document.querySelector<HTMLButtonElement>('[data-touch="left"]'),
  "Left touch zone was not found."
);
const rightTouchZone = required(
  document.querySelector<HTMLButtonElement>('[data-touch="right"]'),
  "Right touch zone was not found."
);
const context = required(canvas.getContext("2d"), "2D canvas context is not available.");

// ── Game state ────────────────────────────────────────────────────────────────
const keys = { left: false, right: false };

let gameState: GameState = "MENU";
let lastTime = 0;
let score = 0;
let lastScore = 0;
let bestScore = Number(localStorage.getItem("sky-bounce-best") ?? "0");
let currentScrollSpeed = BASE_SCROLL_SPEED;
let animationFrameId = 0;

let player: Player = createPlayer();
let platforms: Platform[] = [];

bestLabel.textContent = String(bestScore);

// ── Canvas resize ─────────────────────────────────────────────────────────────
function resizeCanvas(): void {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
  canvas.width = Math.round(VIEW_WIDTH * pixelRatio);
  canvas.height = Math.round(VIEW_HEIGHT * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

// ── Entity factories ──────────────────────────────────────────────────────────
function createPlayer(): Player {
  return {
    x: VIEW_WIDTH / 2 - 18,
    y: VIEW_HEIGHT - 200,
    width: 36,
    height: 42,
    vx: 0,
    vy: 0
  };
}

function createPlatform(y: number, forceStatic = false): Platform {
  const kind: PlatformKind =
    !forceStatic && Math.random() < BREAKABLE_PLATFORM_CHANCE ? "breakable" : "static";
  const width = BASE_PLATFORM_WIDTH;
  const x = randomBetween(W_EDGE, VIEW_WIDTH - width - W_EDGE);
  return { x, y, width, height: PLATFORM_HEIGHT, kind, breakAt: null };
}

// ── Scroll speed calculation ──────────────────────────────────────────────────
function calcScrollSpeed(currentScore: number): number {
  const steps = Math.floor(currentScore / ACCEL_STEP_SCORE);
  const speed = BASE_SCROLL_SPEED * Math.pow(1 + SCROLL_SPEED_INCREMENT, steps);
  return Math.min(speed, MAX_SCROLL_SPEED);
}

// ── Session setup ─────────────────────────────────────────────────────────────
function buildPlatforms(): void {
  platforms = [];

  // Start platform
  const startY = VIEW_HEIGHT - 80;
  platforms.push({
    x: VIEW_WIDTH / 2 - START_PLATFORM_WIDTH / 2,
    y: startY,
    width: START_PLATFORM_WIDTH,
    height: PLATFORM_HEIGHT,
    kind: "static",
    breakAt: null
  });

  // Fill screen upward
  let y = startY - randomBetween(H_MIN, H_MAX);
  while (y > -H_MAX) {
    platforms.push(createPlatform(y));
    y -= randomBetween(H_MIN, H_MAX);
  }
}

function initSession(): void {
  score = 0;
  currentScrollSpeed = BASE_SCROLL_SPEED;
  player = createPlayer();
  // Place player on start platform
  const startY = VIEW_HEIGHT - 80;
  player.y = startY - player.height;
  player.vy = JUMP_FORCE; // initial jump so game feels live immediately
  buildPlatforms();
}

// ── Overlay helpers ───────────────────────────────────────────────────────────
function showMenuOverlay(): void {
  menuOverlay.classList.remove("hidden");
  gameoverOverlay.classList.add("hidden");
}

function showGameoverOverlay(): void {
  scoreLineEl.textContent = `Ваш счёт: ${lastScore}`;
  bestLineEl.textContent = `Ваш лучший счёт: ${bestScore}`;
  menuOverlay.classList.add("hidden");
  gameoverOverlay.classList.remove("hidden");
}

function hideAllOverlays(): void {
  menuOverlay.classList.add("hidden");
  gameoverOverlay.classList.add("hidden");
}

// ── Transitions ───────────────────────────────────────────────────────────────
function startPlay(): void {
  initSession();
  hideAllOverlays();
  gameState = "PLAY";
}

function triggerGameOver(): void {
  lastScore = score;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("sky-bounce-best", String(bestScore));
    bestLabel.textContent = String(bestScore);
  }
  gameState = "GAME_OVER";
  showGameoverOverlay();
}

// ── Platform spawning ─────────────────────────────────────────────────────────
function spawnPlatformsAbove(): void {
  // Find topmost platform
  let topY = VIEW_HEIGHT;
  for (const p of platforms) {
    if (p.y < topY) topY = p.y;
  }
  // Spawn until coverage reaches above screen top
  while (topY > -H_MAX) {
    topY -= randomBetween(H_MIN, H_MAX);
    platforms.push(createPlatform(topY));
  }
}

// ── Update: conveyor + breakables ─────────────────────────────────────────────
function updatePlatforms(delta: number, now: number): void {
  // Move all platforms down (conveyor)
  for (const p of platforms) {
    p.y += currentScrollSpeed * delta;
  }

  // Remove expired breakables and platforms below screen
  platforms = platforms.filter((p) => {
    if (p.breakAt !== null && now >= p.breakAt) return false;
    if (p.y > VIEW_HEIGHT + 20) return false;
    return true;
  });

  spawnPlatformsAbove();
}

// ── Update: player ────────────────────────────────────────────────────────────
function updatePlayer(delta: number): void {
  // Horizontal input
  player.vx = 0;
  if (keys.left) player.vx = -MOVE_SPEED;
  if (keys.right) player.vx = MOVE_SPEED;

  player.x += player.vx * delta;

  // Horizontal wrap
  if (player.x + player.width < 0) player.x = VIEW_WIDTH;
  else if (player.x > VIEW_WIDTH) player.x = -player.width;

  // Vertical
  const previousBottom = player.y + player.height;
  player.vy += GRAVITY * delta;
  player.y += player.vy * delta;
  const currentBottom = player.y + player.height;

  // Collision — only when falling (vy > 0), only from above
  if (player.vy > 0) {
    for (const p of platforms) {
      if (p.breakAt !== null) continue; // already counting down, skip re-trigger
      const landedFromAbove = previousBottom <= p.y && currentBottom >= p.y;
      const overlapsX = player.x + player.width > p.x && player.x < p.x + p.width;
      if (landedFromAbove && overlapsX) {
        player.y = p.y - player.height;
        player.vy = JUMP_FORCE;
        score += SCORE_PER_LAND;
        currentScrollSpeed = calcScrollSpeed(score);
        if (p.kind === "breakable") {
          p.breakAt = performance.now() + BREAKABLE_DELAY_MS;
        }
        break;
      }
    }
  }
}

// ── MENU idle bounce (no scoring, no scroll) ──────────────────────────────────
function updateMenuPlayer(delta: number): void {
  player.vy += GRAVITY * delta;
  player.y += player.vy * delta;

  // Bounce on start platform
  const startPlatformY = VIEW_HEIGHT - 80;
  const currentBottom = player.y + player.height;
  if (player.vy > 0 && currentBottom >= startPlatformY && player.y < startPlatformY) {
    player.y = startPlatformY - player.height;
    player.vy = JUMP_FORCE;
  }
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawBackground(): void {
  const gradient = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  gradient.addColorStop(0, "#fff7ed");
  gradient.addColorStop(0.45, "#fed7aa");
  gradient.addColorStop(1, "#fb923c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // Subtle grid lines
  context.strokeStyle = "rgba(120, 53, 15, 0.08)";
  context.lineWidth = 1;
  for (let y = 0; y < VIEW_HEIGHT + 64; y += 64) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(VIEW_WIDTH, y);
    context.stroke();
  }
}

function drawPlayer(): void {
  context.save();
  context.translate(player.x, player.y);

  context.fillStyle = "#1f2937";
  context.beginPath();
  context.roundRect(0, 8, player.width, player.height - 8, 12);
  context.fill();

  context.fillStyle = "#f8fafc";
  context.fillRect(8, 16, 8, 8);
  context.fillRect(player.width - 16, 16, 8, 8);

  context.fillStyle = "#f59e0b";
  context.beginPath();
  context.arc(player.width / 2, 8, 12, Math.PI, 0);
  context.fill();

  context.fillStyle = "#ef4444";
  context.fillRect(6, player.height - 4, player.width - 12, 4);

  context.restore();
}

function drawPlatform(p: Platform, now: number): void {
  if (p.y < -40 || p.y > VIEW_HEIGHT + 40) return;

  let alpha = 1;
  if (p.breakAt !== null) {
    const remaining = p.breakAt - now;
    // Blink at ~6 Hz while fading from 1 → 0.2
    const fraction = remaining / BREAKABLE_DELAY_MS; // 1 → 0
    const blink = Math.sin((now / 1000) * Math.PI * 12) > 0 ? 1 : 0.5;
    alpha = Math.max(0.2, fraction) * blink;
  }

  context.save();
  context.globalAlpha = alpha;

  const color = p.kind === "breakable" ? "#b45309" : "#15803d";
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(p.x, p.y, p.width, p.height, 10);
  context.fill();

  // Shine strip
  context.fillStyle = "rgba(255,255,255,0.35)";
  context.fillRect(p.x + 8, p.y + 3, p.width - 16, 3);

  // Cracks on breakable
  if (p.kind === "breakable") {
    context.strokeStyle = "rgba(120, 53, 15, 0.55)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(p.x + p.width * 0.2, p.y + 3);
    context.lineTo(p.x + p.width * 0.45, p.y + p.height - 2);
    context.lineTo(p.x + p.width * 0.7, p.y + 2);
    context.stroke();
  }

  context.restore();
}

function drawHUD(): void {
  // Score top-center on canvas
  context.save();
  context.font = "bold 28px 'Trebuchet MS', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "rgba(124, 45, 18, 0.85)";
  context.fillText(String(score), VIEW_WIDTH / 2, 14);
  // Best score top-right
  context.font = "14px 'Trebuchet MS', sans-serif";
  context.textAlign = "right";
  context.fillStyle = "rgba(124, 45, 18, 0.6)";
  context.fillText(`Рекорд: ${bestScore}`, VIEW_WIDTH - 12, 16);
  context.restore();
}

function drawStartPlatform(): void {
  const p: Platform = {
    x: VIEW_WIDTH / 2 - START_PLATFORM_WIDTH / 2,
    y: VIEW_HEIGHT - 80,
    width: START_PLATFORM_WIDTH,
    height: PLATFORM_HEIGHT,
    kind: "static",
    breakAt: null
  };
  drawPlatform(p, 0);
}

// ── Main frame loop ───────────────────────────────────────────────────────────
function frame(time: number): void {
  const delta = Math.min((time - lastTime) / 1000, 1 / 30);
  lastTime = time;
  const now = performance.now();

  drawBackground();

  if (gameState === "MENU") {
    updateMenuPlayer(delta);
    drawStartPlatform();
    drawPlayer();
  } else if (gameState === "PLAY") {
    updatePlatforms(delta, now);
    updatePlayer(delta);

    // Game over check: player center below viewport
    if (player.y + player.height / 2 > VIEW_HEIGHT) {
      triggerGameOver();
    }

    for (const p of platforms) drawPlatform(p, now);
    drawPlayer();
    drawHUD();
  } else {
    // GAME_OVER — static render
    for (const p of platforms) drawPlatform(p, now);
    drawPlayer();
    drawHUD();
  }

  animationFrameId = requestAnimationFrame(frame);
}

// ── Input ─────────────────────────────────────────────────────────────────────
function setKeyState(code: string, value: boolean): void {
  if (code === "ArrowLeft" || code === "KeyA") keys.left = value;
  if (code === "ArrowRight" || code === "KeyD") keys.right = value;
}

function handlePointer(clientX: number): void {
  if (gameState !== "PLAY") return;
  const bounds = canvas.getBoundingClientRect();
  const midpoint = bounds.left + bounds.width / 2;
  keys.left = clientX < midpoint;
  keys.right = clientX >= midpoint;
}

function releaseMovement(): void {
  keys.left = false;
  keys.right = false;
}

function setTouchDirection(direction: "left" | "right"): void {
  keys.left = direction === "left";
  keys.right = direction === "right";
}

window.addEventListener("keydown", (event) => {
  if (
    event.code === "ArrowLeft" ||
    event.code === "ArrowRight" ||
    event.code === "Space" ||
    event.code === "Enter"
  ) {
    event.preventDefault();
  }

  if (event.code === "Space" || event.code === "Enter") {
    if (gameState === "MENU") { startPlay(); return; }
    if (gameState === "GAME_OVER") { startPlay(); return; }
  }

  setKeyState(event.code, true);
});

window.addEventListener("keyup", (event) => {
  setKeyState(event.code, false);
});

startButton.addEventListener("click", () => startPlay());
replayButton.addEventListener("click", () => startPlay());

canvas.addEventListener("pointerdown", (event) => {
  if (gameState !== "PLAY") return;
  handlePointer(event.clientX);
});

canvas.addEventListener("pointermove", (event) => {
  if ((event.buttons & 1) !== 1 || gameState !== "PLAY") return;
  handlePointer(event.clientX);
});

canvas.addEventListener("pointerup", releaseMovement);
canvas.addEventListener("pointerleave", releaseMovement);
canvas.addEventListener("pointercancel", releaseMovement);

for (const [element, direction] of [
  [leftTouchZone, "left"],
  [rightTouchZone, "right"]
] as const) {
  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (gameState !== "PLAY") return;
    setTouchDirection(direction);
  });
  element.addEventListener("pointerup", releaseMovement);
  element.addEventListener("pointerleave", releaseMovement);
  element.addEventListener("pointercancel", releaseMovement);
}

window.addEventListener("blur", releaseMovement);
window.addEventListener("resize", resizeCanvas);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(animationFrameId);
    releaseMovement();
    return;
  }
  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(frame);
});

// ── Boot ──────────────────────────────────────────────────────────────────────
resizeCanvas();

// MENU state: set up idle player on start platform
player = createPlayer();
player.y = VIEW_HEIGHT - 80 - player.height;
player.vy = JUMP_FORCE;
showMenuOverlay();

animationFrameId = requestAnimationFrame((time) => {
  lastTime = time;
  frame(time);
});
