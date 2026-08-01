import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, Menu, ipcMain } from "electron";
import {
  addAccount,
  getSettings,
  listAccounts,
  removeAccount,
  setSettings,
} from "./store.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = !app.isPackaged;

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

  if (isDevelopment) {
    await win.loadURL("http://127.0.0.1:5173");
    return;
  }

  await win.loadFile(path.join(dirname, "dist", "index.html"));
};

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  ipcMain.handle("accounts:list", () => listAccounts());
  ipcMain.handle("accounts:add", (_event, account) => addAccount(account));
  ipcMain.handle("accounts:remove", (_event, id) => removeAccount(id));
  ipcMain.handle("settings:get", () => getSettings());
  ipcMain.handle("settings:set", (_event, settings) => setSettings(settings));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
