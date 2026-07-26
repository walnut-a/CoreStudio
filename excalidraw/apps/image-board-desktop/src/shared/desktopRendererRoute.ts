export type DesktopRendererRoute =
  | { mode: "app" }
  | { mode: "shell" }
  | { mode: "project"; projectPath: string };

export const parseDesktopRendererRoute = (
  href: string,
): DesktopRendererRoute => {
  const url = new URL(href);
  const mode = url.searchParams.get("desktopMode");
  if (mode === "shell") {
    return { mode: "shell" };
  }
  if (mode === "project") {
    const projectPath = url.searchParams.get("projectPath");
    if (!projectPath) {
      throw new Error("Project renderer route requires a project path.");
    }
    return { mode: "project", projectPath };
  }
  return { mode: "app" };
};

export const buildDesktopShellRendererUrl = (baseUrl: string) => {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("desktopMode", "shell");
  return url.toString();
};

export const buildDesktopProjectRendererUrl = (
  baseUrl: string,
  projectPath: string,
) => {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("desktopMode", "project");
  url.searchParams.set("projectPath", projectPath);
  return url.toString();
};
