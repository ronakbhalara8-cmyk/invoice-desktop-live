# Invoice Manager Production Build Fix - Quick Reference

## Problem
Windows packaged `.exe` failed with: `[Next.js] Failed to start: spawn node ENOENT`

Root cause: Tried to spawn child Node.js processes using `spawn("node", ...)` which depends on system PATH. On customer machines without Node.js installed, "node" command is not found → ENOENT error.

## Solution
**Bundle Node.js runtime directly with the application** so it doesn't depend on system PATH.

## Quick Start - Build the Fixed Application

```powershell
# 1. From project root directory
cd d:\ronak\ronak\invoice-desktop-live

# 2. Build and package (one command)
npm run dist

# 3. Wait for completion (5-10 minutes depending on machine)
# Output: release\Invoice Manager Setup 0.1.0.exe
```

## Quick Test - Run the Packaged Application

```powershell
# Test the unpacked version (no installation required)
cd d:\ronak\ronak\invoice-desktop-live\release\win-unpacked
.\Invoice Manager.exe
```

Expected behavior:
- Application starts automatically
- Services initialize in background (next.js on 3000, express on 5000)
- Electron window opens with UI
- All features work
- No manual server startup required
- Works on clean Windows machine without Node.js installed

## Files Changed (5 Total)

| File | Type | Change |
|------|------|--------|
| `scripts/copy-node-binary.js` | NEW | Copies node.exe to resources/bin during build |
| `electron/services.js` | MODIFIED | Uses bundled node.exe path instead of system "node" |
| `package.json` | MODIFIED | Added copy-node script in build pipeline |
| `electron-builder.yml` | MODIFIED | Includes resources/bin with node.exe in package |
| `.gitignore` | MODIFIED | Prevents node.exe and credentials from Git |

## How Production Startup Works Now

```
packaged app starts
  ↓
gets bundled node.exe path:
  C:\Users\...\AppData\Local\Programs\Invoice Manager\resources\bin\node.exe
  ↓
spawn child process #1: node.exe .next/standalone/server.js (port 3000)
spawn child process #2: node.exe server/index.js (port 5000)
  ↓
wait for both to respond
  ↓
create window and load http://localhost:3000
  ↓
DONE - application fully functional
```

## Why This Works

- **node.exe is bundled** (~98 MB included in packaged app)
- **Absolute path used** - not dependent on system PATH
- **No external dependencies** - works on any Windows machine
- **Development unchanged** - `npm run dev` still works with system Node.js
- **Secure** - Electron security (contextIsolation, nodeIntegration) maintained

## Verification Checklist

After running `npm run dist`:

- ✅ `release/Invoice Manager Setup 0.1.0.exe` exists
- ✅ `release/win-unpacked/` directory exists
- ✅ `release/win-unpacked/resources/bin/node.exe` exists (~98 MB)
- ✅ Run `.\Invoice Manager.exe` from win-unpacked succeeds
- ✅ Application loads UI without errors
- ✅ Login, invoices, Dexie, Supabase all work
- ✅ Closing app cleans up processes (check Task Manager)

## Important Notes

**Before building:**
- Ensure `.env.server` exists with your database credentials
- This file will be packaged with the app (needed for database access)

**Security:**
- `.env.server` is added to `.gitignore` (don't commit credentials to GitHub)
- Bundled node.exe is also ignored in Git
- Both are generated during build from development machine

**Size:**
- node.exe: ~98 MB
- Total package size: ~400 MB
- Normal for Electron + Node.js bundled

## Troubleshooting

If `npm run dist` fails:
```powershell
# Clear caches and rebuild
rm -r release
rm -r resources/bin
npm run dist
```

If `Invoice Manager.exe` doesn't start:
```powershell
# Check if services start and logs
# Press Ctrl+Shift+I in the app to open dev tools
# Check Console tab for startup errors
```

## Related Documentation

For detailed information, see: `PRODUCTION_BUILD_GUIDE.md`
