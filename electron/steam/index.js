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

// Text patterns are only a fallback for screens the structural checks cannot classify,
// so the common Steam client languages are listed here.
const MOBILE_WORDS =
  "mobile app|steam app|approve|use your phone|mobiln|schv[aá]lit|best[aä]tig|mobile-app|aprobar|aplicaci[oó]n m[oó]vil|approuver|application mobile|approva|app mobile|aprovar|aplicativo|zatwierd[zź]|aplikacja mobilna|подтверд|мобильн|підтверд|onayla|mobil uygulama|goedkeur|mobiele app|godk[aä]nn|手机|手機|モバイル|承認|모바일|승인";
const USE_CODE_WORDS =
  "enter a code|use a code|code instead|zadat k[oó]d|pou[zž][ií]t k[oó]d|code eingeben|stattdessen einen code|introducir un c[oó]digo|usar un c[oó]digo|saisir un code|utiliser un code|inserisci un codice|introduzir um c[oó]digo|inserir c[oó]digo|wpisz kod|u[zż]yj kodu|ввести код|использовать код|ввести код|kod gir|code invoeren|ange kod|输入验证码|改用验证码|輸入驗證碼|コードを入力|코드 입력";
const ADD_ACCOUNT_WORDS =
  "add an account|add account|different account|sign in with|jin[yý] [uú][cč]et|p[rř]idat [uú][cč]et|konto hinzuf[uü]gen|anderes konto|a[nñ]adir cuenta|otra cuenta|ajouter un compte|autre compte|aggiungi account|altro account|adicionar conta|outra conta|dodaj konto|inne konto|добавить аккаунт|другой аккаунт|hesap ekle|account toevoegen|l[aä]gg till konto|添加账户|新增帳戶|アカウントを追加|계정 추가";

/**
 * Classifies the current sign-in screen from its DOM. Detection is structural (input
 * types, code boxes, avatar tiles, CSS-module class names) so it does not depend on the
 * client's language; wording is only consulted as a last resort.
 */
export const detectScreen = (page, credentialsSent) => {
  const text = page.text ?? "";
  const tokens = (page.classTokens ?? []).join(" ");
  const tiles = page.tiles ?? [];
  const codeBoxes = page.inputs.filter(
    (input) => input.type !== "password" && input.maxLength === 1,
  );

  if (page.inputs.some((input) => input.type === "password"))
    return "credentials";
  if (codeBoxes.length >= 4) return "guard-code";
  if (tiles.some((tile) => tile.hasAvatar) || /accountlist|loginusers|whosplaying/i.test(tokens))
    return "account-picker";
  if (
    /awaitingmobile|mobileconf|qrcode/i.test(tokens) ||
    new RegExp(MOBILE_WORDS, "i").test(text)
  ) {
    return "mobile-confirm";
  }
  if (codeBoxes.length > 0 || /guardcode|entercode/i.test(tokens)) {
    return "guard-code";
  }
  if (credentialsSent && page.inputs.length === 0) return "signed-in";
  return "unknown";
};

/** Drives the sign-in page, one screen at a time, by reading its real DOM. */
const driveSignIn = async (session, job, onProgress, credentials) => {
  const { username, displayName, password, sharedSecret } = credentials;
  const deadline = Date.now() + SIGN_IN_TIMEOUT_MS;

  // Steam's login page ignores synthetic events on some tiles, so a real CDP mouse click
  // at the element's coordinates is tried first.
  const click = async (pattern) => {
    const point = await session.evaluate(
      `window.__sah.locateText(${quote(pattern)})`,
    );
    if (point) {
      await delay(120);
      await session.clickPoint(point.x, point.y);
      return true;
    }
    return session.evaluate(`window.__sah.clickText(${quote(pattern)})`);
  };

  const clickTile = async (tiles, tile) => {
    if (!tile) return false;
    if (tile.x > 0 && tile.y > 0) {
      await session.clickPoint(tile.x, tile.y);
      return true;
    }
    return session.evaluate(`window.__sah.clickTile(${tiles.indexOf(tile)})`);
  };

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
      tiles: page.tiles,
      classTokens: page.classTokens,
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
        const tiles = page.tiles ?? [];
        const names = [displayName, username].filter(Boolean).map(escapeRegex);
        const nameRegex = names.length ? new RegExp(names.join("|"), "i") : null;
        const wanted = tiles.find(
          (tile) => tile.hasAvatar && nameRegex?.test(tile.text),
        );
        if (await clickTile(tiles, wanted)) break;
        if (nameRegex && (await click(names.join("|")))) break;

        // The "add an account" tile is the only entry with no avatar; it often shows just a "+".
        const addTile = tiles.find(
          (tile) => !tile.hasAvatar && tile.width >= 24 && tile.height >= 24,
        );
        if (await clickTile(tiles, addTile)) break;
        if (await click(ADD_ACCOUNT_WORDS)) break;
        return "manual";
      }

      case "credentials": {
        onProgress("Entering credentials");
        await session.evaluate(
          `window.__sah.fillCredentials(${quote(username)}, ${quote(password)})`,
        );
        await delay(300);
        await session.evaluate("window.__sah.submit()");
        credentialsSent = true;
        break;
      }

      case "mobile-confirm": {
        onProgress("Switching to Steam Guard code");
        const switched =
          (await click(USE_CODE_WORDS)) ||
          (await session.evaluate("window.__sah.clickSecondary()"));
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
        await session.evaluate("window.__sah.submit()");
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
