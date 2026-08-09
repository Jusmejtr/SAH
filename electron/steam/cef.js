import WebSocket from "ws";
import { log } from "../log.js";

const CEF_PORT = 8080;
const CEF_HOST = "127.0.0.1";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const listTargets = async () => {
  const response = await fetch(`http://${CEF_HOST}:${CEF_PORT}/json`);
  if (!response.ok) throw new Error(`CEF returned ${response.status}`);
  return response.json();
};

/** A single CDP session against one CEF target. */
class CefSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();

    socket.on("message", (data) => {
      const message = JSON.parse(String(data));
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    });

    socket.on("close", () => {
      for (const entry of this.pending.values()) {
        entry.reject(new Error("CEF connection closed."));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  /** Runs `expression` inside the page and returns its value. */
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text,
      );
    }
    return result.result.value;
  }

  /** Sends a real (trusted) mouse click at viewport coordinates. */
  async clickPoint(x, y) {
    const base = { x, y, button: "left", clickCount: 1 };
    await this.send("Input.dispatchMouseEvent", {
      ...base,
      type: "mouseMoved",
      button: "none",
      buttons: 0,
    });
    await this.send("Input.dispatchMouseEvent", {
      ...base,
      type: "mousePressed",
      buttons: 1,
    });
    await this.send("Input.dispatchMouseEvent", {
      ...base,
      type: "mouseReleased",
      buttons: 0,
    });
  }

  close() {
    this.socket.close();
  }
}

const connect = (webSocketDebuggerUrl) =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketDebuggerUrl, {
      maxPayload: 64 * 1024 * 1024,
    });
    socket.once("open", () => resolve(new CefSession(socket)));
    socket.once("error", reject);
  });

/**
 * Finds the CEF target whose page satisfies `probe` (a JS expression returning a boolean)
 * and returns an open session for it.
 */
export const findPage = async (probe, timeoutMs, isCancelled = () => false) => {
  const deadline = Date.now() + timeoutMs;
  let announced = "";

  while (Date.now() < deadline) {
    if (isCancelled()) return null;

    let targets = [];
    try {
      targets = await listTargets();
    } catch {
      await delay(1000);
      continue;
    }

    const pages = targets.filter(
      (target) =>
        Boolean(target.webSocketDebuggerUrl) &&
        target.type !== "other" &&
        !/sharedjscontext/i.test(target.title ?? ""),
    );
    const snapshot = pages
      .map((page) => `${page.type}:${page.title}`)
      .join(" | ");
    if (snapshot !== announced) {
      announced = snapshot;
      log("cef: targets:", snapshot || "(none)");
    }

    for (const page of pages) {
      let session;
      try {
        session = await connect(page.webSocketDebuggerUrl);
        const matched = await session.evaluate(probe);
        log("cef: probe", page.title, "->", matched);
        if (matched) {
          log("cef: matched page", page.title, page.url);
          return session;
        }
      } catch (error) {
        log("cef: probe failed on", page.title, error.message);
      }
      session?.close();
    }

    await delay(1000);
  }

  return null;
};
