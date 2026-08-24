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

        createInvoice: (invoice) => {
            return ipcRenderer.invoke(
                "invoice:create",
                invoice
            );
        },

        getInvoices: () => {
            return ipcRenderer.invoke(
                "invoice:list"
            );
        },

        syncInvoices: () => {
            return ipcRenderer.invoke(
                "sync:invoices"
            );
        },

        checkServer: () => {
            return ipcRenderer.invoke(
                "sync:check-server"
            );
        }
    }
);