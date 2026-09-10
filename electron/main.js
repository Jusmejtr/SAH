import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import {
  addAccount,
  exportAccounts,
  getSecrets,
  getSettings,
  listAccounts,
  removeAccount,
  setSettings,
} from "./store.js";
import { cancelLogin, loginToSteam } from "./steam/index.js";
import { CancelledError } from "./errors.js";
import { log, openLog } from "./log.js";
import {
  checkForUpdates,
  getUpdateStatus,
  installUpdate,
  openReleasePage,
  startUpdateChecks,
} from "./updater.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

const createWindow = async () => {
  const settings = getSettings();
  const win = new BrowserWindow({
    width: settings.width,
    height: settings.height,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(dirname, "preload.cjs"),
    },
  });

  if (settings.maximize) {
    win.maximize();
  }

  if (devServerUrl) {
    await win.loadURL(devServerUrl);
    return;
  }

  await win.loadFile(path.join(dirname, "..", "dist", "index.html"));
};

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  ipcMain.handle("accounts:list", () => listAccounts());
  ipcMain.handle("accounts:add", (_event, account) => addAccount(account));
  ipcMain.handle("accounts:remove", (_event, id) => removeAccount(id));
  ipcMain.handle("accounts:export", async (event, options) => {
    const hostWindow = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(hostWindow ?? undefined, {
      title: "Export Accounts",
      defaultPath: "steam-accounts-export.txt",
      filters: [{ name: "Text Files", extensions: ["txt"] }],
    });

    if (canceled || !filePath) {
      return { cancelled: true, filePath: "", count: 0 };
    }

    const { content, count } = exportAccounts(options);
    fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o600 });

    return {
      cancelled: false,
      filePath,
      count,
    };
  });
  ipcMain.handle("accounts:login", async (event, id) => {
    const report = (step) => {
      if (step) log("step:", step);
      if (!event.sender.isDestroyed()) event.sender.send("login:progress", step);
    };

    try {
      return await loginToSteam(getSecrets(id), report);
    } catch (error) {
      if (error instanceof CancelledError) return { status: "cancelled" };
      throw error;
    } finally {
      report("");
    }
  });
  ipcMain.handle("accounts:login-cancel", () => cancelLogin());
  ipcMain.handle("debug:open-log", () => openLog());
  ipcMain.handle("settings:get", () => getSettings());
  ipcMain.handle("settings:set", (_event, settings) => setSettings(settings));
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("update:status", () => getUpdateStatus());
  ipcMain.handle("update:check", () => checkForUpdates());
  ipcMain.handle("update:install", () => installUpdate());
  ipcMain.handle("update:open-page", () => openReleasePage());

  createWindow();
  startUpdateChecks();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
