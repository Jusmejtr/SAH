const path = require("node:path");
const { app, BrowserWindow, Menu } = require("electron");

const isDevelopment = !app.isPackaged;

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDevelopment) {
    await win.loadURL("http://127.0.0.1:5173");
    return;
  }

  await win.loadFile(path.join(__dirname, "dist", "index.html"));
};

//Menu.setApplicationMenu(null)

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
