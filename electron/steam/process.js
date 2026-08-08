import fs from "node:fs";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { log } from "../log.js";
import { throwIfCancelled } from "../errors.js";

const execFileAsync = promisify(execFile);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

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
