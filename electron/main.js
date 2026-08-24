const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");

const path = require("path");
const { isServerAvailable } = require("./sync");

let mainWindow;
let authToken = null;
const isDev = !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        backgroundColor: "#f8fafc",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadURL(
        isDev ? "http://localhost:3000" : "http://localhost:3000"
    );
}

ipcMain.handle("auth:save-token", async (event, token) => {
    if (!token) {
        return { success: false };
    }

    authToken = token;
    return { success: true };
});

ipcMain.handle("auth:remove-token", async () => {
    authToken = null;
    return { success: true };
});

ipcMain.handle("auth:status", async () => ({
    authenticated: Boolean(authToken)
}));

ipcMain.handle("sync:check-server", async () => ({
    online: await isServerAvailable()
}));

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
