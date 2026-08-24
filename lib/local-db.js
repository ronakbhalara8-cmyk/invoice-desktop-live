import Dexie from "dexie";
import { apiRequest } from "./api";

const db = new Dexie("invoice-manager");

db.version(1).stores({
    invoices: "id, invoice_number, created_at, updated_at, status",
    sync_queue: "++id, entity, entity_id, operation, status, created_at, updated_at"
});

export async function createLocalInvoice(invoice) {
    const now = new Date().toISOString();
    const id = invoice.id || crypto.randomUUID();
    const invoiceNumber = invoice.invoice_number?.trim();
    const customerName = invoice.customer_name?.trim();
    const amount = Number(invoice.amount || 0);

    if (!invoiceNumber) {
        return {
            success: false,
            message: "Invoice number is required"
        };
    }

    if (!customerName) {
        return {
            success: false,
            message: "Customer name is required"
        };
    }

    const localInvoice = {
        id,
        invoice_number: invoiceNumber,
        customer_name: customerName,
        amount,
        status: "pending_sync",
        created_at: now,
        updated_at: now
    };

    try {
        await db.transaction("rw", db.invoices, db.sync_queue, async () => {
            await db.invoices.put(localInvoice);
            await db.sync_queue.add({
                entity: "invoice",
                entity_id: id,
                operation: "create",
                payload: localInvoice,
                status: "pending",
                retry_count: 0,
                created_at: now,
                updated_at: now
            });
        });
    } catch (error) {
        console.error("Local invoice save error:", error);
        return {
            success: false,
            message: "Unable to save invoice locally"
        };
    }

    return {
        success: true,
        id,
        message: "Invoice saved locally"
    };
}

export async function getLocalInvoices() {
    const invoices = await db.invoices.orderBy("created_at").reverse().toArray();

    return {
        success: true,
        invoices
    };
}

export async function syncPendingInvoices() {
    if (!navigator.onLine) {
        return {
            success: false,
            offline: true,
            message: "Server unavailable"
        };
    }

    const token = sessionStorage.getItem("token") || "";
    if (!token) {
        return {
            success: false,
            message: "Authentication token missing"
        };
    }

    const queue = await db.sync_queue
        .where("status")
        .equals("pending")
        .sortBy("id");

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
        try {
            const payload = typeof item.payload === "string"
                ? JSON.parse(item.payload)
                : item.payload;

            const result = await apiRequest("/invoices", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!result.success) {
                throw new Error(result.message || "Invoice sync failed");
            }

            await db.transaction("rw", db.invoices, db.sync_queue, async () => {
                await db.invoices.update(item.entity_id, {
                    status: "synced"
                });
                await db.sync_queue.delete(item.id);
            });

            synced++;
        } catch (error) {
            failed++;
            console.error("Invoice sync error:", error);
            await db.sync_queue.update(item.id, {
                retry_count: (item.retry_count || 0) + 1,
                updated_at: new Date().toISOString()
            });
        }
    }

    return {
        success: failed === 0,
        synced,
        failed
    };
}
