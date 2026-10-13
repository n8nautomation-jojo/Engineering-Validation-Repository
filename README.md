# PharmaTech — Enterprise Pharmacy ERP Platform

> **المنظومة السحابية المتكاملة لإدارة الصيدليات ونقاط البيع السريعة**  
> Offline-First · FEFO Expiry Guard · Bankak Split Payments · Multi-Tenant Cloud SaaS

---

## 📚 التوثيق والمعمارية (Architecture & Documentation)

للحصول على الشرح الكامل لهيكل المستودع وكيفية تنظيم ملفات الباك إند (`src/`) والفرونت إند (`apps/`) والاختبارات (`tests/`)، يرجى مراجعة:
👉 **[دليل الهيكل المعماري للمطورين (ARCHITECTURE.md)](./ARCHITECTURE.md)**

---

## ⚡ البدء السريع (Quick Start)

### 1. تثبيت الحزم (Install Dependencies)
```bash
npm install
```

### 2. بناء الباك إند (Build TypeScript Backend)
```bash
npm run build
```

### 3. تشغيل حزمة الاختبارات الآلية (286 Tests)
```bash
npm test
```

### 4. تشغيل خادم التطبيقات الموحد (Start Local Server)
```bash
npm run apps:start
```
سيعمل الخادم محلياً على: **`http://localhost:3000/`**

---

## 🧭 خريطة التطبيقات (Applications Map)

* **صفحة الهبوط (Landing Page):** `http://localhost:3000/` (`apps/landing/`)
* **منظومة الصيدلية و POS المدمجة:** `http://localhost:3000/pharmacy-erp/` (`apps/pharmacy-erp/`)
* **لوحة إدارة المنصة المركزية:** `http://localhost:3000/platform-admin/` (`apps/platform-admin/`)
* **نقطة البيع المستقلة:** `http://localhost:3000/desktop-pos/` (`apps/desktop-pos/`)

---

## 📄 المواصفات الهندسية (Living Specifications)
يحتوي مجلد `docs/` على المواصفات القياسية الهندسية الكاملة للنظام وعقود الأمان المعتمدة.
