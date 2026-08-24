"use client";

import {
    useEffect,
    useState
} from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
import {
    createLocalInvoice,
    getLocalInvoices,
    syncPendingInvoices
} from "../../lib/local-db";

export default function InvoicesPage() {
    const [invoices, setInvoices] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [syncing, setSyncing] =
        useState(false);

    const [online, setOnline] =
        useState(false);

    const [form, setForm] =
        useState({
            invoice_number: "",
            customer_name: "",
            amount: ""
        });

    const router = useRouter();

    async function handleLogout() {
        if (window.electronAPI) {
            await window.electronAPI.removeAuthToken();
        }

        sessionStorage.removeItem("user");
        router.replace("/login");
    }

    /*
    |--------------------------------------------------------------------------
    | Load Local Invoices
    |--------------------------------------------------------------------------
    */

    async function loadInvoices() {
        if (!window.electronAPI) {
            const result = await apiRequest(
                "/invoices",
                {
                    headers: {
                        Authorization:
                            `Bearer ${sessionStorage.getItem("token") || ""}`
                    }
                }
            );

            if (result.success) {
                setInvoices(result.invoices);
            }

            setLoading(false);
            return;
        }

        const result =
            await getLocalInvoices();

        if (result.success) {
            setInvoices(
                result.invoices
            );
        }

        setLoading(false);
    }

    /*
    |--------------------------------------------------------------------------
    | Check Server
    |--------------------------------------------------------------------------
    */

    async function checkOnline() {
        if (!window.electronAPI) {
            try {
                const result = await fetch(
                    "http://localhost:5000/api/health"
                );
                setOnline(result.ok);
            } catch {
                setOnline(false);
            }
            return;
        }

        const result =
            await window.electronAPI
                .checkServer();

        setOnline(
            result.online
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Create Invoice
    |--------------------------------------------------------------------------
    */

    async function createInvoice(
        event
    ) {
        event.preventDefault();

        setSaving(true);

        const invoice = {
            invoice_number: form.invoice_number,
            customer_name: form.customer_name,
            amount: Number(form.amount)
        };

        const result = window.electronAPI
            ? await createLocalInvoice(invoice)
            : await apiRequest("/invoices", {
                method: "POST",
                headers: {
                    Authorization:
                        `Bearer ${sessionStorage.getItem("token") || ""}`
                },
                body: JSON.stringify({
                    ...invoice,
                    id: crypto.randomUUID()
                })
            });

        setSaving(false);

        if (!result.success) {
            alert(
                result.message ||
                "Unable to create invoice"
            );

            return;
        }

        setForm({
            invoice_number: "",
            customer_name: "",
            amount: ""
        });

        if (window.electronAPI && navigator.onLine) {
            syncPendingInvoices().catch((error) => {
                console.error("Immediate sync error:", error);
            });
        }

        await loadInvoices();
    }

    /*
    |--------------------------------------------------------------------------
    | Manual Sync
    |--------------------------------------------------------------------------
    */

    async function syncNow() {
        if (!window.electronAPI) {
            await loadInvoices();
            await checkOnline();
            return;
        }

        setSyncing(true);

        const result =
            await syncPendingInvoices();

        setSyncing(false);

        await loadInvoices();
        await checkOnline();

        if (
            result.success
        ) {
            alert(
                `Sync completed. Synced: ${result.synced || 0
                }`
            );
        } else if (
            result.offline
        ) {
            alert(
                "Server is currently offline."
            );
        } else {
            alert(
                result.message ||
                "Sync failed"
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Initial Load
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        loadInvoices();
        checkOnline();

        const syncWhenOnline = () => {
            if (window.electronAPI) {
                syncPendingInvoices()
                    .then(loadInvoices)
                    .catch((error) => {
                        console.error("Automatic sync error:", error);
                    });
            }
        };

        window.addEventListener("online", syncWhenOnline);

        const interval =
            setInterval(() => {
                checkOnline();
                loadInvoices();
                syncWhenOnline();
            }, 5000);

        return () => {
            clearInterval(interval);
            window.removeEventListener("online", syncWhenOnline);
        };
    }, []);

    return (
        <main className="min-h-screen bg-slate-100 p-8">

            <div className="mx-auto max-w-7xl">

                {/* Header */}

                <div className="mb-8 flex items-center justify-between">

                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Invoices
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Offline-first invoice management
                        </p>
                    </div>

                    <div className="flex items-center gap-3">

                        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">

                            <span
                                className={`h-2.5 w-2.5 rounded-full ${online
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                    }`}
                            />

                            <span className="text-sm font-medium">
                                {online
                                    ? "Online"
                                    : "Offline"}
                            </span>

                        </div>

                        <button
                            onClick={syncNow}
                            disabled={syncing}
                            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {syncing
                                ? "Syncing..."
                                : "Sync Now"}
                        </button>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Logout
                        </button>

                    </div>

                </div>

                {/* Create Invoice */}

                <form
                    onSubmit={createInvoice}
                    className="mb-8 rounded-2xl bg-white p-6 shadow-sm"
                >

                    <h2 className="mb-5 text-lg font-semibold">
                        Create Invoice
                    </h2>

                    <div className="grid gap-4 md:grid-cols-3">

                        <input
                            type="text"
                            placeholder="Invoice Number"
                            value={
                                form.invoice_number
                            }
                            onChange={(event) =>
                                setForm({
                                    ...form,

                                    invoice_number:
                                        event.target.value
                                })
                            }
                            className="rounded-lg border border-slate-200 p-3 outline-none focus:border-slate-500"
                            required
                        />

                        <input
                            type="text"
                            placeholder="Customer Name"
                            value={
                                form.customer_name
                            }
                            onChange={(event) =>
                                setForm({
                                    ...form,

                                    customer_name:
                                        event.target.value
                                })
                            }
                            className="rounded-lg border border-slate-200 p-3 outline-none focus:border-slate-500"
                            required
                        />

                        <input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={
                                form.amount
                            }
                            onChange={(event) =>
                                setForm({
                                    ...form,

                                    amount:
                                        event.target.value
                                })
                            }
                            className="rounded-lg border border-slate-200 p-3 outline-none focus:border-slate-500"
                            required
                        />

                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="mt-5 rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
                    >
                        {saving
                            ? "Saving..."
                            : "Create Invoice"}
                    </button>

                </form>

                {/* Invoice List */}

                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

                    {loading ? (
                        <div className="p-10 text-center text-slate-500">
                            Loading invoices...
                        </div>
                    ) : invoices.length ===
                        0 ? (
                        <div className="p-10 text-center text-slate-500">
                            No invoices found.
                        </div>
                    ) : (
                        <table className="w-full">

                            <thead className="bg-slate-50">

                                <tr>

                                    <th className="p-4 text-left text-sm font-semibold">
                                        Invoice
                                    </th>

                                    <th className="p-4 text-left text-sm font-semibold">
                                        Customer
                                    </th>

                                    <th className="p-4 text-left text-sm font-semibold">
                                        Amount
                                    </th>

                                    <th className="p-4 text-left text-sm font-semibold">
                                        Sync Status
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {invoices.map(
                                    (invoice) => (
                                        <tr
                                            key={
                                                invoice.id
                                            }
                                            className="border-t border-slate-100"
                                        >

                                            <td className="p-4">
                                                {
                                                    invoice.invoice_number
                                                }
                                            </td>

                                            <td className="p-4">
                                                {
                                                    invoice.customer_name
                                                }
                                            </td>

                                            <td className="p-4">
                                                ₹{" "}
                                                {Number(
                                                    invoice.amount
                                                ).toFixed(2)}
                                            </td>

                                            <td className="p-4">

                                                {invoice.status ===
                                                    "synced" ? (
                                                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
                                                        Synced
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-600">
                                                        Pending Sync
                                                    </span>
                                                )}

                                            </td>

                                        </tr>
                                    )
                                )}

                            </tbody>

                        </table>
                    )}

                </div>

            </div>

        </main>
    );
}