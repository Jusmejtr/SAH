const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sah", {
  listAccounts: () => ipcRenderer.invoke("accounts:list"),
  addAccount: (account) => ipcRenderer.invoke("accounts:add", account),
  removeAccount: (id) => ipcRenderer.invoke("accounts:remove", id),
  exportAccounts: (options) => ipcRenderer.invoke("accounts:export", options),
  loginAccount: (id) => ipcRenderer.invoke("accounts:login", id),
  cancelLogin: () => ipcRenderer.invoke("accounts:login-cancel"),
  openLog: () => ipcRenderer.invoke("debug:open-log"),
  onLoginProgress: (callback) => {
    const listener = (_event, step) => callback(step);
    ipcRenderer.on("login:progress", listener);
    return () => ipcRenderer.removeListener("login:progress", listener);
  },
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (settings) => ipcRenderer.invoke("settings:set", settings),
  getAppVersion: () => ipcRenderer.invoke("app:version"),
  getUpdateStatus: () => ipcRenderer.invoke("update:status"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  openReleasePage: () => ipcRenderer.invoke("update:open-page"),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("update:status", listener);
    return () => ipcRenderer.removeListener("update:status", listener);
  },
});
