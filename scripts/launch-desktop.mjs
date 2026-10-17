/**
 * PharmaTech — Enterprise Desktop Application Launcher
 * Launches the PharmaTech POS/ERP Server and opens the dedicated Edge/Chrome Desktop App window.
 */

import http from "node:http";
import { spawn, exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const PORT = process.env.PORT || 3000;
const APP_URL = `http://localhost:${PORT}/pharmacy-erp/index.html`;
const HEALTH_URL = `http://localhost:${PORT}/health`;

function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const isHealthy = await checkServerHealth();
    if (isHealthy) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

function startServerProcess() {
  console.log("⚡ Starting PharmaTech Local Enterprise Server...");
  const serverPath = path.join(ROOT_DIR, "apps", "server.mjs");
  const child = spawn(process.execPath, [serverPath], {
    cwd: ROOT_DIR,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PORT: String(PORT) }
  });
  child.unref();
  return child;
}

function launchBrowserWindow() {
  console.log(`🌐 Opening PharmaTech ERP & POS in Dedicated Desktop Mode...`);
  console.log(`🔗 Target URL: ${APP_URL}`);

  // Windows standard paths for Edge and Chrome
  const edgePaths = [
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Microsoft\\Edge\\Application\\msedge.exe"),
    path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Microsoft\\Edge\\Application\\msedge.exe"),
    path.join(process.env["LocalAppData"] || "", "Microsoft\\Edge\\Application\\msedge.exe")
  ];

  const chromePaths = [
    path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
    path.join(process.env["LocalAppData"] || "", "Google\\Chrome\\Application\\chrome.exe")
  ];

  let appBrowserExe = null;

  for (const p of edgePaths) {
    if (fs.existsSync(p)) {
      appBrowserExe = p;
      break;
    }
  }

  if (!appBrowserExe) {
    for (const p of chromePaths) {
      if (fs.existsSync(p)) {
        appBrowserExe = p;
        break;
      }
    }
  }

  if (appBrowserExe) {
    // Launch in --app mode (standalone frameless window for POS ergonomics)
    console.log(`🚀 Found Native Browser Engine: ${appBrowserExe}`);
    const appArgs = [
      `--app=${APP_URL}`,
      "--start-maximized",
      "--no-first-run",
      "--no-default-browser-check"
    ];
    const proc = spawn(appBrowserExe, appArgs, { detached: true, stdio: "ignore" });
    proc.unref();
    console.log("✅ PharmaTech Desktop POS window opened successfully!");
  } else {
    // Fallback to Windows default browser
    console.log("ℹ️ Native app mode browser not found, opening default system browser...");
    exec(`start "" "${APP_URL}"`);
  }
}

async function main() {
  console.log("=================================================");
  console.log("  🏥 PharmaTech Enterprise Desktop Launcher      ");
  console.log("  نظام فارماتك الذكي لإدارة الصيدليات ونقاط البيع  ");
  console.log("=================================================");

  const alreadyRunning = await checkServerHealth();
  if (alreadyRunning) {
    console.log("✅ PharmaTech Server is already running and healthy.");
  } else {
    startServerProcess();
    const ready = await waitForServer();
    if (!ready) {
      console.error("❌ Error: Failed to start PharmaTech server within timeout.");
      process.exit(1);
    }
    console.log("✅ PharmaTech Server started and operational.");
  }

  launchBrowserWindow();
  console.log("-------------------------------------------------");
  console.log("Ready for transactions! Press Ctrl+C or close this window when done.");
}

main().catch((err) => {
  console.error("Fatal launch error:", err);
  process.exit(1);
});
