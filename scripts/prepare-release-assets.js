import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import packageJson from "../package.json" with { type: "json" };

const root = path.resolve(import.meta.dirname, "..");
const releaseRoot = path.join(root, "dist", "releases");
const assetRoot = path.join(root, "dist", "release-assets");
const version = packageJson.version;
const platforms = [
  { platform: "linux", arch: "x64", filename: "wopps-agent-linux-x64" },
  { platform: "linux", arch: "arm64", filename: "wopps-agent-linux-arm64" },
  { platform: "macos", arch: "x64", filename: "wopps-agent-macos-x64.tar.gz", archive: true },
  { platform: "macos", arch: "arm64", filename: "wopps-agent-macos-arm64.tar.gz", archive: true },
  { platform: "win", arch: "x64", filename: "uf0rs.exe", extension: ".exe" },
  { platform: "win", arch: "arm64", filename: "wopps-agent-win-arm64.exe", extension: ".exe" },
];

await fs.rm(assetRoot, { recursive: true, force: true });
await fs.mkdir(assetRoot, { recursive: true });
const checksums = {};

for (const target of platforms) {
  const source = path.join(releaseRoot, `${target.platform}-${target.arch}`, `uf0rs${target.extension || ""}`);
  const destination = path.join(assetRoot, target.filename);
  const sourceStat = await fs.stat(source);
  if (!sourceStat.isFile() || sourceStat.size === 0) throw new Error(`Release binary is missing or empty: ${source}`);
  if (target.archive) {
    execFileSync("tar", ["-czf", destination, "-C", path.dirname(source), path.basename(source)], { stdio: "inherit" });
  } else {
    await fs.copyFile(source, destination);
  }
  const bytes = await fs.readFile(destination);
  checksums[target.filename] = createHash("sha256").update(bytes).digest("hex");
}

await fs.copyFile(path.join(root, "install.sh"), path.join(assetRoot, "install.sh"));
await fs.copyFile(path.join(root, "uf0rs-install.cmd"), path.join(assetRoot, "uf0rs-install.cmd"));
const formula = `class WoppsAi < Formula
  desc "Friendly bilingual terminal agent by uf0rs / дружелюбный ИИ-помощник для терминала"
  homepage "https://github.com/uf0rs/wopps-agent"
  version "${version}"
  license :cannot_represent

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/uf0rs/wopps-agent/releases/download/v#{version}/wopps-agent-macos-arm64.tar.gz"
      sha256 "${checksums["wopps-agent-macos-arm64.tar.gz"]}"
    else
      url "https://github.com/uf0rs/wopps-agent/releases/download/v#{version}/wopps-agent-macos-x64.tar.gz"
      sha256 "${checksums["wopps-agent-macos-x64.tar.gz"]}"
    end
  end

  def install
    bin.install "uf0rs"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/uf0rs --version")
  end
end
`;
await fs.writeFile(path.join(assetRoot, "wopps-agent.rb"), formula);

const windowsUrl = `https://github.com/uf0rs/wopps-agent/releases/download/v${version}/uf0rs.exe`;
const windowsArmUrl = `https://github.com/uf0rs/wopps-agent/releases/download/v${version}/wopps-agent-win-arm64.exe`;
const wingetRoot = path.join(assetRoot, "winget");
await fs.mkdir(wingetRoot, { recursive: true });
const packageId = "UF0RS.WOPPSAGENT";
const manifestVersion = "1.10.0";
const common = `PackageIdentifier: ${packageId}\nPackageVersion: ${version}\n`;
const schemaHeader = (type) => `# yaml-language-server: $schema=https://aka.ms/winget-manifest.${type}.${manifestVersion}.schema.json\n`;
await fs.writeFile(path.join(wingetRoot, `${packageId}.yaml`), `${schemaHeader("version")}${common}DefaultLocale: en-US\nManifestType: version\nManifestVersion: ${manifestVersion}\n`);
await fs.writeFile(path.join(wingetRoot, `${packageId}.installer.yaml`), `${schemaHeader("installer")}${common}InstallerType: portable\nUpgradeBehavior: install\nCommands:\n  - uf0rs\nInstallers:\n  - Architecture: x64\n    InstallerUrl: ${windowsUrl}\n    InstallerSha256: ${checksums["uf0rs.exe"]}\n  - Architecture: arm64\n    InstallerUrl: ${windowsArmUrl}\n    InstallerSha256: ${checksums["wopps-agent-win-arm64.exe"]}\nManifestType: installer\nManifestVersion: ${manifestVersion}\n`);
await fs.writeFile(path.join(wingetRoot, `${packageId}.locale.en-US.yaml`), `${schemaHeader("defaultLocale")}${common}PackageLocale: en-US\nPublisher: UF0RS STUDIO\nPackageName: WOPPS AGENT\nLicense: Proprietary\nShortDescription: Friendly terminal agent by uf0rs.\nDescription: Bilingual terminal agent for Windows, Linux, and macOS.\nManifestType: defaultLocale\nManifestVersion: ${manifestVersion}\n`);
await fs.writeFile(path.join(assetRoot, "checksums.txt"), `${Object.entries(checksums).map(([name, hash]) => `${hash}  ${name}`).join("\n")}\n`);
console.log(`Prepared WOPPS AGENT ${version} release assets in ${assetRoot}.`);
