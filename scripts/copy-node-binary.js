/**
 * Build helper: Copy Node.js executable to resources/bin for packaging
 * This ensures the bundled app can run Node processes without system Node.js installed
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = __dirname.replace(/scripts$/, "");
const binDir = path.join(projectRoot, "resources", "bin");

console.log("[Build] Preparing Node.js runtime for bundling...");
console.log("[Build] Target directory:", binDir);

// Create resources/bin directory if it doesn't exist
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
    console.log("[Build] Created resources/bin directory");
}

try {
    // Find node.exe in the current Node.js installation
    const nodeExePath = process.execPath;

    if (!fs.existsSync(nodeExePath)) {
        throw new Error(`Node.js executable not found at: ${nodeExePath}`);
    }

    const targetPath = path.join(binDir, "node.exe");

    // Only copy if it doesn't exist or is different size
    const shouldCopy = !fs.existsSync(targetPath) ||
        fs.statSync(nodeExePath).size !== fs.statSync(targetPath).size;

    if (shouldCopy) {
        console.log("[Build] Copying Node.js from:", nodeExePath);
        fs.copyFileSync(nodeExePath, targetPath);
        console.log("[Build] Successfully copied to:", targetPath);
    } else {
        console.log("[Build] Node.js already cached at:", targetPath);
    }

    // Verify the copy
    if (!fs.existsSync(targetPath)) {
        throw new Error("Failed to copy node.exe");
    }

    const stats = fs.statSync(targetPath);
    console.log(`[Build] Node.js size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log("[Build] ✓ Node.js runtime ready for bundling");

} catch (error) {
    console.error("[Build] ERROR:", error.message);
    process.exit(1);
}
