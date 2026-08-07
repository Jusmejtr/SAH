import fs from "node:fs";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { clipboard } from "electron";
import { generateGuardCode } from "./steamGuard.js";
import { applyMostRecentUser } from "./loginUsers.js";
import { findPage } from "./cef.js";
import { INSTALL, PROBE } from "./steamPage.js";
import { log } from "./log.js";

const execFileAsync = promisify(execFile);

const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

const SIGN_IN_TIMEOUT_MS = 90000;
const STEP_INTERVAL_MS = 1500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class CancelledError extends Error {
  constructor() {
    super("Cancelled.");
    this.name = "CancelledError";
  }
}

let activeJob = null;

const throwIfCancelled = (job) => {
  if (job.cancelled) throw new CancelledError();
};

export const cancelLogin = () => {
  if (!activeJob) return false;
  activeJob.cancelled = true;
  return true;
};

const readSteamExeFromRegistry = async () => {
  const queries = [
    ["HKCU\\Software\\Valve\\Steam", "SteamExe"],
    ["HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam", "InstallPath"],
    ["HKLM\\SOFTWARE\\Valve\\Steam", "InstallPath"],
  ];

  for (const [key, value] of queries) {
    try {
      const { stdout } = await execFileAsync(
        "reg.exe",
        ["query", key, "/v", value],
        { windowsHide: true },
      );
      const match = stdout.match(/REG_SZ\s+(.+)\s*$/m);
      if (!match) continue;
      const raw = match[1].trim().replace(/\//g, "\\");
      const exe = value === "SteamExe" ? raw : path.join(raw, "steam.exe");
      if (fs.existsSync(exe)) return exe;
    } catch {
      // key missing, try the next one
    }
  }
  return "";
};

export const resolveSteamExe = async () => {
  if (!isWindows) {
    if (isMac) return "/Applications/Steam.app";
    throw new Error("Automatic Steam login is supported on Windows only.");
  }

  const fromRegistry = await readSteamExeFromRegistry();
  if (fromRegistry) return fromRegistry;

  const fallbacks = [
    path.join(process.env["ProgramFiles(x86)"] ?? "", "Steam", "steam.exe"),
    path.join(process.env.ProgramFiles ?? "", "Steam", "steam.exe"),
  ];
  const found = fallbacks.find(
    (candidate) => candidate && fs.existsSync(candidate),
  );
  if (found) return found;

  throw new Error("Steam installation was not found.");
};

export const isSteamRunning = async () => {
  if (isWindows) {
    const { stdout } = await execFileAsync(
      "tasklist.exe",
      ["/FI", "IMAGENAME eq steam.exe", "/NH"],
      { windowsHide: true },
    );
    return stdout.toLowerCase().includes("steam.exe");
  }

  try {
    await execFileAsync("pgrep", ["-x", "steam_osx"]);
    return true;
  } catch {
    return false;
  }
};

export const shutdownSteam = async (steamExe, job, timeoutMs = 15000) => {
  if (!(await isSteamRunning())) {
    log("shutdown: steam was not running");
    return;
  }

  if (isWindows) {
    spawn(steamExe, ["-shutdown"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  } else {
    execFile("osascript", ["-e", 'quit app "Steam"']).unref?.();
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await delay(500);
    if (job) throwIfCancelled(job);
    if (!(await isSteamRunning())) {
      log("shutdown: graceful exit");
      await delay(2000);
      return;
    }
  }

  log("shutdown: forcing taskkill");
  if (isWindows) {
    await execFileAsync("taskkill.exe", ["/F", "/IM", "steam.exe", "/T"], {
      windowsHide: true,
    }).catch(() => {});
  } else {
    await execFileAsync("pkill", ["-x", "steam_osx"]).catch(() => {});
  }
  await delay(2500);
};

// Without this Steam opens its saved-account picker instead of the sign-in form.
const setAutoLoginUser = async (username) => {
  await execFileAsync(
    "reg.exe",
    [
      "add",
      "HKCU\\Software\\Valve\\Steam",
      "/v",
      "AutoLoginUser",
      "/t",
      "REG_SZ",
      "/d",
      username,
      "/f",
    ],
    { windowsHide: true },
  );
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

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  if (page.inputs.some((input) => input.type === "password")) return "credentials";
  if (/mobile app|steam app|approve|use your phone/i.test(text) && codeBoxes.length === 0) {
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
        if (await click("add an account|add account|different account|sign in with")) break;
        return "manual";
      }

      case "credentials": {
        onProgress("Entering credentials");
        await session.evaluate(
          `window.__sah.fillCredentials(${quote(username)}, ${quote(password)})`,
        );
        await delay(300);
        await session.evaluate(`window.__sah.click(${quote("sign in|prihl|log in")})`);
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

/** Restarts Steam and signs the given account in. */
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
      onProgress("Selecting the account");
      enableCefDebugging(steamExe);
      // The registry value and the vdf flag together stop Steam from opening its
      // saved-account picker.
      await setAutoLoginUser(credentials.username);
      const known = applyMostRecentUser(
        path.dirname(steamExe),
        credentials.username,
      );
      log("login: account known to Steam", known);
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
