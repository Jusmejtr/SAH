import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { clipboard } from "electron";
import { generateGuardCode } from "./steamGuard.js";
import { applyMostRecentUser } from "./loginUsers.js";

const execFileAsync = promisify(execFile);

const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

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
  for (const child of activeJob.children) child.kill();
  return true;
};

const runPowerShell = (script, env = {}, job) => {
  const file = path.join(
    os.tmpdir(),
    `sah-${crypto.randomBytes(8).toString("hex")}.ps1`,
  );
  fs.writeFileSync(file, script, { mode: 0o600 });

  return new Promise((resolve, reject) => {
    const child = execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        file,
      ],
      { env: { ...process.env, ...env }, windowsHide: true },
      (error, stdout) => {
        job?.children.delete(child);
        fs.rmSync(file, { force: true });
        if (error) reject(error);
        else resolve(stdout.trim());
      },
    );
    job?.children.add(child);
  });
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

/** Graceful `-shutdown` first, force kill only if Steam ignores it. */
export const shutdownSteam = async (steamExe, job, timeoutMs = 15000) => {
  if (!(await isSteamRunning())) return;

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
    if (!(await isSteamRunning())) return;
  }

  if (isWindows) {
    await execFileAsync("taskkill.exe", ["/F", "/IM", "steam.exe", "/T"], {
      windowsHide: true,
    }).catch(() => {});
  } else {
    await execFileAsync("pkill", ["-x", "steam_osx"]).catch(() => {});
  }
  await delay(1500);
};

const launchSteam = (steamExe, username, password, remembered) => {
  // A remembered account signs in from its stored token, so passing credentials would
  // re-open the login form instead.
  const args = remembered ? [] : ["-login", username, password];

  if (isWindows) {
    spawn(steamExe, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  spawn("open", ["-a", steamExe, "--args", ...args], {
    detached: true,
    stdio: "ignore",
  }).unref();
};

const setAutoLoginUser = async (username) => {
  const key = "HKCU\\Software\\Valve\\Steam";
  await execFileAsync(
    "reg.exe",
    ["add", key, "/v", "AutoLoginUser", "/t", "REG_SZ", "/d", username, "/f"],
    { windowsHide: true },
  );
  await execFileAsync(
    "reg.exe",
    ["add", key, "/v", "RememberPassword", "/t", "REG_DWORD", "/d", "1", "/f"],
    { windowsHide: true },
  );
};

const WAIT_FOR_WINDOW = `
$deadline = (Get-Date).AddSeconds([int]$env:SAH_WAIT_SECONDS)
while ((Get-Date) -lt $deadline) {
  $proc = Get-Process -Name steam -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } |
    Select-Object -First 1
  if ($proc) { Write-Output $proc.Id; exit 0 }
  Start-Sleep -Milliseconds 500
}
exit 2
`;

const SEND_CODE = `
Add-Type -AssemblyName System.Windows.Forms
$shell = New-Object -ComObject WScript.Shell
if (-not $shell.AppActivate([int]$env:SAH_STEAM_PID)) { exit 3 }
Start-Sleep -Milliseconds 600
[System.Windows.Forms.SendKeys]::SendWait($env:SAH_GUARD_CODE)
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
`;

/**
 * Restarts Steam and signs the given account in.
 * The Steam Guard code is generated after the login window appears so it cannot expire mid-flow.
 */
export const loginToSteam = async (
  { username, password, sharedSecret },
  onProgress = () => {},
) => {
  const job = { cancelled: false, children: new Set() };
  activeJob = job;

  try {
    onProgress("Locating Steam");
    const steamExe = await resolveSteamExe();
    throwIfCancelled(job);

    onProgress("Closing running Steam");
    await shutdownSteam(steamExe, job);
    throwIfCancelled(job);

    let remembered = false;
    if (isWindows) {
      onProgress("Preparing account data");
      // Both steps are needed: the registry value picks the account, the vdf flag
      // stops the client from showing its account picker.
      remembered = applyMostRecentUser(path.dirname(steamExe), username);
      await setAutoLoginUser(username);
      throwIfCancelled(job);
    }

    onProgress("Starting Steam");
    launchSteam(steamExe, username, password, remembered);

    if (remembered) {
      if (sharedSecret) clipboard.writeText(generateGuardCode(sharedSecret));
      return { status: "auto-login" };
    }

    if (!sharedSecret) return { status: "launched" };

    if (!isWindows) {
      clipboard.writeText(generateGuardCode(sharedSecret));
      return { status: "code-copied" };
    }

    try {
      onProgress("Waiting for the Steam window");
      const pid = await runPowerShell(
        WAIT_FOR_WINDOW,
        { SAH_WAIT_SECONDS: "60" },
        job,
      );
      throwIfCancelled(job);

      onProgress("Entering Steam Guard code");
      const code = generateGuardCode(sharedSecret);
      await runPowerShell(
        SEND_CODE,
        { SAH_STEAM_PID: pid, SAH_GUARD_CODE: code },
        job,
      );
      return { status: "signed-in" };
    } catch (error) {
      throwIfCancelled(job);
      if (error instanceof CancelledError) throw error;
      clipboard.writeText(generateGuardCode(sharedSecret));
      return { status: "code-copied" };
    }
  } finally {
    if (activeJob === job) activeJob = null;
  }
};
