const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");

const path = require("path");
const crypto = require("crypto");

const db = require("./database");

const {
    isServerAvailable,
    syncPendingInvoices
} = require("./sync");

let mainWindow;

let authToken = null;

const isDev = !app.isPackaged;

function createWindow() {
    mainWindow =
        new BrowserWindow({
            width: 1440,
            height: 900,

            minWidth: 1100,
            minHeight: 700,

            backgroundColor: "#f8fafc",

            webPreferences: {
                preload: path.join(
                    __dirname,
                    "preload.js"
                ),

                contextIsolation: true,
                nodeIntegration: false
            }
        });

    if (isDev) {
        mainWindow.loadURL(
            "http://localhost:3000"
        );
    } else {
        mainWindow.loadURL(
            "http://localhost:3000"
        );
    }
}

/*
|--------------------------------------------------------------------------
| AUTH TOKEN
|--------------------------------------------------------------------------
*/

ipcMain.handle(
    "auth:save-token",
    async (event, token) => {
        if (!token) {
            return {
                success: false
            };
        }

        authToken = token;

        return {
            success: true
        };
    }
);

ipcMain.handle(
    "auth:remove-token",
    async () => {
        authToken = null;

        return {
            success: true
        };
    }
);

ipcMain.handle(
    "auth:status",
    async () => {
        return {
            authenticated: Boolean(
                authToken
            )
        };
    }
);

/*
|--------------------------------------------------------------------------
| CREATE INVOICE
|--------------------------------------------------------------------------
*/

ipcMain.handle(
    "invoice:create",
    async (event, invoice) => {
        try {
            const now =
                new Date().toISOString();

            const id =
                invoice.id ||
                crypto.randomUUID();

            const invoiceNumber =
                invoice.invoice_number?.trim();

            const customerName =
                invoice.customer_name?.trim();

            const amount =
                Number(invoice.amount || 0);

            if (!invoiceNumber) {
                return {
                    success: false,
                    message:
                        "Invoice number is required"
                };
            }

            if (!customerName) {
                return {
                    success: false,
                    message:
                        "Customer name is required"
                };
            }

            /*
            |--------------------------------------------------------------------------
            | Save Invoice Locally
            |--------------------------------------------------------------------------
            */

            db.prepare(`
        INSERT INTO invoices
        (
          id,
          invoice_number,
          customer_name,
          amount,
          status,
          created_at,
          updated_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?)
      `).run(
                id,
                invoiceNumber,
                customerName,
                amount,
                "pending_sync",
                now,
                now
            );

            /*
            |--------------------------------------------------------------------------
            | Add To Sync Queue
            |--------------------------------------------------------------------------
            */

            db.prepare(`
        INSERT INTO sync_queue
        (
          entity,
          entity_id,
          operation,
          payload,
          status,
          retry_count,
          created_at,
          updated_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
                "invoice",
                id,
                "create",

                JSON.stringify({
                    id,
                    invoice_number:
                        invoiceNumber,
                    customer_name:
                        customerName,
                    amount,
                    created_at: now,
                    updated_at: now
                }),

                "pending",
                0,
                now,
                now
            );

            /*
            |--------------------------------------------------------------------------
            | Try Immediate Sync
            |--------------------------------------------------------------------------
            */

            if (authToken) {
                syncPendingInvoices(
                    db,
                    authToken
                ).catch((error) => {
                    console.error(
                        "Background sync error:",
                        error
                    );
                });
            }

            return {
                success: true,
                id,
                message:
                    "Invoice saved locally"
            };

        } catch (error) {
            console.error(
                "Create invoice error:",
                error
            );

            return {
                success: false,
                message:
                    "Unable to create invoice"
            };
        }
    }
);

/*
|--------------------------------------------------------------------------
| GET LOCAL INVOICES
|--------------------------------------------------------------------------
*/

ipcMain.handle(
    "invoice:list",
    async () => {
        try {
            const invoices =
                db.prepare(`
          SELECT *
          FROM invoices
          ORDER BY created_at DESC
        `).all();

            return {
                success: true,
                invoices
            };

        } catch (error) {
            console.error(error);

            return {
                success: false,
                invoices: []
            };
        }
    }
);

/*
|--------------------------------------------------------------------------
| CHECK SERVER
|--------------------------------------------------------------------------
*/

ipcMain.handle(
    "sync:check-server",
    async () => {
        const available =
            await isServerAvailable();

        return {
            online: available
        };
    }
);

/*
|--------------------------------------------------------------------------
| MANUAL SYNC
|--------------------------------------------------------------------------
*/

ipcMain.handle(
    "sync:invoices",
    async () => {
        if (!authToken) {
            return {
                success: false,
                message:
                    "Please login first"
            };
        }

        return syncPendingInvoices(
            db,
            authToken
        );
    }
);

/*
|--------------------------------------------------------------------------
| AUTOMATIC SYNC
|--------------------------------------------------------------------------
*/

async function automaticSync() {
    if (!authToken) {
        return;
    }

    try {
        const result =
            await syncPendingInvoices(
                db,
                authToken
            );

        if (result.success) {
            console.log(
                "Auto sync completed:",
                result
            );
        }

    } catch (error) {
        console.error(
            "Auto sync error:",
            error
        );
    }
}

/*
|--------------------------------------------------------------------------
| ELECTRON READY
|--------------------------------------------------------------------------
*/

app.whenReady().then(() => {
    createWindow();

    /*
    |--------------------------------------------------------------------------
    | Run Sync Every 10 Seconds
    |--------------------------------------------------------------------------
    */

    setInterval(
        automaticSync,
        10000
    );

    app.on(
        "activate",
        () => {
            if (
                BrowserWindow
                    .getAllWindows()
                    .length === 0
            ) {
                createWindow();
            }
        }
    );
});

/*
|--------------------------------------------------------------------------
| CLOSE
|--------------------------------------------------------------------------
*/

app.on(
    "window-all-closed",
    () => {
        if (
            process.platform !== "darwin"
        ) {
            app.quit();
        }
    }
);