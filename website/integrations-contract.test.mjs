import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CONTENT_REVISION,
  LOCALES,
  SUPPORTED_HOSTS,
  getCliExample,
  getIntegrationGuide,
  getLocalizedContent,
  getTroubleshootingGuide,
  normalizeHost,
} from "./integrations-content.mjs";
import {
  createWebMcpToolDefinitions,
  registerCoreStudioWebMcpTools,
} from "./webmcp-adapter.mjs";

const readWebsiteFile = (path) =>
  readFile(new URL(path, import.meta.url), "utf8");

const normalizeVisibleText = (value) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

test("integration content supports the three shipped local agent hosts", () => {
  assert.deepEqual(SUPPORTED_HOSTS, ["codex", "cursor", "claude-code"]);
  assert.deepEqual(LOCALES, ["en", "zh-CN"]);
  assert.match(CONTENT_REVISION, /^\d{8}-\d+$/);

  assert.equal(normalizeHost("cursor"), "cursor");
  assert.equal(normalizeHost("unknown"), "codex");
});

test("localized content stays structurally aligned and links to exact GitHub sources", () => {
  const english = getLocalizedContent("en");
  const chinese = getLocalizedContent("zh-CN");

  assert.deepEqual(Object.keys(english), Object.keys(chinese));
  assert.deepEqual(Object.keys(english.hosts), Object.keys(chinese.hosts));

  for (const locale of LOCALES) {
    const content = getLocalizedContent(locale);
    assert.equal(content.revision, CONTENT_REVISION);
    assert.match(content.sourceUrl, /^https:\/\/github\.com\/walnut-a\/CoreStudio\/blob\/main\//);
    assert.match(content.cliContractUrl, /^https:\/\/github\.com\/walnut-a\/CoreStudio\/blob\/main\//);
    assert.equal(content.sharedCliPath, "~/.local/bin/corestudio");
  }
});

test("installation guides describe the signed-app path without claiming local success", () => {
  const guide = getIntegrationGuide({
    host: "cursor",
    locale: "zh-CN",
    stage: "install",
  });

  assert.equal(guide.host, "cursor");
  assert.equal(guide.stage, "install");
  assert.equal(guide.artifacts.length, 2);
  assert.ok(guide.artifacts.some(({ path }) => path === "~/.local/bin/corestudio"));
  assert.ok(
    guide.artifacts.some(({ path }) => path === "~/.cursor/skills/corestudio/")
  );
  assert.equal(guide.status, "instructions-only");
  assert.ok(guide.warnings.some((warning) => warning.includes("网络安装脚本")));
  assert.match(guide.pageUrl, /\/zh\/integrations\/\?host=cursor#install$/);
});

test("CLI examples state their runtime requirements", () => {
  const status = getCliExample({ task: "status", host: "codex", locale: "en" });
  assert.equal(status.command, "corestudio read status --json");
  assert.equal(status.requiresCoreStudioRunning, true);
  assert.equal(status.requiresOpenProject, false);
  assert.equal(status.requiresAgentSession, false);

  const writeImage = getCliExample({
    task: "write-image",
    host: "claude-code",
    locale: "en",
  });
  assert.equal(writeImage.requiresOpenProject, true);
  assert.equal(writeImage.requiresAgentSession, true);
  assert.match(writeImage.command, /--source-type generated --origin agent-board --json$/);
});

test("troubleshooting is limited to curated symptoms", () => {
  const result = getTroubleshootingGuide({
    host: "claude-code",
    symptom: "session-expired",
    locale: "en",
  });

  assert.equal(result.symptom, "session-expired");
  assert.ok(result.actions.length > 0);
  assert.ok(result.doNot.length > 0);
  assert.throws(
    () =>
      getTroubleshootingGuide({
        host: "codex",
        symptom: "run-arbitrary-shell",
        locale: "en",
      }),
    /Unsupported symptom/
  );
});

test("WebMCP exposes exactly three read-only, enum-bounded tools", () => {
  const tools = createWebMcpToolDefinitions("en");

  assert.deepEqual(
    tools.map(({ name }) => name),
    [
      "get_corestudio_integration_guide",
      "get_corestudio_cli_example",
      "troubleshoot_corestudio_integration",
    ]
  );

  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.untrustedContentHint, false);
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(typeof tool.execute, "function");
    assert.doesNotMatch(JSON.stringify(tool.inputSchema), /api.?key|token|shell|command/i);
  }
});

test("WebMCP registration publishes all guide tools to the current document", async () => {
  const registered = [];
  const result = await registerCoreStudioWebMcpTools({
    locale: "zh-CN",
    modelContext: {
      registerTool: async (tool) => registered.push(tool),
    },
  });

  assert.equal(result.supported, true);
  assert.deepEqual(result.registered, registered.map(({ name }) => name));
  assert.equal(registered.length, 3);
  assert.equal(registered[0].title, "CoreStudio 集成指南");
});

test("localized integration pages keep semantic fallbacks and progressive enhancement", async () => {
  const entrypoints = {
    en: "integrations/index.html",
    "zh-CN": "zh/integrations/index.html",
  };

  for (const [locale, entrypoint] of Object.entries(entrypoints)) {
    const html = await readWebsiteFile(entrypoint);
    const visibleText = normalizeVisibleText(html);
    const content = getLocalizedContent(locale);
    assert.match(html, /<main[^>]+id="main"/);
    assert.match(html, /data-host-tabs/);
    assert.match(html, /data-integration-guide/);
    assert.match(html, /<noscript>/);
    assert.match(html, /integrations\.mjs\?v=/);
    assert.match(html, /webmcp-adapter\.mjs\?v=/);
    assert.match(html, /github\.com\/walnut-a\/CoreStudio\/blob\/main\//);
    assert.match(html, new RegExp(`data-content-revision="${CONTENT_REVISION}"`));

    const sharedVisibleContent = [
      content.meta.title,
      content.hero.title,
      content.hero.intro,
      content.hero.localNote,
      ...Object.values(content.facts).flatMap(({ label, value }) => [label, value]),
      ...Object.values(content.sectionCopy).flatMap(({ title, intro }) => [
        title,
        intro,
      ]),
      ...content.installSteps.flatMap(({ title, body }, index) => [
        ...(index === 2 ? [] : [title]),
        body,
      ]),
      content.verify.installTitle,
      content.verify.installBody,
      content.verify.installCommand,
      content.verify.connectionTitle,
      content.verify.connectionBody,
      content.verify.connectionCommand,
      content.prompts.codex,
      content.hostNotes.codex,
      content.noScript,
    ];

    for (const expected of sharedVisibleContent) {
      assert.ok(
        visibleText.includes(normalizeVisibleText(expected)),
        `${entrypoint} is missing content-source text: ${expected}`
      );
    }
    assert.ok(html.includes(content.meta.description));
    assert.ok(html.includes(content.sourceUrl));
    assert.ok(html.includes(content.cliContractUrl));
  }
});

test("localized homepages register WebMCP and expose both integration routes", async () => {
  const [english, chinese, sitemap] = await Promise.all([
    readWebsiteFile("index.html"),
    readWebsiteFile("zh/index.html"),
    readWebsiteFile("sitemap.xml"),
  ]);

  assert.match(english, /href="integrations\/"/);
  assert.match(chinese, /href="integrations\/"/);
  assert.match(english, /<html[^>]+data-webmcp="enabled"/);
  assert.match(chinese, /<html[^>]+data-webmcp="enabled"/);
  assert.match(english, /<body[^>]+data-locale="en"/);
  assert.match(chinese, /<body[^>]+data-locale="zh-CN"/);
  assert.match(english, /src="webmcp-adapter\.mjs\?v=/);
  assert.match(chinese, /src="\.\.\/webmcp-adapter\.mjs\?v=/);
  assert.match(sitemap, /https:\/\/getcorestudio\.com\/integrations\//);
  assert.match(sitemap, /https:\/\/getcorestudio\.com\/zh\/integrations\//);
});
