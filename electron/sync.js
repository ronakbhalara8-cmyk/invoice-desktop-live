const axios = require("axios");

const API_URL =
    process.env.API_URL ||
    "http://localhost:5000/api";

async function isServerAvailable() {
    try {
        await axios.get(`${API_URL}/health`, {
            timeout: 3000
        });

        return true;
    } catch {
        return false;
    }
}

async function syncPendingInvoices(
    db,
    authToken
) {
    if (!authToken) {
        return {
            success: false,
            message: "Authentication token missing"
        };
    }

    const serverAvailable =
        await isServerAvailable();

    if (!serverAvailable) {
        return {
            success: false,
            offline: true,
            message: "Server unavailable"
        };
    }

    const queue = db
        .prepare(`
      SELECT *
      FROM sync_queue
      WHERE status = 'pending'
      ORDER BY id ASC
    `)
        .all();

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
        try {
            const payload =
                JSON.parse(item.payload);

            if (
                item.entity === "invoice" &&
                item.operation === "create"
            ) {
                await axios.post(
                    `${API_URL}/invoices`,
                    payload,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${authToken}`
                        },
                        timeout: 10000
                    }
                );
            }

            db.prepare(`
        UPDATE invoices
        SET status = 'synced'
        WHERE id = ?
      `).run(item.entity_id);

            db.prepare(`
        DELETE FROM sync_queue
        WHERE id = ?
      `).run(item.id);

            synced++;

        } catch (error) {
            failed++;

            db.prepare(`
        UPDATE sync_queue
        SET
          retry_count = retry_count + 1,
          updated_at = ?
        WHERE id = ?
      `).run(
                new Date().toISOString(),
                item.id
            );
        }
    }

    return {
        success: failed === 0,
        synced,
        failed
    };
}

module.exports = {
    isServerAvailable,
    syncPendingInvoices
};