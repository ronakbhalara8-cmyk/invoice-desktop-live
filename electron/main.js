const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");

const path = require("path");
const { isServerAvailable } = require("./sync");
const { startProductionServices, stopAllServices } = require("./services");

let mainWindow;
let authToken = null;
const isDev = !app.isPackaged;

async function createWindow() {
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

    mainWindow.loadURL("http://localhost:3000");
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

app.whenReady().then(async () => {
    // In production, start the local servers before creating the window
    if (!isDev) {
        try {
            await startProductionServices();
            console.log("[Electron] Production services started, creating window");
        } catch (error) {
            console.error("[Electron] Failed to start production services:", error.message);
            app.quit();
            return;
        }
    }

    await createWindow();

    app.on("activate", async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            await createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    // Stop all services in production mode
    if (!isDev) {
        stopAllServices();
    }

    if (process.platform !== "darwin") {
        app.quit();
    }
});

// Clean up on app quit
app.on("before-quit", () => {
    if (!isDev) {
        stopAllServices();
    }
});
