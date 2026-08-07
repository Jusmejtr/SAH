const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sah", {
  listAccounts: () => ipcRenderer.invoke("accounts:list"),
  addAccount: (account) => ipcRenderer.invoke("accounts:add", account),
  removeAccount: (id) => ipcRenderer.invoke("accounts:remove", id),
  loginAccount: (id) => ipcRenderer.invoke("accounts:login", id),
  cancelLogin: () => ipcRenderer.invoke("accounts:login-cancel"),
  onLoginProgress: (callback) => {
    const listener = (_event, step) => callback(step);
    ipcRenderer.on("login:progress", listener);
    return () => ipcRenderer.removeListener("login:progress", listener);
  },
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (settings) => ipcRenderer.invoke("settings:set", settings),
});
