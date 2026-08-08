import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { clipboard } from "electron";
import { generateGuardCode } from "./guard.js";
import { findPage } from "./cef.js";
import { log } from "../log.js";
import { CancelledError, throwIfCancelled } from "../errors.js";
import { isSteamRunning, isWindows, resolveSteamExe, shutdownSteam } from "./process.js";
import { INSTALL, PROBE } from "./page-scripts.js";

const SIGN_IN_TIMEOUT_MS = 90000;
const STEP_INTERVAL_MS = 1500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let activeJob = null;

export const cancelLogin = () => {
  if (!activeJob) return false;
  activeJob.cancelled = true;
  return true;
};

// Steam only exposes its CEF pages for inspection when this marker file exists at startup.
const enableCefDebugging = (steamExe) => {
  const marker = path.join(
    path.dirname(steamExe),
    ".cef-enable-remote-debugging",
  );
  if (fs.existsSync(marker)) return;
  fs.writeFileSync(marker, "");
  log("cef: created", marker);
};

const launchSteam = (steamExe) => {
  if (isWindows) {
    spawn(steamExe, [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  spawn("open", ["-a", steamExe], { detached: true, stdio: "ignore" }).unref();
};

const quote = (value) => JSON.stringify(String(value));

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Classifies the current sign-in screen from its DOM. Order matters: the mobile
 * confirmation screen also mentions Steam Guard, so it has to be checked before the
 * code screen.
 */
export const detectScreen = (page, credentialsSent) => {
  const text = page.text ?? "";
  const codeBoxes = page.inputs.filter(
    (input) => input.type !== "password" && input.maxLength === 1,
  );

  if (/who'?s playing/i.test(text)) return "account-picker";
  if (page.inputs.some((input) => input.type === "password"))
    return "credentials";
  if (
    /mobile app|steam app|approve|use your phone/i.test(text) &&
    codeBoxes.length === 0
  ) {
    return "mobile-confirm";
  }
  if (codeBoxes.length > 0 || /enter the code|steam guard code/i.test(text)) {
    return "guard-code";
  }
  if (credentialsSent && page.inputs.length === 0) return "signed-in";
  return "unknown";
};

/** Drives the sign-in page, one screen at a time, by reading its real DOM. */
const driveSignIn = async (session, job, onProgress, credentials) => {
  const { username, displayName, password, sharedSecret } = credentials;
  const deadline = Date.now() + SIGN_IN_TIMEOUT_MS;
  const click = (pattern) =>
    session.evaluate(`window.__sah.clickText(${quote(pattern)})`);

  let credentialsSent = false;
  let lastSummary = "";

  while (Date.now() < deadline) {
    throwIfCancelled(job);

    let page;
    try {
      page = await session.evaluate("window.__sah.describe()");
    } catch (error) {
      log("drive: page is gone", error.message);
      return credentialsSent ? "signed-in" : "timeout";
    }

    const summary = JSON.stringify({
      inputs: page.inputs,
      buttons: page.buttons.map((button) => button.text),
      texts: page.texts,
    });
    if (summary !== lastSummary) {
      lastSummary = summary;
      log("drive: dom", page.url, "\n", page.text, "\n", summary);
    }

    const screen = detectScreen(page, credentialsSent);
    log("drive: screen =", screen);

    switch (screen) {
      case "account-picker": {
        onProgress("Choosing the account");
        const wanted = [displayName, username].filter(Boolean).map(escapeRegex);
        if (await click(wanted.join("|"))) break;
        if (
          await click(
            "add an account|add account|different account|sign in with",
          )
        )
          break;
        return "manual";
      }

      case "credentials": {
        onProgress("Entering credentials");
        await session.evaluate(
          `window.__sah.fillCredentials(${quote(username)}, ${quote(password)})`,
        );
        await delay(300);
        await session.evaluate(
          `window.__sah.click(${quote("sign in|prihl|log in")})`,
        );
        credentialsSent = true;
        break;
      }

      case "mobile-confirm": {
        onProgress("Switching to Steam Guard code");
        const switched = await click(
          "enter a code|use a code|code instead|steam guard code|enter code",
        );
        log("drive: switched to code entry", switched);
        if (!switched) return "manual";
        break;
      }

      case "guard-code": {
        if (!sharedSecret) return "launched";
        onProgress("Entering Steam Guard code");
        const filled = await session.evaluate(
          `window.__sah.fillCode(${quote(generateGuardCode(sharedSecret))})`,
        );
        log("drive: code filled", filled);
        await delay(400);
        await session.evaluate(
          `window.__sah.click(${quote("submit|confirm|continue|sign in")})`,
        );
        break;
      }

      case "signed-in":
        return "signed-in";

      default:
        break;
    }

    await delay(STEP_INTERVAL_MS);
  }

  return "timeout";
};

export const loginToSteam = async (credentials, onProgress = () => {}) => {
  const job = { cancelled: false };
  activeJob = job;
  let session = null;

  try {
    onProgress("Locating Steam");
    const steamExe = await resolveSteamExe();
    log("login: exe", steamExe, "user", credentials.username);
    throwIfCancelled(job);

    onProgress("Closing running Steam");
    await shutdownSteam(steamExe, job);
    throwIfCancelled(job);

    if (isWindows) {
      onProgress("Preparing Steam");
      enableCefDebugging(steamExe);
      throwIfCancelled(job);
    }

    onProgress("Starting Steam");
    launchSteam(steamExe);

    onProgress("Waiting for the sign-in page");
    session = await findPage(PROBE, 90000, () => job.cancelled);
    throwIfCancelled(job);

    if (!session) {
      log("login: no sign-in page, Steam restored the saved session");
      return { status: "auto-login" };
    }

    await session.evaluate(INSTALL);
    const outcome = await driveSignIn(session, job, onProgress, credentials);
    log("login: outcome", outcome);

    if (outcome === "signed-in") return { status: "signed-in" };
    if (outcome === "launched") return { status: "launched" };

    if (credentials.sharedSecret) {
      clipboard.writeText(generateGuardCode(credentials.sharedSecret));
    }
    return { status: "code-copied" };
  } catch (error) {
    log("login: failed", error.message);
    throw error;
  } finally {
    session?.close();
    if (activeJob === job) activeJob = null;
  }
};
