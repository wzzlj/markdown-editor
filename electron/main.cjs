const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const isDev = !app.isPackaged && process.env.npm_lifecycle_event === "dev";
const zh = {
  openMarkdown: "\u6253\u5f00 Markdown \u6587\u4ef6",
  saveMarkdown: "\u4fdd\u5b58 Markdown \u6587\u4ef6",
  saveMarkdownAs: "\u53e6\u5b58\u4e3a Markdown \u6587\u4ef6",
  markdown: "\u004d\u0061\u0072\u006b\u0064\u006f\u0077\u006e",
  text: "\u6587\u672c",
  allFiles: "\u6240\u6709\u6587\u4ef6",
  closeTitle: "\u6709\u672a\u4fdd\u5b58\u7684\u4fee\u6539",
  closeMessage: "\u5f53\u524d\u6587\u6863\u5df2\u4fee\u6539\uff0c\u662f\u5426\u5148\u4fdd\u5b58\u518d\u9000\u51fa\uff1f",
  closeDetail: "\u5982\u679c\u4e0d\u4fdd\u5b58\uff0c\u6700\u8fd1\u7684\u4fee\u6539\u5c06\u4e22\u5931\u3002",
  saveFailedTitle: "\u4fdd\u5b58\u5931\u8d25",
  saveFailedMessage: "\u6587\u6863\u672a\u80fd\u4fdd\u5b58\uff0c\u5df2\u53d6\u6d88\u9000\u51fa\u3002",
  save: "\u4fdd\u5b58",
  discard: "\u4e0d\u4fdd\u5b58",
  cancel: "\u53d6\u6d88"
};

let currentDocument = {
  filePath: null,
  content: "",
  isDirty: false
};

async function saveDocument(parentWindow) {
  if (!currentDocument.filePath) {
    const result = await dialog.showSaveDialog(parentWindow, {
      title: zh.saveMarkdown,
      defaultPath: "untitled.md",
      filters: [
        { name: zh.markdown, extensions: ["md"] },
        { name: zh.text, extensions: ["txt"] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return false;
    }

    await fs.writeFile(result.filePath, currentDocument.content, "utf8");
    currentDocument = {
      ...currentDocument,
      filePath: result.filePath,
      isDirty: false
    };
    return true;
  }

  await fs.writeFile(currentDocument.filePath, currentDocument.content, "utf8");
  currentDocument = {
    ...currentDocument,
    isDirty: false
  };
  return true;
}

function createWindow() {
  let canClose = false;
  let isShowingClosePrompt = false;
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "\u004d\u0061\u0072\u006b\u0064\u006f\u0077\u006e \u7f16\u8f91\u5668",
    backgroundColor: "#f7f4ed",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("close", async (event) => {
    if (canClose || !currentDocument.isDirty) {
      return;
    }

    event.preventDefault();

    if (isShowingClosePrompt) {
      return;
    }

    isShowingClosePrompt = true;
    const result = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      title: zh.closeTitle,
      message: zh.closeMessage,
      detail: zh.closeDetail,
      buttons: [zh.save, zh.discard, zh.cancel],
      defaultId: 0,
      cancelId: 2,
      noLink: true
    });
    isShowingClosePrompt = false;

    if (result.response === 2) {
      return;
    }

    if (result.response === 0) {
      let didSave = false;

      try {
        didSave = await saveDocument(mainWindow);
      } catch (error) {
        dialog.showErrorBox(zh.saveFailedTitle, zh.saveFailedMessage);
        return;
      }

      if (!didSave) {
        return;
      }
    }

    canClose = true;
    mainWindow.close();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("file:open", async () => {
  const result = await dialog.showOpenDialog({
    title: zh.openMarkdown,
    filters: [
      { name: zh.markdown, extensions: ["md", "markdown", "txt"] },
      { name: zh.allFiles, extensions: ["*"] }
    ],
    properties: ["openFile"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf8");
  currentDocument = { filePath, content, isDirty: false };
  return { filePath, content };
});

ipcMain.handle("file:save", async (_event, payload) => {
  const { filePath, content } = payload;

  if (!filePath) {
    const result = await dialog.showSaveDialog({
      title: zh.saveMarkdown,
      defaultPath: "untitled.md",
      filters: [
        { name: zh.markdown, extensions: ["md"] },
        { name: zh.text, extensions: ["txt"] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await fs.writeFile(result.filePath, content, "utf8");
    currentDocument = { filePath: result.filePath, content, isDirty: false };
    return { filePath: result.filePath };
  }

  await fs.writeFile(filePath, content, "utf8");
  currentDocument = { filePath, content, isDirty: false };
  return { filePath };
});

ipcMain.handle("file:saveAs", async (_event, payload) => {
  const result = await dialog.showSaveDialog({
    title: zh.saveMarkdownAs,
    defaultPath: "untitled.md",
    filters: [
      { name: zh.markdown, extensions: ["md"] },
      { name: zh.text, extensions: ["txt"] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  await fs.writeFile(result.filePath, payload.content, "utf8");
  currentDocument = {
    filePath: result.filePath,
    content: payload.content,
    isDirty: false
  };
  return { filePath: result.filePath };
});

ipcMain.on("document:update-state", (_event, payload) => {
  currentDocument = {
    filePath: payload.filePath ?? null,
    content: payload.content ?? "",
    isDirty: Boolean(payload.isDirty)
  };
});
