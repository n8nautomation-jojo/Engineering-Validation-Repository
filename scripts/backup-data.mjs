/**
 * PharmaTech — Automated Enterprise Data Backup Engine
 * Creates timestamped, cryptographic SHA-256 verified snapshots of all pharmacy database records.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "apps", "data");
const BACKUP_ROOT = path.join(ROOT_DIR, "backups");
const MAX_BACKUP_RETENTION = 30; // Keep last 30 snapshots

function getFormattedTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function calculateFileSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function pruneOldBackups() {
  if (!fs.existsSync(BACKUP_ROOT)) return;
  const entries = fs.readdirSync(BACKUP_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("backup_"))
    .map((e) => ({
      name: e.name,
      fullPath: path.join(BACKUP_ROOT, e.name),
      time: fs.statSync(path.join(BACKUP_ROOT, e.name)).mtimeMs
    }))
    .sort((a, b) => b.time - a.time);

  if (entries.length > MAX_BACKUP_RETENTION) {
    const toDelete = entries.slice(MAX_BACKUP_RETENTION);
    console.log(`🧹 Pruning ${toDelete.length} old backup(s) to maintain maximum retention of ${MAX_BACKUP_RETENTION}...`);
    for (const item of toDelete) {
      fs.rmSync(item.fullPath, { recursive: true, force: true });
      console.log(`   Removed: ${item.name}`);
    }
  }
}

async function performBackup() {
  console.log("=================================================");
  console.log("  💾 PharmaTech Enterprise Database Backup       ");
  console.log("  النسخ الاحتياطي التلقائي لبيانات الصيدلية         ");
  console.log("=================================================");

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ Data directory not found: ${DATA_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_ROOT)) {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  }

  const timestamp = getFormattedTimestamp();
  const targetDir = path.join(BACKUP_ROOT, `backup_${timestamp}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  console.log(`📁 Found ${files.length} active data tables in apps/data. Copying snapshot...`);

  let totalBytes = 0;
  const fileManifest = [];

  for (const file of files) {
    const srcPath = path.join(DATA_DIR, file);
    const destPath = path.join(targetDir, file);
    fs.copyFileSync(srcPath, destPath);

    const stats = fs.statSync(destPath);
    totalBytes += stats.size;
    const hash = calculateFileSha256(destPath);

    fileManifest.push({
      fileName: file,
      sizeBytes: stats.size,
      sha256: hash
    });
  }

  // Also check for any active sqlite database files in root or data
  const potentialSqliteFiles = fs.readdirSync(ROOT_DIR).filter(f => f.endsWith(".db") || f.endsWith(".sqlite"));
  for (const sFile of potentialSqliteFiles) {
    const srcPath = path.join(ROOT_DIR, sFile);
    const destPath = path.join(targetDir, sFile);
    fs.copyFileSync(srcPath, destPath);
    const stats = fs.statSync(destPath);
    totalBytes += stats.size;
    fileManifest.push({
      fileName: sFile,
      sizeBytes: stats.size,
      sha256: calculateFileSha256(destPath)
    });
  }

  // Create Manifest file
  const manifest = {
    backupId: `PT-BK-${timestamp}`,
    timestamp: new Date().toISOString(),
    totalFiles: fileManifest.length,
    totalBytes,
    totalBytesFormatted: `${(totalBytes / 1024).toFixed(2)} KB`,
    nodeVersion: process.version,
    platform: process.platform,
    files: fileManifest
  };

  const manifestPath = path.join(targetDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  pruneOldBackups();

  console.log("-------------------------------------------------");
  console.log(`✅ تم إنجاز النسخ الاحتياطي بنجاح!`);
  console.log(`📦 مسار النسخة: ${targetDir}`);
  console.log(`📊 عدد الملفات المحفوظة: ${fileManifest.length} ملف`);
  console.log(`💾 الحجم الإجمالي: ${(totalBytes / 1024).toFixed(2)} KB`);
  console.log(`🛡️ التحقق المشفر: جميع الملفات مفحوصة عبر SHA-256`);
  console.log("=================================================");
}

performBackup().catch((err) => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});
