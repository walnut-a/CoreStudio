import type http from "node:http";
import { readFile as fsReadFile } from "node:fs/promises";
import path from "node:path";
import { AGENT_BOARD_ROUTE } from "../../src/shared/agentBridgeTypes";

const AGENT_BOARD_ASSET_ROUTE_PREFIX = "/assets/";
const RETIRED_AGENT_BOARD_ROUTE = "/agent-board";

const STATIC_CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export const isAgentBoardRoutePath = (pathname: string) =>
  pathname === AGENT_BOARD_ROUTE ||
  pathname.startsWith(`${AGENT_BOARD_ROUTE}/`);

const isAgentBoardPagePath = (pathname: string) => {
  if (pathname === AGENT_BOARD_ROUTE) {
    return true;
  }
  const stableBoardPathSegment = pathname.startsWith(`${AGENT_BOARD_ROUTE}/`)
    ? pathname.slice(`${AGENT_BOARD_ROUTE}/`.length)
    : "";
  return (
    stableBoardPathSegment.length > 0 && !stableBoardPathSegment.includes("/")
  );
};

const isRetiredAgentBoardPagePath = (pathname: string) =>
  pathname === RETIRED_AGENT_BOARD_ROUTE ||
  pathname === `${RETIRED_AGENT_BOARD_ROUTE}/` ||
  pathname.startsWith(`${RETIRED_AGENT_BOARD_ROUTE}/`);

const addAgentBoardBaseHref = (contents: Buffer) => {
  const html = contents.toString("utf8");
  if (/<base\b/i.test(html)) {
    return contents;
  }
  const nextHtml = html.replace(
    /<head(\s[^>]*)?>/i,
    (head) => `${head}<base href="/" />`,
  );
  return Buffer.from(nextHtml === html ? `<base href="/" />${html}` : nextHtml);
};

type SendResponse = (
  response: http.ServerResponse,
  statusCode: number,
  headers: http.OutgoingHttpHeaders,
  body?: string | Buffer,
) => void;

export const serveAgentBoardAsset = async (
  response: http.ServerResponse,
  pathname: string,
  assetsDir: string | undefined,
  sendResponse: SendResponse,
) => {
  if (
    !assetsDir ||
    (!isAgentBoardPagePath(pathname) &&
      !pathname.startsWith(AGENT_BOARD_ASSET_ROUTE_PREFIX))
  ) {
    return false;
  }

  const relativePath = isAgentBoardPagePath(pathname)
    ? "index.html"
    : pathname.slice(1);
  const root = path.resolve(assetsDir);
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    sendResponse(response, 404, {});
    return true;
  }

  let contents: Buffer;
  try {
    contents = await fsReadFile(filePath);
  } catch {
    sendResponse(response, 404, {});
    return true;
  }
  const body =
    relativePath === "index.html" ? addAgentBoardBaseHref(contents) : contents;
  sendResponse(
    response,
    200,
    {
      "Content-Type":
        STATIC_CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
        "application/octet-stream",
      "Cache-Control":
        relativePath === "index.html"
          ? "no-cache"
          : "public, max-age=31536000, immutable",
    },
    body,
  );
  return true;
};

export const proxyAgentBoardDevAsset = async (
  request: http.IncomingMessage,
  response: http.ServerResponse,
  url: URL,
  devServerUrl: string | undefined,
  sendResponse: SendResponse,
  reportRequestError: (
    response: http.ServerResponse,
    error: unknown,
    phase: "asset-proxy",
  ) => void,
) => {
  if (
    !devServerUrl ||
    request.method !== "GET" ||
    url.pathname.startsWith("/v1/")
  ) {
    return false;
  }
  if (isRetiredAgentBoardPagePath(url.pathname)) {
    sendResponse(response, 404, {});
    return true;
  }
  if (
    isAgentBoardRoutePath(url.pathname) &&
    !isAgentBoardPagePath(url.pathname)
  ) {
    return false;
  }
  if (
    request.headers.accept?.includes("text/html") &&
    !isAgentBoardPagePath(url.pathname)
  ) {
    return false;
  }

  const target = new URL(devServerUrl);
  target.pathname = url.pathname;
  target.search = url.search;
  if (isAgentBoardPagePath(url.pathname)) {
    target.pathname = "/";
    target.search = "";
  }

  let statusCode: number;
  let body: Buffer;
  const headers: Record<string, string> = {};
  try {
    const upstream = await fetch(target, {
      redirect: "error",
      headers: {
        Accept:
          typeof request.headers.accept === "string"
            ? request.headers.accept
            : "*/*",
        "Accept-Encoding": "identity",
      },
    });
    for (const name of [
      "content-type",
      "cache-control",
      "etag",
      "last-modified",
    ]) {
      const value = upstream.headers.get(name);
      if (value) {
        headers[name] = value;
      }
    }
    body = Buffer.from(await upstream.arrayBuffer());
    statusCode = upstream.status;
  } catch (error) {
    reportRequestError(response, error, "asset-proxy");
    sendResponse(
      response,
      502,
      {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
      "CoreStudio development renderer is unavailable.",
    );
    return true;
  }
  sendResponse(response, statusCode, headers, body);
  return true;
};
