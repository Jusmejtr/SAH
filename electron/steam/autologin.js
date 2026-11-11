import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { log } from "../log.js";
import { isLinux, isMac, isWindows } from "./process.js";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Minimal KeyValues (VDF) reader/writer for loginusers.vdf and registry.vdf

const parseVdf = (text) => {
  let i = 0;
  const skip = () => {
    while (i < text.length) {
      const c = text[i];
      if (/\s/.test(c)) i++;
      else if (c === "/" && text[i + 1] === "/") {
        while (i < text.length && text[i] !== "\n") i++;
      } else if (c === "[") {
        // platform conditionals like [$WIN32]
        while (i < text.length && text[i] !== "]") i++;
        i++;
      } else break;
    }
  };
  const readString = () => {
    skip();
    if (text[i] === '"') {
      i++;
      let out = "";
      while (i < text.length && text[i] !== '"') {
        if (text[i] === "\\" && i + 1 < text.length) {
          const n = text[i + 1];
          out += n === "n" ? "\n" : n === "t" ? "\t" : n;
          i += 2;
        } else out += text[i++];
      }
      i++;
      return out;
    }
    let out = "";
    while (i < text.length && !/[\s{}"]/.test(text[i])) out += text[i++];
    return out;
  };
  const readObject = () => {
    const obj = {};
    for (;;) {
      skip();
      if (i >= text.length) return obj;
      if (text[i] === "}") {
        i++;
        return obj;
      }
      const key = readString();
      skip();
      if (text[i] === "{") {
        i++;
        obj[key] = readObject();
      } else {
        obj[key] = readString();
      }
    }
  };
  return readObject();
};

const escapeVdf = (value) =>
  String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const writeVdf = (obj, depth = 0) => {
  const pad = "\t".repeat(depth);
  let out = "";
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      out += `${pad}"${escapeVdf(key)}"\n${pad}{\n${writeVdf(value, depth + 1)}${pad}}\n`;
    } else {
      out += `${pad}"${escapeVdf(key)}"\t\t"${escapeVdf(value)}"\n`;
    }
  }
  return out;
};

/** Case-insensitive key lookup, since Steam is not consistent about key casing. */
const findKey = (obj, name) =>
  Object.keys(obj).find((key) => key.toLowerCase() === name.toLowerCase());

const setKey = (obj, name, value) => {
  obj[findKey(obj, name) ?? name] = value;
};

const getKey = (obj, name) => {
  const key = findKey(obj, name);
  return key === undefined ? undefined : obj[key];
};

// ---------------------------------------------------------------------------

/** Steam's per-user data folder (where config/loginusers.vdf lives). */
const steamRoot = (steam) => {
  if (steam.dataDir) return steam.dataDir;
  if (isMac) return path.join(os.homedir(), "Library", "Application Support", "Steam");
  return "";
};

/**
 * Marks `username` as the most recent account in loginusers.vdf so the client offers
 * (and resumes) that one. Returns true when the account has a saved entry.
 */
const updateLoginUsers = (root, username) => {
  const file = path.join(root, "config", "loginusers.vdf");
  if (!fs.existsSync(file)) {
    log("autologin: no loginusers.vdf at", file);
    return false;
  }

  const data = parseVdf(fs.readFileSync(file, "utf8"));
  const users = getKey(data, "users");
  if (!users || typeof users !== "object") return false;

  let found = false;
  for (const entry of Object.values(users)) {
    if (!entry || typeof entry !== "object") continue;
    const name = String(getKey(entry, "AccountName") ?? "");
    const isTarget = name.toLowerCase() === username.toLowerCase();
    if (isTarget) found = true;
    setKey(entry, "MostRecent", isTarget ? "1" : "0");
  }

  fs.writeFileSync(file, writeVdf(data));
  log("autologin: loginusers.vdf updated, saved entry for user:", found);
  return found;
};

/** Points the client's AutoLoginUser at `username` ("" makes it show the account picker). */
const setAutoLoginUser = async (username) => {
  if (isWindows) {
    const key = "HKCU\\Software\\Valve\\Steam";
    await execFileAsync(
      "reg.exe",
      ["add", key, "/v", "AutoLoginUser", "/t", "REG_SZ", "/d", username, "/f"],
      { windowsHide: true },
    );
    if (username) {
      await execFileAsync(
        "reg.exe",
        ["add", key, "/v", "RememberPassword", "/t", "REG_DWORD", "/d", "1", "/f"],
        { windowsHide: true },
      );
    }
    return;
  }

  const home = os.homedir();
  const candidates = isLinux
    ? [
        path.join(home, ".steam", "registry.vdf"),
        path.join(home, ".var", "app", "com.valvesoftware.Steam", ".steam", "registry.vdf"),
        path.join(home, "snap", "steam", "common", ".steam", "registry.vdf"),
      ]
    : [path.join(home, "Library", "Application Support", "Steam", "registry.vdf")];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const data = parseVdf(fs.readFileSync(file, "utf8"));
    let node = data;
    for (const part of ["Registry", "HKCU", "Software", "Valve", "Steam"]) {
      let next = getKey(node, part);
      if (!next || typeof next !== "object") {
        next = {};
        setKey(node, part, next);
      }
      node = next;
    }
    setKey(node, "AutoLoginUser", username);
    if (username) setKey(node, "RememberPassword", "1");
    fs.writeFileSync(file, writeVdf(data));
    log("autologin: registry.vdf updated", file);
  }
};

/**
 * Makes the next Steam start sign in to `username` instead of whoever was signed in last.
 * Must run while Steam is closed, since Steam rewrites these files on exit.
 */
export const prepareAutoLogin = async (steam, username) => {
  try {
    const root = steamRoot(steam);
    const saved = root ? updateLoginUsers(root, username) : false;
    // without a saved session there is nothing to resume, so open the account picker
    await setAutoLoginUser(saved ? username : "");
    log("autologin: target", saved ? username : "(account picker)");
  } catch (error) {
    log("autologin: failed to prepare", error.message);
  }
};
