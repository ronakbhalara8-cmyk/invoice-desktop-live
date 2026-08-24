"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    async function handleLogin(event) {
        event.preventDefault();

        setLoading(true);
        setError("");

        try {
            const result =
                await apiRequest(
                    "/auth/login",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );

            if (!result.success) {
                setError(
                    result.message ||
                    "Login failed"
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Save Token Inside Electron
            |--------------------------------------------------------------------------
            */

            if (
                window.electronAPI
            ) {
                await window.electronAPI
                    .saveAuthToken(
                        result.token
                    );
            }

            sessionStorage.setItem(
                "token",
                result.token
            );

            /*
            |--------------------------------------------------------------------------
            | Store Basic User Information
            |--------------------------------------------------------------------------
            */

            sessionStorage.setItem(
                "user",
                JSON.stringify(
                    result.user
                )
            );

            router.push(
                "/invoices"
            );

        } catch (error) {
            setError(
                "Unable to connect to server."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

            <div className="w-full max-w-md">

                <div className="rounded-2xl bg-white p-8 shadow-xl">

                    <h1 className="text-2xl font-bold text-slate-900">
                        Invoice Manager
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Sign in to continue
                    </p>

                    {error && (
                        <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <form
                        onSubmit={handleLogin}
                        className="mt-6 space-y-4"
                    >

                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(event) =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-slate-500"
                            required
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(event) =>
                                setPassword(
                                    event.target.value
                                )
                            }
                            className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-slate-500"
                            required
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading
                                ? "Signing in..."
                                : "Sign In"}
                        </button>

                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        New to Invoice Manager?{" "}
                        <button
                            type="button"
                            onClick={() => router.push("/register")}
                            className="font-semibold text-slate-900 hover:underline"
                        >
                            Create an account
                        </button>
                    </p>

                </div>

            </div>

        </main>
    );
}