declare module "ws" {
  import type { IncomingMessage } from "node:http";
  import type { Duplex } from "node:stream";

  export class WebSocket {
    static readonly OPEN: number;
    readonly readyState: number;
    constructor(address: string);
    send(data: string): void;
    close(code?: number, reason?: string): void;
    once(
      event: "open" | "error" | "close" | "message",
      listener: (...args: any[]) => void,
    ): this;
    on(
      event: "error" | "close" | "message",
      listener: (...args: any[]) => void,
    ): this;
  }

  export class WebSocketServer {
    constructor(options: { noServer: true });
    handleUpgrade(
      request: IncomingMessage,
      socket: Duplex,
      head: Buffer,
      callback: (socket: WebSocket) => void,
    ): void;
    close(callback?: (error?: Error) => void): void;
  }
}
