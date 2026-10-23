const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sah", {
  listAccounts: () => ipcRenderer.invoke("accounts:list"),
  addAccount: (account) => ipcRenderer.invoke("accounts:add", account),
  updateAccount: (id, account) =>
    ipcRenderer.invoke("accounts:update", id, account),
  getAccountSecrets: (id) => ipcRenderer.invoke("accounts:secrets", id),
  removeAccount: (id) => ipcRenderer.invoke("accounts:remove", id),
  getGuardCode: (id) => ipcRenderer.invoke("accounts:guard-code", id),
  copyText: (text) => ipcRenderer.invoke("clipboard:write-text", text),
  startGuardSetup: (id) => ipcRenderer.invoke("guard-setup:start", id),
  submitGuardEmailCode: (code) =>
    ipcRenderer.invoke("guard-setup:email-code", code),
  finalizeGuardSetup: (code) => ipcRenderer.invoke("guard-setup:finalize", code),
  cancelGuardSetup: () => ipcRenderer.invoke("guard-setup:cancel"),
  exportMaFile: (id) => ipcRenderer.invoke("accounts:export-mafile", id),
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
  setLanguage: (language) => ipcRenderer.invoke("app:set-language", language),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("update:status", listener);
    return () => ipcRenderer.removeListener("update:status", listener);
  },
});
