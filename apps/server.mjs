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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-ar: 'Cairo', system-ui, -apple-system, sans-serif;
      --font-en: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --bg-dark: #090d16;
      --surface-glass: rgba(17, 24, 39, 0.75);
      --border-glass: rgba(255, 255, 255, 0.1);
      --primary-cyan: #06b6d4;
      --primary-emerald: #10b981;
      --primary-indigo: #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-ar);
      background-color: var(--bg-dark);
      background-image: 
        radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.18) 0%, transparent 45%),
        radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.16) 0%, transparent 45%),
        radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 60%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      overflow-x: hidden;
    }
    .portal-shell {
      max-width: 960px;
      width: 100%;
      background: var(--surface-glass);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border-glass);
      border-radius: 24px;
      padding: 3rem 2.5rem;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(99, 102, 241, 0.15);
      position: relative;
    }
    .portal-shell::before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    }
    .portal-header {
      text-align: center;
      margin-bottom: 2.75rem;
    }
    .brand-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 0.825rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
      letter-spacing: 0.02em;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10b981;
      animation: pulseGlow 2s infinite;
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    h1 {
      font-size: 2.4rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      margin-bottom: 0.75rem;
      background: linear-gradient(135deg, #ffffff 40%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .lead-text {
      color: #94a3b8;
      font-size: 1.05rem;
      max-width: 650px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .app-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.75rem;
      margin-bottom: 2.5rem;
    }
    .app-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 2rem;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }
    .app-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 0%, var(--card-glow, rgba(99, 102, 241, 0.15)), transparent 70%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .app-card:hover {
      transform: translateY(-4px);
      border-color: var(--card-border, #6366f1);
      box-shadow: 0 16px 36px -10px var(--card-shadow, rgba(99, 102, 241, 0.25));
    }
    .app-card:hover::before {
      opacity: 1;
    }
    .app-card.pos-card {
      --card-glow: rgba(16, 185, 129, 0.15);
      --card-border: rgba(16, 185, 129, 0.4);
      --card-shadow: rgba(16, 185, 129, 0.25);
    }
    .app-card.admin-card {
      --card-glow: rgba(99, 102, 241, 0.18);
      --card-border: rgba(99, 102, 241, 0.4);
      --card-shadow: rgba(99, 102, 241, 0.25);
    }
    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      position: relative;
      z-index: 2;
    }
    .icon-wrapper {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .pos-card .icon-wrapper {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.1));
      color: #34d399;
    }
    .admin-card .icon-wrapper {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.1));
      color: #818cf8;
    }
    .icon-wrapper svg {
      width: 26px;
      height: 26px;
    }
    .card-badge {
      font-size: 0.75rem;
      font-family: var(--font-en);
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      letter-spacing: 0.03em;
    }
    .pos-card .card-badge {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
    }
    .admin-card .card-badge {
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
    }
    .app-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.5rem;
      position: relative;
      z-index: 2;
    }
    .app-desc {
      font-size: 0.925rem;
      color: #94a3b8;
      line-height: 1.55;
      margin-bottom: 1.5rem;
      flex-grow: 1;
      position: relative;
      z-index: 2;
    }
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      position: relative;
      z-index: 2;
    }
    .card-tags {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 0.725rem;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      color: #cbd5e1;
    }
    .cta-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.875rem;
      font-weight: 700;
      color: #ffffff;
      transition: gap 0.2s;
    }
    .app-card:hover .cta-link {
      gap: 0.65rem;
      color: #38bdf8;
    }
    .system-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 0.85rem 1.25rem;
      font-size: 0.825rem;
      color: #94a3b8;
    }
    .status-items {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .status-item strong {
      color: #f1f5f9;
      font-family: var(--font-en);
    }
    @media (max-width: 768px) {
      .portal-shell { padding: 1.75rem 1.25rem; }
      h1 { font-size: 1.8rem; }
      .app-cards { grid-template-columns: 1fr; }
      .system-status-bar { flex-direction: column; gap: 0.75rem; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="portal-shell">
    <div class="portal-header">
      <div class="brand-tag">
        <span class="pulse-dot"></span>
        <span>منظومة فارماتك الذكية (PharmaTech Cloud & POS)</span>
      </div>
      <h1>بوابة التطبيقات الموحدة</h1>
      <p class="lead-text">البيئة التشغيلية المتكاملة لإدارة المنشآت الصيدلانية، المزامنة دون اتصال، ونقاط البيع السريعة وفق المعايير الدوائية العالمية.</p>
    </div>

    <div class="app-cards">
      <!-- 1. Desktop POS -->
      <a href="/desktop-pos/" class="app-card pos-card">
        <div class="card-top">
          <div class="icon-wrapper">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 13.5h6m-3-3v6" />
            </svg>
          </div>
          <span class="card-badge">DESKTOP / LOCAL</span>
        </div>
        <div class="app-title">نظام نقطة البيع (Desktop POS)</div>
        <div class="app-desc">واجهة الكاشير السريعة مع الفرز الصيدلاني الصارم (FEFO)، دعم مسح الباركود، التحويل البنكي (بنكك)، والعمل المستمر عند انقطاع الإنترنت.</div>
        <div class="card-footer">
          <div class="card-tags">
            <span class="tag">FEFO Safety</span>
            <span class="tag">Offline Quota</span>
            <span class="tag">Bankak Split</span>
          </div>
          <span class="cta-link">
            <span>فتح التطبيق</span>
            <span>←</span>
          </span>
        </div>
      </a>

      <!-- 2. Platform Admin -->
      <a href="/platform-admin/" class="app-card admin-card">
        <div class="card-top">
          <div class="icon-wrapper">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9 3-3 2.142 2.142a.75.75 0 0 0 1.06 0L16.5 7.5" />
            </svg>
          </div>
          <span class="card-badge">SAAS / CLOUD ADMIN</span>
        </div>
        <div class="app-title">لوحة إدارة المنصة (Platform Console)</div>
        <div class="app-desc">إدارة المستأجرين والمنشآت الصيدلانية، معالج التهيئة الذكي التلقائي، ضبط الاشتراكات، ومراقبة سجلات التدقيق الأمني غير القابل للتعديل.</div>
        <div class="card-footer">
          <div class="card-tags">
            <span class="tag">Auto-Slug Generator</span>
            <span class="tag">D-038 Privacy</span>
            <span class="tag">Audit Trail</span>
          </div>
          <span class="cta-link">
            <span>فتح المنصة</span>
            <span>←</span>
          </span>
        </div>
      </a>
    </div>

    <div class="system-status-bar">
      <div class="status-items">
        <div class="status-item">
          <span>حالة المنظومة:</span>
          <strong style="color:#10b981;">Online & Healthy</strong>
        </div>
        <div class="status-item">
          <span>إصدار النواة:</span>
          <strong>MVP-0.1 (Phase 4 Verified)</strong>
        </div>
        <div class="status-item">
          <span>حماية الخصوصية:</span>
          <strong style="color:#38bdf8;">Enforced (D-038)</strong>
        </div>
      </div>
      <div>
        <span>PharmaTech OS © 2026</span>
      </div>
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
