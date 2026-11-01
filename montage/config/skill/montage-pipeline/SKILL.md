---
name: montage-pipeline
description: CLI и файлы WOPPS Montage — сборка, кэш, скорость, диагностика
---

# Пайплайн и скорость

## Один раз на машину

```
node "$HOME/.config/uf0rs/montage/bin/montage.mjs" setup
node "$HOME/.config/uf0rs/montage/bin/montage.mjs" doctor
```

`setup` ставит Remotion + `ffmpeg-static`/`ffprobe-static` в `~/.cache/uf0rs/montage/engine`,
скачивает headless-браузер Remotion и проверяет `numpy`/`edge-tts`. Второй раз не нужен.

## Проект

```
montage/<slug>/
├─ brief.json          ← вход: тема, формат, голос, музыка, бренд
├─ scenes.json         ← вход: раскадровка (правишь только его)
├─ assets/             ← скриншоты, логотип, изображения
├─ project.json        ← производный input-props для Remotion
├─ timeline.json       ← производный единый таймлайн (кадры, реплики, субтитры)
├─ subtitles.srt       ← производный
├─ .montage/           ← кэш: vo/, vo_wav/, cache/score.wav, cache/mix.wav, state.json
└─ out/                ← draft.mp4, final.mp4, video-*.mp4, render-*/part-*.mp4, qa.json
```

Меняешь только `brief.json`, `scenes.json`, `assets/`. Остальное — руки прочь.

## Команды

```
montage init <dir> [--brief file | --title … --seconds … --aspect … --lang …]
montage plan <dir>
montage build <dir> --profile draft|final [--no-voice] [--no-music] [--segments N] [--force]
montage status <dir>
montage qa <dir>
montage studio <dir>
montage clean <dir> [--all] [--video]
```

## Что происходит на build

1. **Голос.** Реплики из `vo` → `edge-tts` (5 параллельно) → mp3 в `.montage/vo`.
2. **Тайминг.** `ffprobe` по каждому mp3 → длительности → `timeline.json` + `subtitles.srt`.
   Сцена длится: `0.26 с` вход + сумма реплик + хвост по типу.
3. **Музыка.** numpy-партитура под сцены (кэш `cache/score.wav`).
4. **SFX.** Пак 17 эффектов, генерируется один раз.
5. **Микс.** Голос + дакинг + SFX + мастер → `cache/mix.wav`.
6. **Ассеты.** Скриншоты и микс копируются в `engine/public/projects/<slug>/`.
7. **Рендер.** Кадры делятся на N кусков, каждый — отдельный процесс Remotion, потом `ffmpeg concat`.
8. **Mux.** AAC 256k + `+faststart` → `out/draft.mp4` / `out/final.mp4`.
9. **QA.** Быстрая проверка громкости; полная — командой `qa`.

## Почему быстро

- **Кэш по контент-хешам.** Не менял текст — голос не пересинтезируется. Не менял тайминг и звук — микс
  берётся готовым. Не менял props/движок — видео не рендерится.
- **Черновик 0.5×, crf 30.** Ритм и текст ловятся в 4–6 раз быстрее финала.
- **Параллельные куски.** 2 куска для draft, 3 для final (`--segments`), concurrency = потоки/куски.
- **Один npm-проект на машину.** `node_modules` не копируются в каждый ролик.
- **jpeg-кадры** и `--x264-preset veryfast` для черновика.

Ориентир на i5/16 потоков: 10-минутный ролик — черновик ≈ 4–8 мин, финал ≈ 12–20 мин
(первый прогон дольше из-за браузера и партитуры).

## Диагностика

| Симптом | Что делать |
|---|---|
| `движок монтажа не установлен` | `montage setup` |
| `ffmpeg не найден` | `montage setup` или `MONTAGE_FFMPEG`/`MONTAGE_FFPROBE` |
| `edge-tts is not installed` | `python -m pip install edge-tts` |
| музыка не создалась | `python -m pip install numpy`, либо `--no-music` |
| рендер падает на шрифтах | удалить `~/.cache/uf0rs/montage/engine/public/projects` не нужно; проверить `public/fonts` |
| первый рендер долгий | Remotion качает headless-браузер (~150 МБ) один раз |
| рендер упал посередине | повторить `build` без `--force`: куски пересоберутся, готовые стадии из кэша |
| текст обрезан | короче заголовок; для 9:16 — ≤ 6 слов |
| два билда одного проекта | не запускать параллельно: они делят `.montage/state.json` |

Дебаг: `MONTAGE_DEBUG=1` (PowerShell: `$env:MONTAGE_DEBUG=1`) — покажет JSON скриптов и verbose-лог Remotion.
