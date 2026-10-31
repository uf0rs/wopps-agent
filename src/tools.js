import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const ignored = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", ".next"]);
const maxFileBytes = 250_000;

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "Use this internal file tool to list project files; do not use shell commands such as ls, dir, or find for file inspection. Hidden dependency/build directories are skipped.",
      parameters: { type: "object", properties: { path: { type: "string", description: "Relative directory, default ." } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Use this internal file tool to read a project file; do not use cat, type, or Get-Content for file inspection.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Use this internal file tool to create or edit a project file; do not use shell redirection or scripting to write files. Existing contents will be overwritten.",
      parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description: "Use this internal file tool to search project files; do not use grep, rg, Select-String, or findstr for project text search.",
      parameters: { type: "object", properties: { query: { type: "string" }, path: { type: "string", description: "Optional relative directory" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run tests, builds, or other commands in the selected project. Use internal file tools for listing, reading, searching, writing, or deleting files. Commands require user approval and must use the active shell syntax provided in the system instructions.",
      parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file in the project. Requires explicit user confirmation.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
];

export const pcToolDefinitions = [
  {
    type: "function",
    function: {
      name: "pc_list_files",
      description: "List entries in a folder anywhere on this computer. Use an absolute path or a path relative to the user's home folder.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "pc_read_file",
      description: "Read a text file anywhere on this computer. Ask before reading files that may contain credentials or secrets.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "pc_search_files",
      description: "Search text in files under a user-selected folder anywhere on this computer. Avoid credential and system folders.",
      parameters: { type: "object", properties: { query: { type: "string" }, path: { type: "string" } }, required: ["query", "path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "pc_write_file",
      description: "Create or edit a text file anywhere on this computer. Replacing an existing file requires approval.",
      parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
    },
  },
  {
    type: "function",
    function: {
      name: "pc_delete_file",
      description: "Permanently delete one file anywhere on this computer. Always requires approval; directories cannot be deleted.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "pc_run_command",
      description: "Run a system command using the detected shell. Ordinary commands do not require approval; potentially destructive commands and shutdown/restart require confirmation.",
      parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
    },
  },
  {
    type: "function",
    function: {
      name: "pc_open",
      description: "Open an http/https website, an existing file or folder, or launch an installed application by executable name.",
      parameters: { type: "object", properties: { target: { type: "string" } }, required: ["target"] },
    },
  },
  {
    type: "function",
    function: {
      name: "pc_close_app",
      description: "Close an application normally by application name or window title. Does not force-kill the process and does not require confirmation.",
      parameters: { type: "object", properties: { application: { type: "string" } }, required: ["application"] },
    },
  },
  {
    type: "function",
    function: {
      name: "pc_active_window",
      description: "Get the title or application name of the currently focused window before typing or clicking.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "pc_desktop",
      description: "Control the active desktop: type text, send a keyboard shortcut, or click screen coordinates. Clicks and high-impact shortcuts require approval.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["type_text", "hotkey", "click"] },
          text: { type: "string", description: "Text to type, maximum 2000 characters." },
          keys: { type: "string", description: "Shortcut such as CTRL+L or ALT+F4." },
          x: { type: "integer", description: "Horizontal screen coordinate." },
          y: { type: "integer", description: "Vertical screen coordinate." },
          button: { type: "string", enum: ["left", "right", "double"] },
        },
        required: ["action"],
      },
    },
  },
];

export function resolveProjectPath(project, relativePath = ".") {
  if (path.isAbsolute(relativePath)) throw new Error("Only project-relative paths are allowed.");
  const root = path.resolve(project);
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("That path is outside the selected project.");
  }
  return target;
}

export function detectShell(env = process.env, platform = process.platform) {
  if (platform === "win32") {
    if (env.PSModulePath || env.PSExecutionPolicyPreference || env.POWERSHELL_DISTRIBUTION_CHANNEL) {
      return { name: "PowerShell", executable: env.UF0RS_POWERSHELL || "powershell.exe", args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command"] };
    }
    return { name: "CMD", executable: env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c"] };
  }
  const shellName = path.basename(env.SHELL || "");
  if (shellName === "pwsh" || shellName === "powershell") {
    return { name: "PowerShell", executable: env.SHELL, args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command"] };
  }
  return { name: "Bash", executable: env.BASH || "/bin/bash", args: ["-lc"] };
}

async function assertProjectPath(project, target, allowMissing = false) {
  const root = await fs.realpath(project);
  let check = target;
  while (true) {
    try {
      check = await fs.realpath(check);
      break;
    } catch (error) {
      if (!allowMissing || error.code !== "ENOENT") throw error;
      const parent = path.dirname(check);
      if (parent === check) throw error;
      check = parent;
    }
  }
  if (check !== root && !check.startsWith(`${root}${path.sep}`)) {
    throw new Error("That path resolves outside the selected project.");
  }
  return target;
}

async function walk(dir, project, results, limit = 300) {
  if (results.length >= limit) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name) || entry.name.startsWith(".uf0rs")) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(absolute, project, results, limit);
    else if (entry.isFile()) results.push(path.relative(project, absolute));
    if (results.length >= limit) return;
  }
}

async function searchFiles(project, query, relativePath = ".") {
  const start = resolveProjectPath(project, relativePath);
  await assertProjectPath(project, start);
  const files = [];
  await walk(start, project, files);
  const matches = [];
  for (const relative of files) {
    try {
      const full = resolveProjectPath(project, relative);
      const stat = await fs.stat(full);
      if (stat.size > maxFileBytes) continue;
      const text = await fs.readFile(full, "utf8");
      if (text.includes("\0")) continue;
      text.split(/\r?\n/).forEach((line, index) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
          matches.push(`${relative}:${index + 1}: ${line.slice(0, 300)}`);
        }
      });
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "EISDIR") throw error;
    }
    if (matches.length >= 100) break;
  }
  return matches.join("\n") || "No matches found.";
}

const pcSearchIgnored = new Set([
  ...ignored,
  ".ssh",
  ".aws",
  ".azure",
  ".gnupg",
  "node_modules",
  "windows",
  "program files",
  "program files (x86)",
]);
const sensitiveNames = /(?:^\.env(?:\.|$)|credentials?|password|tokens?|secrets?|api[_-]?key|id_rsa|id_ed25519|private[_-]?key|cookies?|login data)/i;

function resolvePcPath(inputPath) {
  if (typeof inputPath !== "string" || !inputPath.trim()) throw new Error("A file or folder path is required.");
  return path.resolve(os.homedir(), inputPath.trim());
}

async function resolveExistingPath(target) {
  let check = target;
  while (true) {
    try {
      const actual = await fs.realpath(check);
      return path.join(actual, path.relative(check, target));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = path.dirname(check);
      if (parent === check) throw error;
      check = parent;
    }
  }
}

function isSensitivePath(target) {
  return target.split(/[\\/]+/).some((part) => sensitiveNames.test(part) || [".ssh", ".aws", ".azure", ".gnupg"].includes(part.toLowerCase()));
}

function isProtectedSystemPath(target) {
  const normalized = path.resolve(target).toLowerCase();
  return process.platform === "win32"
    ? /(?:^|\\)(?:windows|program files(?: \(x86\))?|programdata)(?:\\|$)/.test(normalized)
    : /^(?:\/etc|\/usr|\/bin|\/sbin|\/boot|\/system|\/library|\/applications)(?:\/|$)/.test(normalized);
}

function isHighImpactFilePath(target) {
  const normalized = path.resolve(target).toLowerCase().replaceAll("/", "\\");
  return isProtectedSystemPath(target)
    || /(?:\\|^)(?:startup|autostart|launchagents|launchdaemons)(?:\\|$)/.test(normalized)
    || /(?:\\|^)(?:\.bashrc|\.zshrc|\.profile|powershell_profile\.ps1)$/.test(normalized);
}

async function pcListFiles(inputPath) {
  const directory = resolvePcPath(inputPath);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries.slice(0, 300)) {
    if (entry.isSymbolicLink()) continue;
    const target = path.join(directory, entry.name);
    const suffix = entry.isDirectory() ? path.sep : "";
    results.push(`${entry.name}${suffix}`);
  }
  return results.join("\n") || "(empty directory)";
}

async function pcSearchFiles(query, inputPath, confirm) {
  if (typeof query !== "string" || !query) throw new Error("A non-empty search query is required.");
  const root = await fs.realpath(resolvePcPath(inputPath));
  if (isSensitivePath(root) && !(await confirm(`Search a folder that may contain credentials: ${root}?`))) {
    return "User declined searching a sensitive folder.";
  }
  const files = [];
  async function visit(directory) {
    if (files.length >= 500) return;
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= 500) return;
      if (entry.isSymbolicLink() || pcSearchIgnored.has(entry.name.toLowerCase()) || isSensitivePath(entry.name)) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  await visit(root);
  const matches = [];
  for (const target of files) {
    try {
      const stat = await fs.stat(target);
      if (stat.size > maxFileBytes) continue;
      const text = await fs.readFile(target, "utf8");
      if (text.includes("\0")) continue;
      text.split(/\r?\n/).forEach((line, index) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
          matches.push(`${path.relative(root, target)}:${index + 1}: ${line.slice(0, 300)}`);
        }
      });
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "EISDIR" && error.code !== "EACCES" && error.code !== "EPERM") throw error;
    }
    if (matches.length >= 100) break;
  }
  return matches.join("\n") || "No matches found.";
}

function sendKeysLiteral(text) {
  const escaped = { "+": "{+}", "^": "{^}", "%": "{%}", "~": "{~}", "(": "{(}", ")": "{)}", "{": "{{}", "}": "{}}" };
  return text.replace(/\r\n|\r|\n|\t|[+^%~(){}]/g, (character) => {
    if (character === "\r\n" || character === "\r" || character === "\n") return "~";
    if (character === "\t") return "{TAB}";
    return escaped[character];
  });
}

function windowsDesktopScript(payload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  return `
$payload = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')) | ConvertFrom-Json
if ($payload.action -eq 'click') {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Uf0rsMouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
}
'@
  [Uf0rsMouse]::SetCursorPos([int]$payload.x, [int]$payload.y) | Out-Null
  $down = if ($payload.button -eq 'right') { 0x0008 } else { 0x0002 }
  $up = if ($payload.button -eq 'right') { 0x0010 } else { 0x0004 }
  [Uf0rsMouse]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero)
  [Uf0rsMouse]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero)
  if ($payload.button -eq 'double') {
    Start-Sleep -Milliseconds 80
    [Uf0rsMouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
    [Uf0rsMouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  }
} else {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.SendKeys]::SendWait([string]$payload.keys)
}
`;
}

function runPowerShellScript(script) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(`$ProgressPreference = 'SilentlyContinue'\n${script}`, "utf16le").toString("base64");
    const child = spawn(process.env.UF0RS_POWERSHELL || "powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], {
      windowsHide: true,
      env: process.env,
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) reject(new Error(output.trim() || `PowerShell exited with code ${code}.`));
      else resolve(output.trim() || "Desktop action completed.");
    });
  });
}

async function runDesktopAction(args, confirm) {
  const { action } = args;
  let payload;
  if (action === "type_text") {
    if (typeof args.text !== "string" || args.text.length > 2000) throw new Error("Text must be a string of at most 2000 characters.");
    payload = { action, keys: sendKeysLiteral(args.text) };
  } else if (action === "hotkey") {
    if (typeof args.keys !== "string" || !/^(?:CTRL|ALT|SHIFT)(?:\+(?:CTRL|ALT|SHIFT))*\+(?:[A-Z0-9]|F(?:[1-9]|1[0-2])|ENTER|RETURN|TAB|ESC|SPACE|DELETE|BACKSPACE|HOME|END|PGUP|PGDN|UP|DOWN|LEFT|RIGHT)$/i.test(args.keys)) {
      throw new Error("Unsupported shortcut. Use keys such as CTRL+L, ALT+TAB, or CTRL+SHIFT+S.");
    }
    const parts = args.keys.toUpperCase().split("+");
    const key = parts.pop();
    const modifiers = { CTRL: "^", ALT: "%", SHIFT: "+" };
    const sendKey = /^[A-Z0-9]$/.test(key) ? key.toLowerCase() : `{${key === "RETURN" ? "ENTER" : key}}`;
    payload = { action, keys: `${parts.map((modifier) => modifiers[modifier]).join("")}${sendKey}` };
    if (["ENTER", "RETURN", "DELETE", "BACKSPACE"].includes(key) || args.keys.toUpperCase() === "ALT+F4") {
      if (!(await confirm(`Send high-impact keyboard shortcut ${args.keys}?`))) return "User declined the desktop keyboard action.";
    }
  } else if (action === "click") {
    if (!Number.isInteger(args.x) || !Number.isInteger(args.y) || args.x < 0 || args.y < 0 || args.x > 20000 || args.y > 20000) {
      throw new Error("Click coordinates must be integers between 0 and 20000.");
    }
    const button = ["left", "right", "double"].includes(args.button) ? args.button : "left";
    if (!(await confirm(`Click the ${button} mouse button at screen position ${args.x}, ${args.y}?`))) {
      return "User declined the desktop mouse action.";
    }
    payload = { action, x: args.x, y: args.y, button };
  } else {
    throw new Error("Unknown desktop action.");
  }

  if (process.platform === "win32") return await runPowerShellScript(windowsDesktopScript(payload));
  if (process.platform === "linux") {
    const executable = "xdotool";
    if (action === "click") {
      const button = args.button === "right" ? "3" : "1";
      const clickArgs = args.button === "double"
        ? ["click", "--repeat", "2", "--delay", "80", button]
        : ["click", button];
      await runDirect(executable, ["mousemove", String(args.x), String(args.y)]);
      return await runDirect(executable, clickArgs);
    }
    const argv = action === "type_text"
      ? ["type", "--clearmodifiers", "--", args.text]
      : ["key", args.keys.toLowerCase()];
    return await runDirect(executable, argv);
  }
  if (process.platform === "darwin") {
    if (action === "click") {
      const clickType = { left: "c", right: "rc", double: "dc" }[args.button] || "c";
      return await runDirect("cliclick", [`${clickType}:${args.x},${args.y}`]);
    }
    const escapeAppleScript = (text) => text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    let script;
    if (action === "type_text") {
      const lines = args.text.split(/\r?\n/);
      const actions = lines.flatMap((line, index) => [
        ...(line ? [`keystroke "${escapeAppleScript(line)}"`] : []),
        ...(index < lines.length - 1 ? ["key code 36"] : []),
      ]);
      script = `tell application "System Events"\n${actions.join("\n")}\nend tell`;
    } else {
      const parts = args.keys.toUpperCase().split("+");
      const key = parts.pop();
      const modifiers = parts.map((modifier) => ({ CTRL: "control down", ALT: "option down", SHIFT: "shift down" })[modifier]);
      const keyNames = { ENTER: "return", RETURN: "return", ESC: "escape", TAB: "tab", SPACE: "space", BACKSPACE: "delete", DELETE: "forward delete" };
      const keyCodes = { LEFT: 123, RIGHT: 124, DOWN: 125, UP: 126, F1: 122, F2: 120, F3: 99, F4: 118, F5: 96, F6: 97, F7: 98, F8: 100, F9: 101, F10: 109, F11: 103, F12: 111 };
      const using = modifiers.length ? ` using {${modifiers.join(", ")}}` : "";
      script = keyCodes[key]
        ? `tell application "System Events" to key code ${keyCodes[key]}${using}`
        : `tell application "System Events" to keystroke "${keyNames[key] || key.toLowerCase()}"${using}`;
    }
    return await runDirect("osascript", ["-e", script]);
  }
  throw new Error(`Desktop control is not supported on ${process.platform}.`);
}

async function getActiveWindow() {
  if (process.platform === "win32") {
    return await runPowerShellScript(`
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Uf0rsWindow {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
'@
$window = [Uf0rsWindow]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 1024
[void][Uf0rsWindow]::GetWindowText($window, $title, $title.Capacity)
if ($title.Length -gt 0) { $title.ToString() } else { "No focused window title is available." }
`);
  }
  if (process.platform === "linux") return await runDirect("xdotool", ["getwindowfocus", "getwindowname"]);
  if (process.platform === "darwin") {
    return await runDirect("osascript", ["-e", 'tell application "System Events" to get name of first application process whose frontmost is true']);
  }
  throw new Error(`Active-window detection is not supported on ${process.platform}.`);
}

function runDirect(executable, args, { allowedExitCodes = [] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, env: process.env });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.once("error", (error) => reject(new Error(`Could not run ${executable}: ${error.message}`)));
    child.once("close", (code) => {
      if (code !== 0 && !allowedExitCodes.includes(code)) reject(new Error(output.trim() || `${executable} exited with code ${code}.`));
      else resolve(output.trim() || "Desktop action completed.");
    });
  });
}

export function buildWindowsOpenScript(target) {
  const encoded = Buffer.from(target, "utf8").toString("base64");
  return `$target = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}'))\nStart-Process -FilePath $target`;
}

function closeAppTargets(application) {
  const normalized = application.trim().toLowerCase();
  const aliases = {
    browser: ["chrome", "msedge", "firefox", "brave", "opera"],
    "web browser": ["chrome", "msedge", "firefox", "brave", "opera"],
    браузер: ["chrome", "msedge", "firefox", "brave", "opera"],
    "веб-браузер": ["chrome", "msedge", "firefox", "brave", "opera"],
    chrome: ["chrome"],
    "google chrome": ["chrome"],
    edge: ["msedge"],
    "microsoft edge": ["msedge"],
    firefox: ["firefox"],
    discord: ["discord"],
    дискорд: ["discord"],
  };
  return { application: application.trim(), processNames: aliases[normalized] || [normalized.replace(/\.exe$/, "")] };
}

export function buildWindowsCloseAppScript(application) {
  const payload = Buffer.from(JSON.stringify(closeAppTargets(application)), "utf8").toString("base64");
  return `
$payload = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json
$processNames = @($payload.processNames | ForEach-Object { $_.ToLowerInvariant() })
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Uf0rsCloseWindow {
  [DllImport("user32.dll", SetLastError=true)] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
'@
$windows = @(Get-Process | Where-Object {
  $_.MainWindowHandle -ne [IntPtr]::Zero -and (
    $processNames -contains $_.ProcessName.ToLowerInvariant() -or
    $_.MainWindowTitle.IndexOf([string]$payload.application, [StringComparison]::OrdinalIgnoreCase) -ge 0
  )
})
foreach ($window in $windows) {
  [void][Uf0rsCloseWindow]::PostMessage($window.MainWindowHandle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
}
if ($windows.Count -eq 0) { "No open application window found matching '$($payload.application)'." }
else { "Requested graceful close for $($windows.Count) window(s) matching '$($payload.application)'." }
`;
}

async function closeApplication(application) {
  if (typeof application !== "string" || !application.trim() || application.length > 100) {
    throw new Error("An application name or window title of at most 100 characters is required.");
  }
  const target = application.trim();
  if (process.platform === "win32") return await runPowerShellScript(buildWindowsCloseAppScript(target));
  if (process.platform === "linux") {
    const windows = new Set();
    const { processNames } = closeAppTargets(target);
    for (const processName of processNames) {
      const output = await runDirect("xdotool", ["search", "--onlyvisible", "--class", processName], { allowedExitCodes: [1] });
      for (const window of output.split(/\r?\n/).filter((value) => /^\d+$/.test(value))) windows.add(window);
    }
    const titleMatches = await runDirect("xdotool", ["search", "--onlyvisible", "--name", target], { allowedExitCodes: [1] });
    for (const window of titleMatches.split(/\r?\n/).filter((value) => /^\d+$/.test(value))) windows.add(window);
    if (!windows.size) return `No open application window found matching '${target}'.`;
    for (const window of windows) await runDirect("xdotool", ["windowclose", window]);
    return `Requested graceful close for ${windows.length} window(s) matching '${target}'.`;
  }
  if (process.platform === "darwin") {
    const appNamesByProcess = {
      chrome: "Google Chrome",
      msedge: "Microsoft Edge",
      firefox: "Firefox",
      brave: "Brave Browser",
      opera: "Opera",
      discord: "Discord",
    };
    const { processNames } = closeAppTargets(target);
    const appNames = [...new Set(processNames.map((name) => appNamesByProcess[name]).filter(Boolean))];
    if (!appNames.length) appNames.push(target);
    const escapeAppleScript = (value) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const script = `set appNames to {${appNames.map((name) => `"${escapeAppleScript(name)}"`).join(", ")}}\ntell application "System Events" to set runningApps to name of every application process whose background only is false\nset didClose to false\nrepeat with appName in appNames\n  if runningApps contains (contents of appName) then\n    tell application (contents of appName) to quit\n    set didClose to true\n  end if\nend repeat\nif didClose then return "Requested graceful close."\nreturn "No open application window was found."`;
    return await runDirect("osascript", ["-e", script]);
  }
  throw new Error(`Closing applications is not supported on ${process.platform}.`);
}

async function openTarget(target, launchExecutable = false) {
  const defaultBrowser = ["browser", "default-browser"].includes(target.toLowerCase());
  const isUrl = /^https?:\/\//i.test(target);
  if (process.platform === "win32" && !launchExecutable && (defaultBrowser || isUrl)) {
    const url = defaultBrowser ? "https://www.google.com" : target;
    await runPowerShellScript(buildWindowsOpenScript(url));
    return `Opened ${target}.`;
  }
  const isLocation = !launchExecutable && (isUrl || path.isAbsolute(target));
  const executable = isLocation
    ? process.platform === "win32" ? "explorer.exe" : process.platform === "darwin" ? "open" : "xdg-open"
    : defaultBrowser
      ? process.platform === "darwin" ? "open" : "xdg-open"
      : target;
  const args = isLocation
    ? [target]
    : defaultBrowser
      ? ["https://www.google.com"]
      : [];
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { detached: true, stdio: "ignore", windowsHide: true, env: process.env });
    child.once("error", (error) => reject(new Error(`Could not open "${target}": ${error.message}`)));
    child.once("spawn", () => {
      child.unref();
      resolve(`Opened ${target}.`);
    });
  });
}

async function executePcTool(name, args, confirm, notify, shell) {
  if (name === "pc_list_files") return await pcListFiles(args.path);
  if (name === "pc_search_files") return await pcSearchFiles(args.query, args.path, confirm);
  if (name === "pc_read_file") {
    const target = resolvePcPath(args.path);
    const actualTarget = await fs.realpath(target);
    if ((isSensitivePath(target) || isSensitivePath(actualTarget)) && !(await confirm(`Read a file that may contain credentials or secrets: ${actualTarget}?`))) {
      return "User declined reading a sensitive file.";
    }
    const stat = await fs.stat(actualTarget);
    if (!stat.isFile()) throw new Error("Path is not a file.");
    if (stat.size > maxFileBytes) throw new Error("File is too large to read (limit: 250 KB).");
    const contents = await fs.readFile(actualTarget, "utf8");
    if (contents.includes("\0")) throw new Error("Binary files cannot be read as text.");
    return contents;
  }
  if (name === "pc_write_file") {
    if (typeof args.content !== "string" || Buffer.byteLength(args.content) > maxFileBytes) throw new Error("Text content must be at most 250 KB.");
    const target = resolvePcPath(args.path);
    const linkStat = await fs.lstat(target).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (linkStat?.isSymbolicLink()) throw new Error("Writing through a symbolic link is not supported.");
    const actualTarget = await resolveExistingPath(target);
    const existing = await fs.stat(actualTarget).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    const approvalNeeded = existing || isSensitivePath(target) || isSensitivePath(actualTarget) || isHighImpactFilePath(actualTarget);
    if (approvalNeeded && !(await confirm(`${existing ? "Replace" : "Write to protected path"} ${target}?`))) {
      return `User declined writing ${target}.`;
    }
    await fs.mkdir(path.dirname(actualTarget), { recursive: true });
    await fs.writeFile(actualTarget, args.content, "utf8");
    notify(`Wrote ${actualTarget}`);
    return `Wrote ${actualTarget} (${Buffer.byteLength(args.content)} bytes).`;
  }
  if (name === "pc_delete_file") {
    const target = resolvePcPath(args.path);
    const stat = await fs.lstat(target);
    if (!stat.isFile()) throw new Error("Only individual files can be deleted.");
    if (!(await confirm(`PERMANENTLY DELETE ${target}?`))) return `User declined deleting ${target}.`;
    await fs.unlink(target);
    notify(`Deleted ${target}`);
    return `Deleted ${target}.`;
  }
  if (name === "pc_run_command") {
    if (typeof args.command !== "string" || !args.command.trim()) throw new Error("A command is required.");
    if (isDangerous(args.command) && !(await confirm(`Potentially destructive command — run in ${os.homedir()}: ${args.command}?`))) {
      return "User declined to run the system command.";
    }
    notify(`Running in ${shell.name}: ${args.command}`);
    return await runShell(args.command, os.homedir(), notify, shell);
  }
  if (name === "pc_close_app") {
    notify(`Closing application: ${args.application}`);
    return await closeApplication(args.application);
  }
  if (name === "pc_open") {
    if (typeof args.target !== "string" || !args.target.trim()) throw new Error("An application, file, folder, or website is required.");
    const target = args.target.trim();
    if (!/^https?:\/\//i.test(target) && !path.isAbsolute(target) && !/^[\w.-]+(?:\.exe)?$/i.test(target)) {
      throw new Error("Use an http/https URL, an absolute file path, or a simple installed application name.");
    }
    const isExecutablePath = path.isAbsolute(target) && /\.(?:exe|bat|cmd|ps1|sh|app)$/i.test(target);
    if (isExecutablePath) {
      if (!(await confirm(`Launch application ${target}?`))) return `User declined opening ${target}.`;
    }
    return await openTarget(target, isExecutablePath);
  }
  if (name === "pc_active_window") return await getActiveWindow();
  if (name === "pc_desktop") return await runDesktopAction(args, confirm);
  throw new Error(`Unknown PC tool: ${name}`);
}

function isDangerous(command) {
  return /(?:\brm\b|\brmdir\b|\bdel\b|\berase\b|\bformat(?:\.com)?\s+(?:[a-z]:|\/[a-z])|\bFormat-(?:Volume|Disk)\b|\bmkfs\b|\bdiskpart\b|\bshutdown\b|\breboot\b|\bpoweroff\b|\bStop-Computer\b|\bRestart-Computer\b|\bsystemctl\s+(?:poweroff|reboot|halt)\b|\breg\s+(?:delete|add)\b|\bRemove-Item\b|\b(?:sudo|su)\b|>\s*\/dev\/|:\(\)\s*\{)/i.test(command);
}

function runShell(command, cwd, onOutput, shell = detectShell()) {
  return new Promise((resolve, reject) => {
    const child = spawn(shell.executable, [...shell.args, command], { cwd, windowsHide: true, env: process.env });
    let output = "";
    let timedOut = false;
    const append = (chunk, stderr = false) => {
      const text = chunk.toString();
      output += text;
      onOutput({ type: "output", text, stderr });
      if (output.length > 40_000) output = `${output.slice(0, 40_000)}\n[output truncated]`;
    };
    child.stdout.on("data", (chunk) => append(chunk));
    child.stderr.on("data", (chunk) => append(chunk, true));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 120_000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve(`${timedOut ? "Command timed out after 120 seconds." : `Exit code: ${code}`}\n${output || "(no output)"}`);
    });
  });
}

export async function executeTool(name, args, project, confirm, notify, { shell = detectShell(), mode = "project" } = {}) {
  try {
    if (mode === "pc" && name.startsWith("pc_")) return await executePcTool(name, args, confirm, notify, shell);
    if (name === "list_files") {
      const start = resolveProjectPath(project, args.path || ".");
      await assertProjectPath(project, start);
      const results = [];
      await walk(start, project, results);
      return results.join("\n") || "(empty directory)";
    }
    if (name === "read_file") {
      const target = resolveProjectPath(project, args.path);
      await assertProjectPath(project, target);
      const stat = await fs.stat(target);
      if (!stat.isFile()) throw new Error("Path is not a file.");
      if (stat.size > maxFileBytes) throw new Error("File is too large to read (limit: 250 KB).");
      const contents = await fs.readFile(target, "utf8");
      if (contents.includes("\0")) throw new Error("Binary files cannot be read as text.");
      return contents;
    }
    if (name === "write_file") {
      const target = resolveProjectPath(project, args.path);
      await assertProjectPath(project, target, true);
      const existing = await fs.stat(target).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (existing && !(await confirm(`Replace ${path.relative(project, target)}?`))) {
        return "User declined overwriting the file.";
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, args.content, "utf8");
      notify(`Wrote ${path.relative(project, target)}`);
      return `Wrote ${path.relative(project, target)} (${Buffer.byteLength(args.content)} bytes).`;
    }
    if (name === "search_files") return await searchFiles(project, args.query, args.path || ".");
    if (name === "run_command") {
      const dangerous = isDangerous(args.command);
      if (!(await confirm(`${dangerous ? "DANGEROUS COMMAND — " : ""}Run in project: ${args.command}?`))) {
        return "User declined to run the command.";
      }
      notify(`Running in ${shell.name}: ${args.command}`);
      return await runShell(args.command, project, notify, shell);
    }
    if (name === "delete_file") {
      const target = resolveProjectPath(project, args.path);
      await assertProjectPath(project, target);
      const stat = await fs.lstat(target);
      if (!stat.isFile()) throw new Error("Only individual files can be deleted.");
      if (!(await confirm(`PERMANENTLY DELETE ${path.relative(project, target)}?`))) {
        return "User declined deleting the file.";
      }
      await fs.unlink(target);
      notify(`Deleted ${path.relative(project, target)}`);
      return `Deleted ${path.relative(project, target)}.`;
    }
    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return `Tool error: ${error.message}`;
  }
}
