const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const runtimeRoot = path.join(
    projectRoot,
    "resources",
    "server-runtime"
);

const npmCommand = process.platform === "win32"
    ? "npm.cmd"
    : "npm";

const serverDependencies = [
    "dotenv",
    "express",
    "cors",
    "bcryptjs",
    "jsonwebtoken",
    "pg"
];

if (fs.existsSync(runtimeRoot)) {
    fs.rmSync(runtimeRoot, {
        recursive: true,
        force: true
    });
}

fs.mkdirSync(runtimeRoot, {
    recursive: true
});

console.log(
    "[Build] Preparing Express production dependencies..."
);

const result = spawnSync(
    npmCommand,
    [
        "install",
        "--prefix",
        runtimeRoot,
        "--no-save",
        "--no-package-lock",
        "--omit=dev",
        ...serverDependencies
    ],
    {
        cwd: projectRoot,
        stdio: "inherit",
        shell: process.platform === "win32"
    }
);

if (result.error) {
    throw result.error;
}

if (result.status !== 0) {
    process.exit(result.status || 1);
}

for (const dependency of serverDependencies) {
    const dependencyPath = path.join(
        runtimeRoot,
        "node_modules",
        dependency
    );

    if (!fs.existsSync(dependencyPath)) {
        throw new Error(
            `Missing prepared server dependency: ${dependency}`
        );
    }
}

console.log(
    "[Build] Express production dependencies ready."
);