const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("markdownApi", {
  openFile: () => ipcRenderer.invoke("file:open"),
  saveFile: (payload) => ipcRenderer.invoke("file:save", payload),
  saveFileAs: (payload) => ipcRenderer.invoke("file:saveAs", payload),
  updateDocumentState: (payload) => ipcRenderer.send("document:update-state", payload)
});
