---
name: montage-scenes
description: Справочник типов сцен WOPPS Montage — поля, примеры, фоны, палитра
---

# Типы сцен

Все сцены живут в `scenes.json`:

```json
{ "scenes": [ { "id": "s01", "type": "title", "...": "..." } ] }
```

Общие поля: `id`, `type`, `vo` (строка или массив), `bg`, `accent`, `duration` (секунды — только если нет `vo`),
`energy` (0–1, громкость музыки), `mood` (`warm` для тёплых сцен).

Фоны: `flat`, `grid`, `particles`, `glow`, `floor`, `nebula`.

## title

```json
{ "type": "title", "kicker": "WOPPS // MONTAGE", "headline": "Видео\nиз одной фразы",
  "sub": "Сценарий, голос, музыка, рендер — автоматически", "bg": "glow", "vo": "…" }
```
Хук. `\n` — жёсткий перенос. `kicker` — мелкая строка сверху.

## statement

```json
{ "type": "statement", "lines": ["МЫСЛЬ", "В ДВЕ СТРОКИ"], "sub": "пояснение", "bg": "particles" }
```
Крупное заявление, дешифровка по буквам. Максимум 2 строки, каждая ≤ 24 символа.

## bullets

```json
{ "type": "bullets", "kicker": "план", "title": "Что внутри",
  "items": [{ "title": "Голос", "text": "112 реплик, замер по факту" }], "bg": "grid" }
```
3–5 пунктов. Больше — режь или дели на две сцены.

## terminal

```json
{ "type": "terminal", "cwd": "~/project", "bg": "grid",
  "commands": [{ "cmd": "npm run build", "out": ["ok  1240 ms", "done"] }] }
```
2–4 команды. Строки `out`, начинающиеся с `ok/done/готово` — зелёные, `error/fail` — красные.
Не выдумывай вывод: бери реальные логи.

## code

```json
{ "type": "code", "file": "src/app.ts", "bg": "grid",
  "lines": [{ "text": "const total = items.length", "kind": "add" },
            { "text": "// было", "kind": "dim" }] }
```
`kind`: `add` (зелёная строка), `del` (красная, зачёркнутая), `dim` (приглушённая), `accent` (подсветка).
12–18 строк максимум, иначе не читается.

## window / screenshot

```json
{ "type": "window", "url": "app.local", "callouts": ["живой интерфейс"],
  "cards": [{ "title": "Метрика", "text": "…", "meta": "today" }] }
```
```json
{ "type": "screenshot", "screenshot": "assets/ui.png", "callouts": ["реальный скриншот"] }
```
Скриншот кладётся в `assets/` проекта; CLI сам копирует его в движок.
`cards` — если скриншота нет.

## stats

```json
{ "type": "stats", "kicker": "цифры", "title": "Один прогон",
  "items": [{ "label": "сцен", "value": 16 }, { "label": "реплик", "value": 112 }] }
```
1–3 метрики. Числа — только реальные. `suffix`/`prefix` для «%», «×», «$».

## compare

```json
{ "type": "compare", "title": "Было / стало",
  "left": { "title": "Ручной монтаж", "items": ["час работы"], "tone": "bad" },
  "right": { "title": "Montage", "items": ["15 минут"], "tone": "good" } }
```
По 2–4 пункта в каждой колонке.

## steps

```json
{ "type": "steps", "title": "Как это работает",
  "items": [{ "title": "Бриф", "text": "одна фраза" }, { "title": "Сцены", "text": "JSON" }] }
```
3–4 шага. В вертикали превращается в колонку.

## montage

```json
{ "type": "montage", "bg": "nebula",
  "cards": [{ "tag": "01", "title": "Голос", "text": "edge-tts" },
            { "tag": "02", "title": "Музыка", "text": "numpy" }] }
```
Кульминация под бит: карточки появляются по очереди. 4–8 карточек.

## quote

```json
{ "type": "quote", "text": "Он до сих пор не верит, что я справился сам.",
  "author": "Влад", "bg": "glow" }
```
Одна мысль, ≤ 18 слов. Цитата только настоящая.

## outro

```json
{ "type": "outro", "headline": "Готово. Один brief — один MP4.",
  "sub": "Со звуком и субтитрами", "cta": "/montage", "bg": "nebula" }
```
Финал: логотип (из `brief.brand.name`), одна строка, CTA.

## Палитра и тема

- Один акцент на ролик: `brief.brand.accent`. Меняй `accent` только для смыслового контраста (плохо/хорошо).
- `brief.theme: "light"` — светлая тема. Тёмная — по умолчанию.
- Не больше двух фонов подряд одинаковых.
