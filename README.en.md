# WOPPS

[Русская версия](README.md)

![WOPPS cover — a terminal AI companion with its neon bunny mascot](docs/uf0rs-cover.svg)

**WOPPS** is the terminal and desktop AI companion from UF0RS STUDIO. It opens a selected project and provides an interactive TUI for chatting with a model, reviewing its actions, inspecting file changes, and reading command output. The interface has a dark forest theme, an original ASCII bunny, a slash-command palette, and keyboard and mouse controls. Choose Russian, English, or French on first launch.

## Installation

### Windows

From PowerShell or CMD, open the source directory and run:

```text
install.cmd
```

The installer builds a standalone `uf0rs.exe`, installs it under `%LOCALAPPDATA%\Programs\UF0RS AI`, and adds that directory to the user `PATH`. Open a new terminal after installation. Launching the native executable is not blocked by PowerShell's execution policy.

Without Node.js: download `uf0rs.exe` and `uf0rs-install.cmd` from [Releases](https://github.com/uf0rs/wopps-ai/releases/latest), put both in one folder, and run `uf0rs-install.cmd`. The script copies the executable to `%LOCALAPPDATA%\Programs\UF0RS AI`, adds that directory to the user `PATH`, and verifies the result with `uf0rs doctor`. If `uf0rs.exe` is not next to the script, it downloads the latest release with `curl.exe`. Afterwards `uf0rs` works in any new CMD, PowerShell, Windows Terminal, and Git Bash window; WSL needs the Linux package.

To install an already-built executable:

```powershell
.\dist\uf0rs.exe install --source-dir .
```

### Linux and macOS

From the source directory:

```sh
chmod +x ./install.sh
./install.sh
```

The installer places WOPPS in `~/.local/bin` and adds that directory to supported shell startup files. Open a new terminal to pick up the updated `PATH`.

### Build from source

Building requires Node.js 22+, npm, and network access. The build script obtains Bun 1.4.4 through npm and uses the frozen workspace lockfile.

```sh
npm install
npm run build:cli
```

The standalone binary is written to `dist/uf0rs.exe` on Windows or `dist/uf0rs` on Linux/macOS. The integrated TUI is checked with `bun run typecheck` from `uf0rs-engine/packages/tui` and `uf0rs-engine/packages/cli`.

## Commands

```text
uf0rs [path]              Open a project path; defaults to the current directory
uf0rs .                   Open the current directory
uf0rs --resume            Continue the latest session
uf0rs --auto              Start with automatic permission approval
uf0rs models              Configure a provider and model
uf0rs mcp                 Manage local MCP servers
uf0rs --help              Show help
uf0rs --version           Print the version
uf0rs doctor              Diagnose the installation and PATH
In the TUI: /language     Choose the interface language
uf0rs update              Update UF0RS
uf0rs uninstall           Uninstall UF0RS
```

Type `/` in the TUI to open the slash-command palette. Search and select commands with the keyboard or mouse. `/auto_mod` toggles permission prompts for the current run; `/auto_mod on` and `/auto_mod off` set the mode explicitly. `/auto_mode` remains an alias. Automatic approval skips permission prompts for model actions, so enable it only when you trust the requests and selected model.

## Projects and computer tools

WOPPS can inspect project structure, search and read files, propose and apply edits, show diffs, run commands, and execute tests. Computer-control tools are exposed through a local UF0RS STUDIO MCP bridge. Actions requiring permission ask first by default; WOPPS does not bypass operating-system permissions.

The model core supports providers including Ollama and OpenAI-compatible APIs. For `llama.cpp`, run `llama-server` separately and connect its OpenAI-compatible endpoint. UF0RS does not require an account or server from the source project; providers and MCP servers you choose may use their own external services.

After you connect OpenRouter, WOPPS refreshes the model list from OpenRouter's catalog. The picker keeps text models that support tool calls, which are required for project work and computer control. If OpenRouter was configured in an earlier WOPPS version, its settings and selected model are imported from `~/.uf0rs/config.json` on first launch.

Settings, state, and conversation history are stored locally under `~/.uf0rs` (Windows: `%USERPROFILE%\\.uf0rs`). Prompts, file contents, and command results are sent to the selected model when needed to answer.

The integrated TUI currently has English labels; Russian and French localization from the previous interface has not yet been ported.

## Third-party code

The local CLI/TUI engine is distributed under the MIT license. Its notice is preserved in [uf0rs-engine/LICENSE](uf0rs-engine/LICENSE).
