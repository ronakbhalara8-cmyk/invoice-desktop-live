const { spawn } = require("child_process");
const path = require("path");
const axios = require("axios");
const { app } = require("electron");
const fs = require("fs");
const dotenv = require("dotenv");

let nextProcess = null;
let serverProcess = null;

/**
 * Get bundled Node.js executable.
 *
 * Development:
 * Uses the Node.js executable running the Electron process.
 *
 * Production:
 * Uses:
 *
 * resources/
 * └── bin/
 *     └── node.exe
 */
function getNodeExecutablePath() {
    if (!app.isPackaged) {
        const devNodePath = process.execPath;

        console.log(
            "[Electron] Development Node.js:",
            devNodePath
        );

        return devNodePath;
    }

    const bundledNodePath = path.join(
        process.resourcesPath,
        "bin",
        "node.exe"
    );

    console.log(
        "[Electron] Looking for bundled Node.js at:",
        bundledNodePath
    );

    if (!fs.existsSync(bundledNodePath)) {
        throw new Error(
            `Bundled Node.js not found at:\n${bundledNodePath}\n\n` +
            `Expected:\n${process.resourcesPath}\\bin\\node.exe`
        );
    }

    console.log(
        "[Electron] Using bundled Node.js:",
        bundledNodePath
    );

    return bundledNodePath;
}

/**
 * Get the application runtime path.
 *
 * Development:
 * project root / Electron app path.
 *
 * Production:
 * Uses app.asar.unpacked because external Node.js cannot
 * directly execute JavaScript files from inside app.asar.
 *
 * Production structure:
 *
 * resources/
 * ├── bin/
 * │   └── node.exe
 * ├── app.asar
 * └── app.asar.unpacked/
 *     ├── .next/
 *     │   └── standalone/
 *     │       └── server.js
 *     └── server/
 *         └── index.js
 */
function getRuntimeAppPath() {
    if (!app.isPackaged) {
        return app.getAppPath();
    }

    const unpackedPath = path.join(
        process.resourcesPath,
        "app.asar.unpacked"
    );

    if (!fs.existsSync(unpackedPath)) {
        throw new Error(
            `Production runtime directory not found:\n${unpackedPath}`
        );
    }

    return unpackedPath;
}

/**
 * Wait until a service responds.
 */
async function waitForService(
    url,
    maxWait = 30000,
    interval = 500
) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
        try {
            await axios.get(url, {
                timeout: 3000
            });

            return true;
        } catch {
            await new Promise((resolve) =>
                setTimeout(resolve, interval)
            );
        }
    }

    throw new Error(
        `Service at ${url} did not respond within ${maxWait}ms`
    );
}

/**
 * Start Next.js production server.
 */
async function startNextServer() {
    return new Promise((resolve, reject) => {
        try {
            const nodeExe = getNodeExecutablePath();
            const appPath = getRuntimeAppPath();

            const nextServerPath = path.join(
                appPath,
                ".next",
                "standalone",
                "server.js"
            );

            console.log(
                "[Electron] Next.js runtime directory:",
                appPath
            );

            console.log(
                "[Electron] Next.js server:",
                nextServerPath
            );

            if (!fs.existsSync(nextServerPath)) {
                throw new Error(
                    `Next.js server.js not found at:\n${nextServerPath}\n\n` +
                    `Make sure .next/standalone is included in electron-builder.`
                );
            }

            const env = {
                ...process.env,
                NODE_ENV: "production",
                PORT: "3000",
                HOSTNAME: "localhost"
            };

            console.log(
                "[Electron] Starting Next.js server..."
            );

            console.log(
                "[Electron] Node executable:",
                nodeExe
            );

            nextProcess = spawn(
                nodeExe,
                [nextServerPath],
                {
                    env,
                    cwd: appPath,
                    stdio: [
                        "ignore",
                        "pipe",
                        "pipe"
                    ],
                    windowsHide: true
                }
            );

            nextProcess.stdout.on("data", (data) => {
                const output = data
                    .toString()
                    .trim();

                if (output) {
                    console.log(
                        "[Next.js]",
                        output
                    );
                }
            });

            nextProcess.stderr.on("data", (data) => {
                const output = data
                    .toString()
                    .trim();

                if (output) {
                    console.error(
                        "[Next.js Error]",
                        output
                    );
                }
            });

            nextProcess.on("error", (error) => {
                console.error(
                    "[Next.js] Failed to start:",
                    error.message
                );

                nextProcess = null;

                reject(
                    new Error(
                        `Next.js server failed to start: ${error.message}`
                    )
                );
            });

            nextProcess.on("exit", (code, signal) => {
                console.warn(
                    `[Next.js] Process exited with code ${code} and signal ${signal}`
                );

                nextProcess = null;
            });

            setTimeout(() => {
                waitForService(
                    "http://localhost:3000",
                    30000,
                    500
                )
                    .then(() => {
                        console.log(
                            "[Electron] ✓ Next.js server is ready on port 3000"
                        );

                        resolve();
                    })
                    .catch((error) => {
                        console.error(
                            "[Electron] Next.js health check failed:",
                            error.message
                        );

                        if (
                            nextProcess &&
                            !nextProcess.killed
                        ) {
                            nextProcess.kill();
                        }

                        nextProcess = null;

                        reject(error);
                    });
            }, 1000);

        } catch (error) {
            console.error(
                "[Electron] Error preparing Next.js startup:",
                error.message
            );

            reject(error);
        }
    });
}

/**
 * Start Express API server.
 */
async function startExpressServer() {
    return new Promise((resolve, reject) => {
        try {
            const nodeExe = getNodeExecutablePath();
            const appPath = getRuntimeAppPath();

            const serverPath = path.join(
                appPath,
                "server",
                "index.js"
            );

            console.log(
                "[Electron] Express runtime directory:",
                appPath
            );

            console.log(
                "[Electron] Express server:",
                serverPath
            );

            if (!fs.existsSync(serverPath)) {
                throw new Error(
                    `Express server not found at:\n${serverPath}\n\n` +
                    `Make sure server/**/* is included in electron-builder.`
                );
            }

            /**
             * Production .env.server location.
             *
             * Because .env.server is also unpacked with the
             * application runtime, check runtime path first.
             */
            const runtimeEnvPath = path.join(
                appPath,
                ".env.server"
            );

            /**
             * Fallback to Electron app path for development.
             */
            const developmentEnvPath = path.join(
                app.getAppPath(),
                ".env.server"
            );

            const envPath = fs.existsSync(runtimeEnvPath)
                ? runtimeEnvPath
                : developmentEnvPath;

            if (fs.existsSync(envPath)) {
                dotenv.config({
                    path: envPath
                });

                console.log(
                    "[Electron] Loaded environment from:",
                    envPath
                );
            } else {
                console.warn(
                    "[Electron] .env.server not found."
                );
            }

            const env = {
                ...process.env,
                NODE_ENV: "production",
                PORT: process.env.PORT || "5000"
            };

            console.log(
                "[Electron] Starting Express server..."
            );

            console.log(
                "[Electron] Node executable:",
                nodeExe
            );

            serverProcess = spawn(
                nodeExe,
                [serverPath],
                {
                    env,
                    cwd: appPath,
                    stdio: [
                        "ignore",
                        "pipe",
                        "pipe"
                    ],
                    windowsHide: true
                }
            );

            serverProcess.stdout.on("data", (data) => {
                const output = data
                    .toString()
                    .trim();

                if (output) {
                    console.log(
                        "[Express]",
                        output
                    );
                }
            });

            serverProcess.stderr.on("data", (data) => {
                const output = data
                    .toString()
                    .trim();

                if (output) {
                    console.error(
                        "[Express Error]",
                        output
                    );
                }
            });

            serverProcess.on("error", (error) => {
                console.error(
                    "[Express] Failed to start:",
                    error.message
                );

                serverProcess = null;

                reject(
                    new Error(
                        `Express server failed to start: ${error.message}`
                    )
                );
            });

            serverProcess.on("exit", (code, signal) => {
                console.warn(
                    `[Express] Process exited with code ${code} and signal ${signal}`
                );

                serverProcess = null;
            });

            setTimeout(() => {
                waitForService(
                    "http://localhost:5000/api/health",
                    30000,
                    500
                )
                    .then(() => {
                        console.log(
                            "[Electron] ✓ Express server is ready on port 5000"
                        );

                        resolve();
                    })
                    .catch((error) => {
                        console.error(
                            "[Electron] Express health check failed:",
                            error.message
                        );

                        if (
                            serverProcess &&
                            !serverProcess.killed
                        ) {
                            serverProcess.kill();
                        }

                        serverProcess = null;

                        reject(error);
                    });
            }, 1000);

        } catch (error) {
            console.error(
                "[Electron] Error preparing Express startup:",
                error.message
            );

            reject(error);
        }
    });
}

/**
 * Start all production services.
 */
async function startProductionServices() {
    try {
        console.log(
            "[Electron] Starting production services..."
        );

        const nodeExe = getNodeExecutablePath();
        const runtimePath = getRuntimeAppPath();

        console.log(
            "[Electron] Production Node.js:",
            nodeExe
        );

        console.log(
            "[Electron] Production runtime path:",
            runtimePath
        );

        await Promise.all([
            startNextServer(),
            startExpressServer()
        ]);

        console.log(
            "[Electron] ✓ All production services started successfully"
        );

        return true;

    } catch (error) {
        console.error(
            "[Electron] ✗ Failed to start services:",
            error.message
        );

        stopAllServices();

        throw error;
    }
}

/**
 * Stop all running services.
 */
function stopAllServices() {
    console.log(
        "[Electron] Stopping all services..."
    );

    if (
        nextProcess &&
        !nextProcess.killed
    ) {
        console.log(
            "[Electron] Killing Next.js process"
        );

        const processToKill = nextProcess;

        processToKill.kill();

        setTimeout(() => {
            if (
                processToKill &&
                !processToKill.killed
            ) {
                console.warn(
                    "[Electron] Force killing Next.js process"
                );

                processToKill.kill();
            }
        }, 3000);

        nextProcess = null;
    }

    if (
        serverProcess &&
        !serverProcess.killed
    ) {
        console.log(
            "[Electron] Killing Express process"
        );

        const processToKill = serverProcess;

        processToKill.kill();

        setTimeout(() => {
            if (
                processToKill &&
                !processToKill.killed
            ) {
                console.warn(
                    "[Electron] Force killing Express process"
                );

                processToKill.kill();
            }
        }, 3000);

        serverProcess = null;
    }
}

module.exports = {
    startProductionServices,
    stopAllServices,
    getNodeExecutablePath
};