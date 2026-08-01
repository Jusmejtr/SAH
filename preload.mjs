import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("sah", {
  listAccounts: () => ipcRenderer.invoke("accounts:list"),
  addAccount: (account) => ipcRenderer.invoke("accounts:add", account),
  removeAccount: (id) => ipcRenderer.invoke("accounts:remove", id),
});
