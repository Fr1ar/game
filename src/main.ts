import "./style.css";

const VIEW_WIDTH = 420;
const VIEW_HEIGHT = 720;
const GRAVITY = 1600;
const HORIZONTAL_SPEED = 260;
const JUMP_SPEED = 860;
const MAX_FALL_SPEED = 1100;
const PLATFORM_HEIGHT = 14;
const BASE_PLATFORM_WIDTH = 78;
const MAX_DEVICE_PIXEL_RATIO = 2;

type PlatformKind = "static" | "moving" | "fragile";

type Platform = {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: PlatformKind;
  dx: number;
  broken: boolean;
};

type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
};

function required<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }

  return value;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App container was not found.");
}

app.innerHTML = `
  <main class="layout">
    <section class="hud-panel">
      <p class="eyebrow">TypeScript Canvas Game</p>
      <h1>Sky Bounce</h1>
      <p class="description">
        Прыгай по платформам, поднимайся как можно выше и не падай вниз.
      </p>
      <div class="stats">
        <div class="stat-card">
          <span class="stat-label">Высота</span>
          <strong class="stat-value" data-score>0</strong>
        </div>
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
      <button class="restart-button" type="button" data-restart>Новая попытка</button>
    </section>
    <section class="game-shell">
      <canvas
        class="game-canvas"
        width="${VIEW_WIDTH}"
        height="${VIEW_HEIGHT}"
        aria-label="Игровое поле Sky Bounce"
      ></canvas>
      <div class="overlay hidden" data-overlay>
        <div class="overlay-card">
          <p class="overlay-title">Падение</p>
          <p class="overlay-text">Нажми кнопку, пробел или тапни по игре, чтобы начать заново.</p>
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
const overlay = required(
  document.querySelector<HTMLDivElement>("[data-overlay]"),
  "Overlay was not found."
);
const scoreLabel = required(
  document.querySelector<HTMLElement>("[data-score]"),
  "Score label was not found."
);
const bestLabel = required(
  document.querySelector<HTMLElement>("[data-best]"),
  "Best score label was not found."
);
const restartButton = required(
  document.querySelector<HTMLButtonElement>("[data-restart]"),
  "Restart button was not found."
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

const keys = {
  left: false,
  right: false
};

let lastTime = 0;
let cameraY = 0;
let highestPlatformY = 0;
let score = 0;
let startHeight = 0;
let bestScore = Number(localStorage.getItem("sky-bounce-best") ?? "0");
let isGameOver = false;
let animationFrameId = 0;

bestLabel.textContent = String(bestScore);

let player: Player = createPlayer();
let platforms: Platform[] = [];

function resizeCanvas(): void {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
  canvas.width = Math.round(VIEW_WIDTH * pixelRatio);
  canvas.height = Math.round(VIEW_HEIGHT * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function createPlayer(): Player {
  return {
    x: VIEW_WIDTH / 2 - 18,
    y: VIEW_HEIGHT - 120,
    width: 36,
    height: 42,
    vx: 0,
    vy: -JUMP_SPEED
  };
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createPlatform(y: number): Platform {
  const roll = Math.random();
  let kind: PlatformKind = "static";

  if (roll > 0.83) {
    kind = "moving";
  } else if (roll > 0.67) {
    kind = "fragile";
  }

  const width = kind === "fragile" ? BASE_PLATFORM_WIDTH - 10 : BASE_PLATFORM_WIDTH;

  return {
    x: randomBetween(24, VIEW_WIDTH - width - 24),
    y,
    width,
    height: PLATFORM_HEIGHT,
    kind,
    dx: kind === "moving" ? (Math.random() > 0.5 ? 70 : -70) : 0,
    broken: false
  };
}

function resetGame(): void {
  player = createPlayer();
  platforms = [];
  score = 0;
  cameraY = 0;
  highestPlatformY = VIEW_HEIGHT - 36;
  startHeight = player.y;
  isGameOver = false;
  overlay.classList.add("hidden");

  const startPlatformY = VIEW_HEIGHT - 48;
  platforms.push({
    x: VIEW_WIDTH / 2 - 55,
    y: startPlatformY,
    width: 110,
    height: PLATFORM_HEIGHT,
    kind: "static",
    dx: 0,
    broken: false
  });

  let y = startPlatformY - 90;
  while (y > -VIEW_HEIGHT * 1.5) {
    platforms.push(createPlatform(y));
    y -= randomBetween(72, 102);
  }

  highestPlatformY = y;
  scoreLabel.textContent = "0";
}

function updateBestScore(): void {
  if (score <= bestScore) {
    return;
  }

  bestScore = score;
  localStorage.setItem("sky-bounce-best", String(bestScore));
  bestLabel.textContent = String(bestScore);
}

function spawnPlatformsIfNeeded(): void {
  while (highestPlatformY > cameraY - VIEW_HEIGHT * 1.5) {
    highestPlatformY -= randomBetween(68, 104);
    platforms.push(createPlatform(highestPlatformY));
  }
}

function updatePlatforms(delta: number): void {
  for (const platform of platforms) {
    if (platform.kind !== "moving" || platform.broken) {
      continue;
    }

    platform.x += platform.dx * delta;

    if (platform.x <= 12 || platform.x + platform.width >= VIEW_WIDTH - 12) {
      platform.dx *= -1;
      platform.x = Math.max(12, Math.min(platform.x, VIEW_WIDTH - platform.width - 12));
    }
  }

  platforms = platforms.filter((platform) => platform.y < cameraY + VIEW_HEIGHT + 120 && !platform.broken);
}

function bounce(platform: Platform): void {
  if (platform.kind === "fragile") {
    platform.broken = true;
  }

  player.vy = -JUMP_SPEED;
}

function updatePlayer(delta: number): void {
  player.vx = 0;

  if (keys.left) {
    player.vx -= HORIZONTAL_SPEED;
  }

  if (keys.right) {
    player.vx += HORIZONTAL_SPEED;
  }

  player.x += player.vx * delta;

  if (player.x + player.width < 0) {
    player.x = VIEW_WIDTH;
  } else if (player.x > VIEW_WIDTH) {
    player.x = -player.width;
  }

  const previousY = player.y;
  player.vy = Math.min(player.vy + GRAVITY * delta, MAX_FALL_SPEED);
  player.y += player.vy * delta;

  if (player.vy > 0) {
    for (const platform of platforms) {
      const previousBottom = previousY + player.height;
      const currentBottom = player.y + player.height;
      const landedFromAbove = previousBottom <= platform.y && currentBottom >= platform.y;
      const overlapsX =
        player.x + player.width > platform.x && player.x < platform.x + platform.width;

      if (landedFromAbove && overlapsX && !platform.broken) {
        player.y = platform.y - player.height;
        bounce(platform);
        break;
      }
    }
  }

  const targetCameraY = player.y - VIEW_HEIGHT * 0.35;
  cameraY = Math.min(cameraY, targetCameraY);

  score = Math.max(score, Math.max(0, Math.floor((startHeight - player.y) / 10)));
  scoreLabel.textContent = String(score);
  updateBestScore();

  if (player.y > cameraY + VIEW_HEIGHT + 80) {
    isGameOver = true;
    overlay.classList.remove("hidden");
  }
}

function drawBackground(): void {
  const gradient = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  gradient.addColorStop(0, "#fff7ed");
  gradient.addColorStop(0.45, "#fed7aa");
  gradient.addColorStop(1, "#fb923c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  context.save();
  context.translate(0, (-cameraY * 0.15) % 64);
  context.strokeStyle = "rgba(120, 53, 15, 0.08)";
  context.lineWidth = 1;

  for (let y = -64; y < VIEW_HEIGHT + 64; y += 64) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(VIEW_WIDTH, y);
    context.stroke();
  }

  context.restore();
}

function drawPlayer(): void {
  const screenY = player.y - cameraY;
  context.save();
  context.translate(player.x, screenY);

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

function drawPlatform(platform: Platform): void {
  const screenY = platform.y - cameraY;

  if (screenY < -40 || screenY > VIEW_HEIGHT + 40) {
    return;
  }

  const color =
    platform.kind === "moving"
      ? "#0f766e"
      : platform.kind === "fragile"
        ? "#b45309"
        : "#15803d";

  context.fillStyle = color;
  context.beginPath();
  context.roundRect(platform.x, screenY, platform.width, platform.height, 10);
  context.fill();

  context.fillStyle = "rgba(255,255,255,0.35)";
  context.fillRect(platform.x + 8, screenY + 3, platform.width - 16, 3);

  if (platform.kind === "fragile") {
    context.strokeStyle = "rgba(120, 53, 15, 0.55)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(platform.x + platform.width * 0.2, screenY + 3);
    context.lineTo(platform.x + platform.width * 0.45, screenY + platform.height - 2);
    context.lineTo(platform.x + platform.width * 0.7, screenY + 2);
    context.stroke();
  }
}

function drawWorld(): void {
  drawBackground();

  for (const platform of platforms) {
    drawPlatform(platform);
  }

  drawPlayer();
}

function frame(time: number): void {
  const delta = Math.min((time - lastTime) / 1000, 1 / 30);
  lastTime = time;

  if (!isGameOver) {
    updatePlatforms(delta);
    updatePlayer(delta);
    spawnPlatformsIfNeeded();
  }

  drawWorld();
  animationFrameId = requestAnimationFrame(frame);
}

function setKeyState(code: string, value: boolean): void {
  if (code === "ArrowLeft" || code === "KeyA") {
    keys.left = value;
  }

  if (code === "ArrowRight" || code === "KeyD") {
    keys.right = value;
  }
}

function handlePointer(clientX: number): void {
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
  if (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "Space") {
    event.preventDefault();
  }

  if (event.code === "Space" && isGameOver) {
    resetGame();
    return;
  }

  setKeyState(event.code, true);
});

window.addEventListener("keyup", (event) => {
  setKeyState(event.code, false);
});

restartButton.addEventListener("click", () => {
  resetGame();
});

overlay.addEventListener("pointerdown", (event) => {
  event.preventDefault();

  if (isGameOver) {
    resetGame();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  if (isGameOver) {
    resetGame();
    return;
  }

  handlePointer(event.clientX);
});

canvas.addEventListener("pointermove", (event) => {
  if ((event.buttons & 1) !== 1) {
    return;
  }

  handlePointer(event.clientX);
});

canvas.addEventListener("pointerup", () => {
  releaseMovement();
});

canvas.addEventListener("pointerleave", () => {
  releaseMovement();
});

canvas.addEventListener("pointercancel", () => {
  releaseMovement();
});

for (const [element, direction] of [
  [leftTouchZone, "left"],
  [rightTouchZone, "right"]
] as const) {
  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    if (isGameOver) {
      resetGame();
      return;
    }

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

resizeCanvas();
resetGame();
animationFrameId = requestAnimationFrame((time) => {
  lastTime = time;
  frame(time);
});
