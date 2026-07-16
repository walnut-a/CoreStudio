import { describe, expect, it } from "vitest";

import desktopPackageJson from "../../package.json";
import upstreamBaseline from "../../../../upstream-baseline.json";
import {
  CORESTUDIO_OPEN_SOURCE_DEPENDENCIES,
  CORESTUDIO_REPOSITORY_URL,
} from "./aboutMetadata";

describe("aboutMetadata", () => {
  it("从当前构建配置读取仓库和核心依赖版本", () => {
    expect(CORESTUDIO_REPOSITORY_URL).toBe(
      "https://github.com/walnut-a/CoreStudio",
    );
    expect(CORESTUDIO_OPEN_SOURCE_DEPENDENCIES).toContainEqual({
      name: "React",
      version: desktopPackageJson.devDependencies.react,
    });
    expect(CORESTUDIO_OPEN_SOURCE_DEPENDENCIES).toContainEqual({
      name: "Electron",
      version: desktopPackageJson.devDependencies.electron,
    });
    expect(CORESTUDIO_OPEN_SOURCE_DEPENDENCIES).toContainEqual({
      name: "Excalidraw",
      version: `${
        desktopPackageJson.devDependencies["@excalidraw/excalidraw"]
      } · baseline ${upstreamBaseline.currentSha.slice(0, 8)}`,
    });
  });
});
