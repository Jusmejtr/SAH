import https from "node:https";
import { app, BrowserWindow, shell } from "electron";
import { log } from "./log.js";

const REPO_OWNER = "Jusmejtr";
const REPO_NAME = "SAH";
const RELEASES_PAGE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
const canAutoInstall = () => app.isPackaged && !isPortable;

let status = {
  state: "idle",
  currentVersion: app.getVersion(),
  version: "",
  percent: 0,
  canAutoInstall: canAutoInstall(),
  releaseUrl: RELEASES_PAGE,
  error: "",
};

const broadcast = () => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("update:status", status);
  }
};

const setStatus = (patch) => {
  status = { ...status, ...patch };
  broadcast();
};

export const getUpdateStatus = () => status;

const compareVersions = (a, b) => {
  const parse = (value) =>
    String(value)
      .replace(/^v/i, "")
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);

  const left = parse(a);
  const right = parse(b);

  for (let index = 0; index < 3; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
};

const fetchLatestRelease = () =>
  new Promise((resolve, reject) => {
    const request = https.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      {
        headers: {
          "User-Agent": `SAH/${app.getVersion()}`,
          Accept: "application/vnd.github+json",
        },
        timeout: 10_000,
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`GitHub responded with ${response.statusCode}.`));
          return;
        }

        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
          if (body.length > 1_000_000) {
            request.destroy();
            reject(new Error("Release metadata is too large."));
          }
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("Could not read release metadata."));
          }
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("Update check timed out."));
    });
    request.on("error", reject);
  });

let autoUpdaterPromise;
let autoUpdaterWired = false;

const loadAutoUpdater = () => {
  if (!autoUpdaterPromise) {
    autoUpdaterPromise = import("electron-updater")
      .then((module) => (module.default ?? module).autoUpdater)
      .catch((error) => {
        log("updater: electron-updater unavailable:", error.message);
        return null;
      });
  }

  return autoUpdaterPromise;
};

const wireAutoUpdater = (updater) => {
  if (autoUpdaterWired) return;
  autoUpdaterWired = true;

  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.logger = { info: log, warn: log, error: log, debug: () => {} };

  updater.on("update-available", (info) => {
    log("updater: update available", info.version);
    setStatus({ state: "downloading", version: info.version, percent: 0 });
  });
  updater.on("update-not-available", () => {
    setStatus({ state: "up-to-date", version: status.currentVersion });
  });
  updater.on("download-progress", (progress) => {
    setStatus({ state: "downloading", percent: Math.round(progress.percent) });
  });
  updater.on("update-downloaded", (info) => {
    log("updater: update downloaded", info.version);
    setStatus({ state: "downloaded", version: info.version, percent: 100 });
  });
  updater.on("error", (error) => {
    log("updater: error", error?.message ?? String(error));
    setStatus({ state: "error", error: error?.message ?? "Update failed." });
  });
};

const checkViaGithub = async () => {
  try {
    const release = await fetchLatestRelease();
    const latest = String(release?.tag_name ?? "").replace(/^v/i, "");
    const pageUrl =
      typeof release?.html_url === "string" &&
      release.html_url.startsWith(`https://github.com/${REPO_OWNER}/${REPO_NAME}/`)
        ? release.html_url
        : RELEASES_PAGE;

    if (latest && compareVersions(latest, status.currentVersion) > 0) {
      setStatus({ state: "available", version: latest, releaseUrl: pageUrl });
      return;
    }

    setStatus({
      state: "up-to-date",
      version: latest || status.currentVersion,
      releaseUrl: pageUrl,
    });
  } catch (error) {
    setStatus({ state: "error", error: error.message });
  }
};

export const checkForUpdates = async () => {
  if (status.state === "checking" || status.state === "downloading") {
    return status;
  }

  if (!app.isPackaged) {
    setStatus({ state: "up-to-date", version: status.currentVersion });
    return status;
  }

  setStatus({ state: "checking", error: "" });

  if (canAutoInstall()) {
    const updater = await loadAutoUpdater();

    if (updater) {
      wireAutoUpdater(updater);

      try {
        await updater.checkForUpdates();
        return status;
      } catch (error) {
        log("updater: auto-update check failed:", error?.message ?? String(error));
      }
    }
  }

  await checkViaGithub();
  return status;
};

export const installUpdate = async () => {
  if (status.state === "downloaded") {
    const updater = await loadAutoUpdater();

    if (updater) {
      // quitAndInstall must not run inside the IPC handler's call stack.
      setImmediate(() => updater.quitAndInstall());
      return true;
    }
  }

  await openReleasePage();
  return false;
};

export const openReleasePage = async () => {
  const url = status.releaseUrl || RELEASES_PAGE;
  await shell.openExternal(url);
  return url;
};

export const startUpdateChecks = () => {
  setTimeout(() => void checkForUpdates(), 4000);
  setInterval(() => void checkForUpdates(), CHECK_INTERVAL_MS);
};
