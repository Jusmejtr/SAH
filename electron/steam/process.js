import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { log } from "../log.js";
import { throwIfCancelled } from "../errors.js";

const execFileAsync = promisify(execFile);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";
export const isLinux = process.platform === "linux";

const FLATPAK_ID = "com.valvesoftware.Steam";

/**
 * A located Steam installation.
 * @typedef {object} SteamInstall
 * @property {string} flavor   "windows" | "native" | "flatpak" | "snap" | "mac"
 * @property {string} dataDir  Steam root folder (where the CEF marker file goes), or "" if unknown
 * @property {string[]} command  Program and arguments that start Steam
 */

// ---------------------------------------------------------------------------
// Linux helpers

/** Environment for Steam, without the AppImage's own paths leaking into it. */
const childEnv = () => {
  const env = { ...process.env };
  const appDir = env.APPDIR;
  for (const key of ["APPDIR", "APPIMAGE", "ARGV0", "OWD", "ELECTRON_RUN_AS_NODE"]) {
    delete env[key];
  }
  if (appDir) {
    for (const [key, value] of Object.entries(env)) {
      if (typeof value !== "string" || !value.includes(appDir)) continue;
      const kept = value
        .split(":")
        .filter((part) => part && !part.startsWith(appDir));
      if (kept.length) env[key] = kept.join(":");
      else delete env[key];
    }
  }
  return env;
};

const findOnPath = (name) => {
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) continue;
    const candidate = path.join(dir, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // not here
    }
  }
  return "";
};

const isSteamRoot = (dir) =>
  fs.existsSync(path.join(dir, "steam.sh")) ||
  fs.existsSync(path.join(dir, "ubuntu12_32"));

/** First existing Steam root among `candidates`, with symlinks resolved. */
const firstRoot = (candidates) => {
  for (const candidate of candidates) {
    try {
      const real = fs.realpathSync(candidate);
      if (isSteamRoot(real)) return real;
    } catch {
      // missing
    }
  }
  return "";
};

/** When the install was last used, so the right one wins if there are several. */
const lastUsed = (dataDir) => {
  for (const file of ["config/loginusers.vdf", "registry.vdf", "steam.sh"]) {
    try {
      return fs.statSync(path.join(dataDir, file)).mtimeMs;
    } catch {
      // try the next one
    }
  }
  return 0;
};

const resolveLinuxSteam = () => {
  const home = os.homedir();
  const installs = [];

  const steamCmd = findOnPath("steam");
  const nativeRoot = firstRoot([
    path.join(home, ".steam", "steam"),
    path.join(home, ".steam", "root"),
    path.join(home, ".local", "share", "Steam"),
    path.join(home, ".steam", "debian-installation"),
  ]);
  if (nativeRoot) {
    const script = path.join(nativeRoot, "steam.sh");
    const command = steamCmd || (fs.existsSync(script) ? script : "");
    if (command) installs.push({ flavor: "native", dataDir: nativeRoot, command: [command] });
  }

  const flatpakCmd = findOnPath("flatpak");
  const flatpakHome = path.join(home, ".var", "app", FLATPAK_ID);
  const flatpakRoot = firstRoot([
    path.join(flatpakHome, ".local", "share", "Steam"),
    path.join(flatpakHome, "data", "Steam"),
    path.join(flatpakHome, ".steam", "steam"),
  ]);
  if (flatpakCmd && flatpakRoot) {
    installs.push({
      flavor: "flatpak",
      dataDir: flatpakRoot,
      command: [flatpakCmd, "run", FLATPAK_ID],
    });
  }

  const snapCmd = findOnPath("snap");
  const snapHome = path.join(home, "snap", "steam", "common");
  const snapRoot = firstRoot([
    path.join(snapHome, ".local", "share", "Steam"),
    path.join(snapHome, ".steam", "steam"),
  ]);
  if (snapCmd && snapRoot) {
    installs.push({ flavor: "snap", dataDir: snapRoot, command: [snapCmd, "run", "steam"] });
  }

  if (installs.length === 0) {
    if (steamCmd) {
      log("steam: found", steamCmd, "but no Steam data folder, start Steam once first");
    }
    throw new Error("Steam installation was not found.");
  }

  // stable sort: on equal time the order above (native, flatpak, snap) wins
  installs.sort((a, b) => lastUsed(b.dataDir) - lastUsed(a.dataDir));
  log(
    "steam: installs",
    installs.map((install) => `${install.flavor}:${install.dataDir}`).join(" | "),
  );
  return installs[0];
};

/** PIDs of this user's processes whose name is one of `names`. */
const findLinuxProcesses = (names) => {
  const wanted = new Set(names);
  const uid = process.getuid?.();
  const pids = [];
  let entries = [];
  try {
    entries = fs.readdirSync("/proc");
  } catch {
    return pids;
  }
  for (const entry of entries) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const comm = fs.readFileSync(`/proc/${entry}/comm`, "utf8").trim();
      if (!wanted.has(comm)) continue;
      if (uid !== undefined && fs.statSync(`/proc/${entry}`).uid !== uid) continue;
      pids.push(Number(entry));
    } catch {
      // the process exited meanwhile
    }
  }
  return pids;
};

const killLinuxProcesses = (names, signal) => {
  for (const pid of findLinuxProcesses(names)) {
    try {
      process.kill(pid, signal);
    } catch {
      // already gone or not ours
    }
  }
};

// ---------------------------------------------------------------------------

export const isSteamRunning = async () => {
  if (isWindows) {
    const { stdout } = await execFileAsync(
      "tasklist.exe",
      ["/FI", "IMAGENAME eq steam.exe", "/NH"],
      { windowsHide: true },
    );
    return stdout.toLowerCase().includes("steam.exe");
  }

  if (isLinux) return findLinuxProcesses(["steam"]).length > 0;

  try {
    await execFileAsync("pgrep", ["-x", "steam_osx"]);
    return true;
  } catch {
    return false;
  }
};

/** Starts the Steam client from a located install. */
export const launchSteam = (steam) => {
  if (isWindows) {
    spawn(steam.command[0], [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  if (isLinux) {
    const [program, ...args] = steam.command;
    const child = spawn(program, args, {
      detached: true,
      stdio: "ignore",
      env: childEnv(),
    });
    child.on("error", (error) => log("launch: failed", error.message));
    child.unref();
    return;
  }

  spawn("open", ["-a", steam.command[0]], { detached: true, stdio: "ignore" }).unref();
};

/** @param {SteamInstall} steam */
export const shutdownSteam = async (steam, job, timeoutMs = 15000) => {
  if (!(await isSteamRunning())) {
    log("shutdown: steam was not running");
    return;
  }

  if (isWindows) {
    spawn(steam.command[0], ["-shutdown"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  } else if (isLinux) {
    const [program, ...args] = steam.command;
    const child = spawn(program, [...args, "-shutdown"], {
      detached: true,
      stdio: "ignore",
      env: childEnv(),
    });
    child.on("error", (error) => log("shutdown: failed", error.message));
    child.unref();
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

  log("shutdown: forcing kill");
  if (isWindows) {
    await execFileAsync("taskkill.exe", ["/F", "/IM", "steam.exe", "/T"], {
      windowsHide: true,
    }).catch(() => {});
  } else if (isLinux) {
    // the web helpers would keep the CEF debugging port busy
    killLinuxProcesses(["steam", "steamwebhelper"], "SIGKILL");
  } else {
    await execFileAsync("pkill", ["-x", "steam_osx"]).catch(() => {});
  }
  await delay(2500);
};

/** @returns {Promise<SteamInstall>} */
export const resolveSteam = async () => {
  if (isWindows) {
    const exe = await resolveWindowsSteamExe();
    return { flavor: "windows", dataDir: path.dirname(exe), command: [exe] };
  }
  if (isLinux) return resolveLinuxSteam();
  if (isMac) return { flavor: "mac", dataDir: "", command: ["/Applications/Steam.app"] };
  throw new Error("Automatic Steam login is supported on Windows only.");
};

const resolveWindowsSteamExe = async () => {
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
