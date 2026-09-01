import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestUrl = new URL("./updates/stable.json", import.meta.url);

test("stable update manifest keeps the CoreStudio release contract", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.channel, "stable");
  assert.match(manifest.version, /^\d+(?:\.\d+)+$/);
  assert.doesNotThrow(() => new Date(manifest.publishedAt).toISOString());
  assert.match(manifest.minimumSystemVersion, /^\d+(?:\.\d+)+$/);

  for (const key of ["downloadPageURL", "releaseNotesURL"]) {
    assert.equal(new URL(manifest[key]).protocol, "https:");
  }
  assert.match(
    manifest.releaseNotesURL,
    new RegExp(`/releases/tag/v${manifest.version.replaceAll(".", "\\.")}$`)
  );

  assert.equal(new URL(manifest.asset.url).protocol, "https:");
  assert.match(manifest.asset.url, new RegExp(`/v${manifest.version}/`));
  assert.ok(Number.isSafeInteger(manifest.asset.size));
  assert.ok(manifest.asset.size > 0);
  assert.match(manifest.asset.sha256, /^[a-f0-9]{64}$/);

  for (const locale of ["zh-CN", "en"]) {
    assert.ok(Array.isArray(manifest.summary[locale]));
    assert.ok(manifest.summary[locale].length > 0);
    assert.ok(manifest.summary[locale].length <= 3);
    assert.ok(
      manifest.summary[locale].every(
        (item) => typeof item === "string" && item.trim()
      )
    );
  }
});
