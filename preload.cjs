const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sah", {
  listAccounts: () => ipcRenderer.invoke("accounts:list"),
  addAccount: (account) => ipcRenderer.invoke("accounts:add", account),
  removeAccount: (id) => ipcRenderer.invoke("accounts:remove", id),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (settings) => ipcRenderer.invoke("settings:set", settings),
});
