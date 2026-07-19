import desktopPackageJson from "../../package.json";
import upstreamBaseline from "../../../../upstream-baseline.json";

export interface OpenSourceDependency {
  name: string;
  version: string;
}

const dependencyVersion = (
  name: keyof typeof desktopPackageJson.devDependencies,
) => desktopPackageJson.devDependencies[name];

export const CORESTUDIO_REPOSITORY_URL =
  "https://github.com/walnut-a/CoreStudio";

export const CORESTUDIO_OPEN_SOURCE_DEPENDENCIES: readonly OpenSourceDependency[] =
  [
    {
      name: "Excalidraw",
      version: `${dependencyVersion(
        "@excalidraw/excalidraw",
      )} · baseline ${upstreamBaseline.currentSha.slice(0, 8)}`,
    },
    {
      name: "React",
      version: dependencyVersion("react"),
    },
    {
      name: "React DOM",
      version: dependencyVersion("react-dom"),
    },
    {
      name: "Google Gen AI SDK",
      version: dependencyVersion("@google/genai"),
    },
    {
      name: "Electron",
      version: dependencyVersion("electron"),
    },
  ];
