const {
    contextBridge,
    ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
    "electronAPI",
    {
        isElectron: true,

        getAppVersion: () => {
            return process.versions.electron;
        },

        saveAuthToken: (token) => {
            return ipcRenderer.invoke(
                "auth:save-token",
                token
            );
        },

        removeAuthToken: () => {
            return ipcRenderer.invoke(
                "auth:remove-token"
            );
        },

        getAuthStatus: () => {
            return ipcRenderer.invoke(
                "auth:status"
            );
        },

        checkServer: () => {
            return ipcRenderer.invoke(
                "sync:check-server"
            );
        }
    }
);