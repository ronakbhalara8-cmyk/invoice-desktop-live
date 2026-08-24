const express =
    require("express");

const pool = require("../db");

const authMiddleware =
    require("../middleware/auth");

const router =
    express.Router();

/*
|--------------------------------------------------------------------------
| GET INVOICES
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authMiddleware,
    async (req, res) => {
        try {
            const result = await pool.query(
                `
        SELECT id, invoice_number, customer_name, amount, status, created_at, updated_at
        FROM invoices
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
                [req.user.id]
            );

            res.json({
                success: true,
                invoices:
                    result.rows
            });

        } catch (error) {
            console.error(error);

            res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to fetch invoices"
                });
        }
    }
);

/*
|--------------------------------------------------------------------------
| CREATE / SYNC INVOICE
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authMiddleware,
    async (req, res) => {
        try {
            const {
                id,
                invoice_number,
                customer_name,
                amount,
                created_at,
                updated_at
            } = req.body;

            if (!id) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invoice ID is required"
                    });
            }

            await pool.query(
                `
                INSERT INTO invoices
                    (id, invoice_number, customer_name, amount, status, created_at, updated_at, user_id)
                VALUES ($1, $2, $3, $4, 'synced', COALESCE($5, now()), COALESCE($6, now()), $7)
                ON CONFLICT (id) DO UPDATE SET
                    invoice_number = EXCLUDED.invoice_number,
                    customer_name = EXCLUDED.customer_name,
                    amount = EXCLUDED.amount,
                    status = EXCLUDED.status,
                    updated_at = EXCLUDED.updated_at
                WHERE invoices.user_id = EXCLUDED.user_id
                `,
                [
                    id,
                    invoice_number,
                    customer_name,
                    amount,
                    created_at,
                    updated_at,
                    req.user.id
                ]
            );

            res.json({
                success: true,
                message:
                    "Invoice synced"
            });

        } catch (error) {
            console.error(error);

            res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Invoice sync failed"
                });
        }
    }
);

module.exports =
    router;