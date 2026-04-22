#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { appBuilderPath } = require("app-builder-bin");

const appRoot = path.resolve(__dirname, "..");
const releaseDir = path.join(appRoot, "release");
const packageJson = require(path.join(appRoot, "package.json"));

const productName = packageJson.build?.productName ?? "CoreStudio";
const version = packageJson.version;

const defaultIdentity = "Developer ID Application: junyan liu (CUP682RD2S)";
const defaultKeychain = path.join(
  process.env.HOME ?? "",
  "Library",
  "Keychains",
  "login.keychain-db",
);

const runCommand = (command, args, options = {}) => {
  console.log(`\n$ ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? appRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
};

const getFileMtime = (filePath) => fs.statSync(filePath).mtimeMs;

const sortNewestFirst = (files) =>
  [...files].sort((left, right) => getFileMtime(right) - getFileMtime(left));

const findAppBundle = () => {
  if (process.env.CORESTUDIO_APP_PATH) {
    return path.resolve(process.env.CORESTUDIO_APP_PATH);
  }

  if (!fs.existsSync(releaseDir)) {
    throw new Error(`Release directory does not exist: ${releaseDir}`);
  }

  const candidates = fs
    .readdirSync(releaseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("mac"))
    .map((entry) => path.join(releaseDir, entry.name, `${productName}.app`))
    .filter((candidate) => fs.existsSync(candidate));

  if (candidates.length === 0) {
    throw new Error(`No ${productName}.app bundle found under ${releaseDir}`);
  }

  return sortNewestFirst(candidates)[0];
};

const findDmgFiles = () => {
  if (process.env.CORESTUDIO_DMG_PATH) {
    return [path.resolve(process.env.CORESTUDIO_DMG_PATH)];
  }

  if (!fs.existsSync(releaseDir)) {
    throw new Error(`Release directory does not exist: ${releaseDir}`);
  }

  const prefix = `${productName}-${version}-`;
  const candidates = fs
    .readdirSync(releaseDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith(".dmg"),
    )
    .map((entry) => path.join(releaseDir, entry.name));

  if (candidates.length === 0) {
    throw new Error(`No ${productName} ${version} DMG found under ${releaseDir}`);
  }

  return sortNewestFirst(candidates);
};

const getZipPathForDmg = (dmgPath) => {
  const basename = path.basename(dmgPath);
  const prefix = `${productName}-${version}-`;
  const suffix = ".dmg";

  if (basename.startsWith(prefix) && basename.endsWith(suffix)) {
    const arch = basename.slice(prefix.length, -suffix.length);
    return path.join(releaseDir, `${productName}-${version}-${arch}-mac.zip`);
  }

  return path.join(releaseDir, basename.replace(/\.dmg$/i, "-mac.zip"));
};

const regenerateBlockMap = (filePath) => {
  runCommand(
    appBuilderPath,
    [
      "blockmap",
      "--input",
      path.basename(filePath),
      "--output",
      `${path.basename(filePath)}.blockmap`,
    ],
    { cwd: releaseDir },
  );
};

const main = () => {
  if (process.env.CORESTUDIO_SKIP_NOTARIZE === "1") {
    console.warn("CORESTUDIO_SKIP_NOTARIZE=1, skipping macOS notarization.");
    return;
  }

  if (process.platform !== "darwin") {
    console.warn("Not running on macOS, skipping macOS notarization.");
    return;
  }

  const identity =
    process.env.CORESTUDIO_CODESIGN_IDENTITY ||
    process.env.CSC_NAME ||
    defaultIdentity;
  const keychain = process.env.CSC_KEYCHAIN || defaultKeychain;
  const profile = process.env.CORESTUDIO_NOTARY_PROFILE || "filebox-notary";
  const appPath = findAppBundle();
  const dmgFiles = findDmgFiles();

  console.log(`Using app bundle: ${appPath}`);
  console.log(`Using notary profile: ${profile}`);

  runCommand("codesign", [
    "--verify",
    "--deep",
    "--strict",
    "--verbose=2",
    appPath,
  ]);

  for (const dmgPath of dmgFiles) {
    runCommand("codesign", [
      "--sign",
      identity,
      "--force",
      "--keychain",
      keychain,
      "--timestamp",
      dmgPath,
    ]);

    runCommand("xcrun", [
      "notarytool",
      "submit",
      dmgPath,
      "--keychain-profile",
      profile,
      "--wait",
      "--progress",
    ]);

    runCommand("xcrun", ["stapler", "staple", dmgPath]);
    runCommand("xcrun", ["stapler", "validate", dmgPath]);
    runCommand("spctl", [
      "-a",
      "-vvv",
      "-t",
      "open",
      "--context",
      "context:primary-signature",
      dmgPath,
    ]);
    regenerateBlockMap(dmgPath);
  }

  runCommand("xcrun", ["stapler", "staple", appPath]);
  runCommand("xcrun", ["stapler", "validate", appPath]);
  runCommand("spctl", ["-a", "-vvv", "-t", "exec", appPath]);

  for (const dmgPath of dmgFiles) {
    const zipPath = getZipPathForDmg(dmgPath);
    if (fs.existsSync(zipPath)) {
      fs.rmSync(zipPath);
    }
    if (fs.existsSync(`${zipPath}.blockmap`)) {
      fs.rmSync(`${zipPath}.blockmap`);
    }

    runCommand(
      "ditto",
      [
        "-c",
        "-k",
        "--sequesterRsrc",
        "--keepParent",
        path.basename(appPath),
        zipPath,
      ],
      { cwd: path.dirname(appPath) },
    );
    regenerateBlockMap(zipPath);
  }
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  findAppBundle,
  findDmgFiles,
  getZipPathForDmg,
};
