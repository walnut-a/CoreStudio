import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixturePath = fileURLToPath(import.meta.url);
const mode = process.argv[2] ?? "parent";

if (mode === "child") {
  setInterval(() => {}, 1_000);
} else {
  const child = spawn(process.execPath, [fixturePath, "child"], {
    stdio: "ignore",
  });
  const statePath = process.env.CORESTUDIO_FIXTURE_STATE_PATH;
  if (!statePath) {
    throw new Error("CORESTUDIO_FIXTURE_STATE_PATH is required");
  }
  fs.writeFileSync(
    statePath,
    `${JSON.stringify({ parentPid: process.pid, childPid: child.pid })}\n`,
  );

  const exitCode = process.env.CORESTUDIO_FIXTURE_EXIT_CODE;
  if (exitCode !== undefined) {
    setTimeout(() => process.exit(Number(exitCode)), 100);
  } else {
    setInterval(() => {}, 1_000);
  }
}
