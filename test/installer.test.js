import assert from "node:assert/strict";
import test from "node:test";
import { addPathEntry, getInstallPaths, removePathEntry } from "../src/installer.js";

test("addPathEntry prepends a missing entry", () => {
  assert.equal(addPathEntry("C:\\Windows;C:\\Tools", "C:\\UF0RS AI", "win32"), "C:\\UF0RS AI;C:\\Windows;C:\\Tools");
});

test("addPathEntry keeps the original value for a duplicate with different case", () => {
  const current = "c:\\uf0rs ai\\;C:\\Windows";
  assert.equal(addPathEntry(current, "C:\\UF0RS AI", "win32"), current);
});

test("removePathEntry drops only the matching entry", () => {
  assert.equal(
    removePathEntry("C:\\UF0RS AI;C:\\Windows;C:\\UF0RS AI\\", "c:\\uf0rs ai", "win32"),
    "C:\\Windows",
  );
});

test("getInstallPaths keeps the executable and launcher next to each other on Windows", () => {
  const paths = getInstallPaths("win32", { LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local" });
  assert.equal(paths.binDir, "C:\\Users\\test\\AppData\\Local\\Programs\\UF0RS AI");
  assert.equal(paths.executable, "C:\\Users\\test\\AppData\\Local\\Programs\\UF0RS AI\\uf0rs.exe");
  assert.equal(paths.launcher, "C:\\Users\\test\\AppData\\Local\\Programs\\UF0RS AI\\uf0rs.cmd");
});
