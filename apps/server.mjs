import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = parsedUrl.pathname;

  // Root landing page
  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PharmaTech Applications Portal — بوابة تطبيقات فارماتك</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Cairo', sans-serif; background: #080c14; color: #fff; margin: 0; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    .portal-box { max-width: 700px; width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2.5rem; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; margin-bottom: 2rem; font-size: 1.05rem; }
    .app-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .app-card { background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.5rem; text-decoration: none; color: #fff; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
    .app-card:hover { transform: translateY(-3px); border-color: #10b981; background: #24334a; box-shadow: 0 6px 20px rgba(16,185,129,0.2); }
    .app-icon { font-size: 2.5rem; }
    .app-title { font-size: 1.2rem; font-weight: 700; }
    .app-desc { font-size: 0.85rem; color: #94a3b8; line-height: 1.4; }
    .badge { background: rgba(16,185,129,0.15); color: #10b981; padding: 0.2rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-family: 'Inter', sans-serif; }
  </style>
</head>
<body>
  <div class="portal-box">
    <h1>🚀 بوابة تطبيقات فارماتك (PharmaTech)</h1>
    <p>بيئة التشغيل الموحدة لتطبيقات نقطة البيع للمكتب ولوحة إدارة المنصة المركزية السحابية</p>
    <div class="app-cards">
      <a href="/desktop-pos/" class="app-card">
        <span class="app-icon">💊</span>
        <span class="app-title">تطبيق نقطة البيع (Desktop POS)</span>
        <span class="badge">MVP-0 / Local Engine</span>
        <span class="app-desc">نظام الكاشير الصيدلاني، مسح الباركود، السلامة الدوائية FEFO، الدفع المجزأ، والعمل دون اتصال.</span>
      </a>
      <a href="/platform-admin/" class="app-card">
        <span class="app-icon">⚡</span>
        <span class="app-title">لوحة إدارة المنصة (Platform Console)</span>
        <span class="badge">SaaS Cloud Admin</span>
        <span class="app-desc">إدارة المستأجرين، تهيئة الصيدليات، الاشتراكات، وسجل التدقيق الأمني غير القابل للتعديل.</span>
      </a>
    </div>
  </div>
</body>
</html>`);
    return;
  }

  // Map to local file
  let filePath = path.join(__dirname, pathname);
  if (pathname.endsWith("/")) {
    filePath = path.join(filePath, "index.html");
  }

  // Security check: stay within apps dir
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try appending index.html if it's a directory
      const indexPath = path.join(filePath, "index.html");
      if (fs.existsSync(indexPath)) {
        filePath = indexPath;
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`PharmaTech Apps Server running on http://localhost:${PORT}`);
});
