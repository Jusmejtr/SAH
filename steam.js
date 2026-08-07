import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { clipboard } from "electron";
import { generateGuardCode } from "./steamGuard.js";
import { applyMostRecentUser } from "./loginUsers.js";
import { log } from "./log.js";

const execFileAsync = promisify(execFile);

const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

const GUARD_PROMPT_DELAY_MS = 6000;

const TITLE_PATTERN = "Sign in to Steam|Steam Login|Steam Guard|Prihl";

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

const runPowerShell = (script, env = {}, job, label = "powershell") => {
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
      (error, stdout, stderr) => {
        job?.children.delete(child);
        fs.rmSync(file, { force: true });

        log(`[${label}] exit=${error?.code ?? 0}`);
        if (stdout.trim()) log(`[${label}] stdout:\n${stdout.trim()}`);
        if (stderr.trim()) log(`[${label}] stderr:\n${stderr.trim()}`);

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
      // Steam keeps writing its config files for a moment after the process is gone.
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

// The new client ignores a password passed on the command line, so only the username is prefilled.
const launchSteam = (steamExe, username) => {
  const args = ["-login", username];

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

const escapeSendKeys = (value) =>
  String(value).replace(/[+^%~(){}\[\]]/g, (character) => `{${character}}`);

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

// The sign-in UI belongs to steamwebhelper.exe, so the window has to be found by
// title across every Steam process instead of through steam.exe's MainWindow.
const WIN32_TYPES = `
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class SahWin32 {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int processId);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@

function Get-SteamWindows {
  $script:hits = @()
  $callback = [SahWin32+EnumProc]{
    param($hWnd, $lParam)
    if (-not [SahWin32]::IsWindowVisible($hWnd)) { return $true }
    $builder = New-Object System.Text.StringBuilder 512
    [void][SahWin32]::GetWindowText($hWnd, $builder, $builder.Capacity)
    $title = $builder.ToString()
    if (-not $title) { return $true }
    $ownerId = 0
    [void][SahWin32]::GetWindowThreadProcessId($hWnd, [ref]$ownerId)
    $owner = Get-Process -Id $ownerId -ErrorAction SilentlyContinue
    if ($owner -and $owner.ProcessName -like 'steam*') {
      $script:hits += [pscustomobject]@{
        Handle = [int64]$hWnd
        Title = $title
        Process = $owner.ProcessName
      }
    }
    return $true
  }
  [void][SahWin32]::EnumWindows($callback, [IntPtr]::Zero)
  return $script:hits
}
`;

const WAIT_FOR_WINDOW = `${WIN32_TYPES}
$pattern = $env:SAH_TITLE_PATTERN
$deadline = (Get-Date).AddSeconds([int]$env:SAH_WAIT_SECONDS)
$seen = ''

while ((Get-Date) -lt $deadline) {
  $windows = @(Get-SteamWindows)
  $snapshot = ($windows | ForEach-Object { "$($_.Process)|$($_.Title)" }) -join ';'
  if ($snapshot -ne $seen) {
    $seen = $snapshot
    foreach ($window in $windows) {
      Write-Output "SEEN\`t$($window.Process)\`t$($window.Handle)\`t$($window.Title)"
    }
    if ($windows.Count -eq 0) { Write-Output "SEEN\`t(no steam windows)" }
  }

  $match = $windows | Where-Object { $_.Title -match $pattern } | Select-Object -First 1
  if ($match) { Write-Output "MATCH\`t$($match.Handle)"; exit 0 }
  Start-Sleep -Milliseconds 500
}

$fallback = @(Get-SteamWindows) | Select-Object -First 1
if ($fallback) { Write-Output "FALLBACK\`t$($fallback.Handle)"; exit 0 }
exit 2
`;

const FOCUS_WINDOW = `${WIN32_TYPES}
Add-Type -AssemblyName System.Windows.Forms
$handle = [IntPtr][int64]$env:SAH_WINDOW_HANDLE
[void][SahWin32]::ShowWindow($handle, 9)
[void][SahWin32]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 900

$active = [SahWin32]::GetForegroundWindow()
Write-Output "FOREGROUND\`t$([int64]$active)\`texpected\`t$([int64]$handle)"
if ($active -ne $handle) { exit 3 }
`;

const SEND_CREDENTIALS = `${FOCUS_WINDOW}
[System.Windows.Forms.SendKeys]::SendWait('^a')
[System.Windows.Forms.SendKeys]::SendWait($env:SAH_USERNAME)
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait('{TAB}')
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait('^a')
[System.Windows.Forms.SendKeys]::SendWait($env:SAH_PASSWORD)
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
Write-Output 'CREDENTIALS-SENT'
`;

const SEND_CODE = `${FOCUS_WINDOW}
[System.Windows.Forms.SendKeys]::SendWait($env:SAH_GUARD_CODE)
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
Write-Output 'CODE-SENT'
`;

/** Returns the sign-in window handle, or "" when Steam signed in without asking. */
const findSignInWindow = async (job, waitSeconds) => {
  let output = "";
  try {
    output = await runPowerShell(
      WAIT_FOR_WINDOW,
      {
        SAH_WAIT_SECONDS: String(waitSeconds),
        SAH_TITLE_PATTERN: TITLE_PATTERN,
      },
      job,
      "wait-for-window",
    );
  } catch (error) {
    throwIfCancelled(job);
    if (error instanceof CancelledError) throw error;
    return "";
  }
  throwIfCancelled(job);

  const result = output
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
    .find(([kind]) => kind === "MATCH" || kind === "FALLBACK");

  if (!result) return "";

  log("login: using window", result[1], "via", result[0]);
  return result[1];
};

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
    log("login: exe", steamExe, "user", username, "hasSecret", Boolean(sharedSecret));
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
      log("login: remembered session", remembered);
      throwIfCancelled(job);
    }

    onProgress("Starting Steam");
    launchSteam(steamExe, username);

    if (!isWindows) {
      if (sharedSecret) clipboard.writeText(generateGuardCode(sharedSecret));
      return { status: "code-copied" };
    }

    onProgress("Waiting for the Steam sign-in window");
    const handle = await findSignInWindow(job, remembered ? 30 : 60);

    if (!handle) {
      log("login: no sign-in window, Steam restored the saved session");
      return { status: "auto-login" };
    }

    onProgress("Entering credentials");
    await runPowerShell(
      SEND_CREDENTIALS,
      {
        SAH_WINDOW_HANDLE: handle,
        SAH_USERNAME: escapeSendKeys(username),
        SAH_PASSWORD: escapeSendKeys(password),
      },
      job,
      "send-credentials",
    ).catch((error) => {
      throwIfCancelled(job);
      log("login: credential typing failed", error.message);
    });
    throwIfCancelled(job);

    if (!sharedSecret) return { status: "launched" };

    onProgress("Waiting for the Steam Guard prompt");
    await delay(GUARD_PROMPT_DELAY_MS);
    throwIfCancelled(job);

    try {
      onProgress("Entering Steam Guard code");
      await runPowerShell(
        SEND_CODE,
        {
          SAH_WINDOW_HANDLE: handle,
          SAH_GUARD_CODE: generateGuardCode(sharedSecret),
        },
        job,
        "send-code",
      );
      return { status: "signed-in" };
    } catch (error) {
      throwIfCancelled(job);
      if (error instanceof CancelledError) throw error;
      clipboard.writeText(generateGuardCode(sharedSecret));
      return { status: "code-copied" };
    }
  } catch (error) {
    log("login: failed", error.message);
    throw error;
  } finally {
    if (activeJob === job) activeJob = null;
  }
};
