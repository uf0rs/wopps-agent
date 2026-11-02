import assert from "node:assert/strict";
import test from "node:test";
import { addPathEntry, getInstallPaths, removePathEntry } from "../src/installer.js";

test("addPathEntry prepends a missing entry", () => {
  assert.equal(addPathEntry("C:\\Windows;C:\\Tools", "C:\\UF0RS AGENT", "win32"), "C:\\UF0RS AGENT;C:\\Windows;C:\\Tools");
});

test("addPathEntry keeps the original value for a duplicate with different case", () => {
  const current = "c:\\uf0rs agent\\;C:\\Windows";
  assert.equal(addPathEntry(current, "C:\\UF0RS AGENT", "win32"), current);
});

test("removePathEntry drops only the matching entry", () => {
  assert.equal(
    removePathEntry("C:\\UF0RS AGENT;C:\\Windows;C:\\UF0RS AGENT\\", "c:\\uf0rs agent", "win32"),
    "C:\\Windows",
  );
});

test("getInstallPaths keeps the executable and launcher next to each other on Windows", () => {
  const paths = getInstallPaths("win32", { LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local" });
  assert.equal(paths.binDir, "C:\\Users\\test\\AppData\\Local\\Programs\\UF0RS AGENT");
  assert.equal(paths.executable, "C:\\Users\\test\\AppData\\Local\\Programs\\UF0RS AGENT\\uf0rs.exe");
  assert.equal(paths.launcher, "C:\\Users\\test\\AppData\\Local\\Programs\\UF0RS AGENT\\uf0rs.cmd");
});
