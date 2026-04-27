# Sky Bounce

Простая браузерная игра в духе Doodle Jump на чистом TypeScript + Canvas, собирается через Vite.

## Стек

- TypeScript 5.6
- Vite 5.4
- Canvas 2D (без внешних движков и библиотек)

## Команды

- `npm install` — установка зависимостей
- `npm run dev` — локальный dev-сервер с HMR (обычно http://localhost:5173)
- `npm run build` — продакшен-сборка: сначала `tsc` для type-check, затем `vite build` в `dist/`
- `npm run preview` — превью продакшен-сборки локально

Перед коммитом всегда прогоняй `npm run build`, чтобы поймать ошибки типов — отдельного `tsc --noEmit` в скриптах нет, type-check встроен в build.

## Структура

```
src/
  main.ts         — вся игровая логика: цикл, физика, рендер, input
  style.css       — стили страницы
  vite-env.d.ts   — типы Vite
index.html        — точка входа
vite.config.ts    — конфиг Vite
```

Вся игра живёт в `src/main.ts` одним файлом. Если он перевалит за ~600 строк, имеет смысл разнести по модулям (player, platforms, render, input, loop), но пока намеренно держим монолитом.

## Конвенции

- Игровые константы (гравитация, скорости, размеры) объявляются в верху `main.ts` как `const` в `SCREAMING_SNAKE_CASE`.
- Типы для игровых сущностей — `type` (не `interface`).
- Координаты в логических пикселях (VIEW_WIDTH × VIEW_HEIGHT = 420×720), масштабирование под DPR делается в рендере, не в логике.
- Игра должна работать и с клавиатуры (A/D, ←/→, Space), и с тача (удержание левой/правой нижней зоны).

## Чего не делать

- Не тащить в проект игровые движки (Phaser, PixiJS и т. п.) — задумано на голом Canvas.
- Не добавлять серверную часть, бэкенд, аналитику — это статичная страница.
- Не коммитить `dist/` и `node_modules/` (уже в `.gitignore`).
- Не править `vite.config.ts.timestamp-*.mjs` — это временные файлы Vite, удаляй если попадаются.

## Деплой

Проект собирается в `dist/` и заливается на itch.io как zip. Архив `sky-bounce-itch.zip` в `.gitignore`.

# Project Instructions

This is a game development project.

## Global rules
- Work only inside the current task scope.
- Do not make large refactors unless explicitly requested.
- Do not modify unrelated systems.
- Prefer small, reviewable changes.
- Explain risks and testing steps.
- If requirements are unclear, ask before implementation.

## Agent usage
Use the correct agent for the task:
- gamedesigner: mechanics, balance, progression, player experience
- gameplay-dev: implementation of gameplay features
- architect-dev: architecture, systems design, technical structure
- qa: testing, bugs, edge cases, regression risks
