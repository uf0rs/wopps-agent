# montage/

Кит WOPPS Montage: движок, CLI, python-аудио, команда `/montage`, агент и скиллы.

```
montage/
├─ bin/montage.mjs        CLI (setup, init, build, qa, poster, studio)
├─ bin/lib/               ffmpeg, таймлайн, утилиты
├─ engine/                Remotion-движок: 12 типов сцен, шрифты, фон
├─ python/                voice.py, music.py, sfx.py, mix.py
├─ config/                command/, agent/, skill/ — ставится в ~/.config/uf0rs
└─ install.mjs            установка в глобальный конфиг WOPPS
```

Полная документация — [../docs/MONTAGE.md](../docs/MONTAGE.md).

Быстрый старт:

```powershell
node montage/install.mjs
node "$HOME/.config/uf0rs/montage/bin/montage.mjs" setup
```

Дальше — новая сессия WOPPS и `/montage`.
