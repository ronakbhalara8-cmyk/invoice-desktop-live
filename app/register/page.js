"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function updateField(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    }

    async function handleRegister(event) {
        event.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const result = await apiRequest("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password
                })
            });

            if (!result.success) {
                setError(result.message || "Registration failed");
                return;
            }

            router.push("/login");
        } catch {
            setError("Unable to connect to server.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Invoice Manager
                </p>
                <h1 className="mt-3 text-3xl font-bold text-slate-900">
                    Create your account
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Register to manage your invoices from the desktop app.
                </p>

                {error && (
                    <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="mt-6 space-y-4">
                    <input
                        name="name"
                        type="text"
                        placeholder="Full name"
                        value={form.name}
                        onChange={updateField}
                        className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-slate-500"
                        required
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={updateField}
                        className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-slate-500"
                        required
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={updateField}
                        minLength={6}
                        className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-slate-500"
                        required
                    />
                    <input
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        value={form.confirmPassword}
                        onChange={updateField}
                        minLength={6}
                        className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-slate-500"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Creating account..." : "Register"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <button
                        type="button"
                        onClick={() => router.push("/login")}
                        className="font-semibold text-slate-900 hover:underline"
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </main>
    );
}