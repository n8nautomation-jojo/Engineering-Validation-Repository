# 🏛️ PharmaTech System Architecture & Developer Blueprint

> **دليل المطورين وخريطة الهيكل المعماري لنظام فارماتك (PharmaTech)**  
> هذا المستند هو المرجع المعتمد لتنظيم وهيكلة ملفات الباك إند (Backend) والفرونت إند (Frontend) وكيفية ارتباطهما دون الإخلال بمسارات الاختبارات الآلية.

---

## 🧭 1. نظرة عامة على هيكل المستودع (Monorepo Blueprint)

يعتمد مشروع **PharmaTech** نمط **الهندسة المعمارية النظيفة (Modular-Monolith Clean Architecture)**، حيث ينقسم المشروع إلى جزأين رئيسيين متكاملين:

```text
pharmatech/
├── src/                  # 🟢 [BACKEND] محرك النظام والخدمات الخلفية (TypeScript)
├── apps/                 # 🔵 [FRONTEND] واجهات وتطبيقات المستخدم الأمامية (HTML/CSS/JS)
├── tests/                # 🧪 [TESTS] حزمة الاختبارات الآلية (286 اختباراً معتمداً)
├── docs/                 # 📚 [SPEC] المواصفات الهندسية ومستندات التشغيل الدوائي
├── dist/                 # ⚙️ [BUILD] الكود المترجم من TypeScript إلى JavaScript
├── package.json          # 📦 إعدادات التبعيات وأوامر التشغيل والبناء
├── tsconfig.json         # 🛠️ إعدادات مترجم TypeScript
└── ARCHITECTURE.md       # 📖 هذا الدليل المعماري
```

---

## 🟢 2. تفصيل الباك إند: `src/` (The Core Backend Engine)

يحتوي مجلد `src/` على كامل منطق الأعمال (Business Logic)، قواعد البيانات، التشفير، الصلاحيات، وحماية المعايير الدوائية المعتمدة بالسودان، وهو مقسم وفق **المعمارية السداسية (Hexagonal / Clean Architecture)**:

```text
src/
├── domain/               # 💎 طبقة النطاق (القلب النقي للنظام)
│   ├── models/           # كيانات الدواء (Product)، التشغيلات (Batches)، الفواتير، الجلسات
│   ├── primitives/       # كتل العملات، الكميات، معايير انتهاء الصلاحيات (FEFO)
│   └── events/           # أحداث النطاق (BatchExpired, SaleCompleted, StockDepleted)
│
├── application/          # ⚙️ طبقة التطبيق واستخدامات النظام (Use Cases)
│   ├── commands/         # أوامر التنفيذ (CreateSaleCommand, ProvisionTenantCommand)
│   ├── queries/          # استعلامات القراءة وجلب البيانات
│   ├── services/         # خدمات التنسيق بين قواعد البيانات والنطاق
│   └── transactions/     # إدارة العمليات الذرية (Unit of Work & Transactions)
│
├── persistence/          # 🗄️ طبقة التخزين وقواعد البيانات
│   ├── adapters/         # محولات SQLite (المحلي للأوفلاين) و PostgreSQL (السحابي)
│   ├── migrations/       # سكربتات ترقية وإنشاء الجداول والقيود
│   └── repositories/     # مستودعات الحفظ والاسترجاع المشفرة
│
├── authorization/        # 🛡️ طبقة الصلاحيات وأمان الأجهزة (RBAC & Capabilities)
│   ├── capabilities/     # صلاحيات الكاشير، الصيدلي، مدير الفرع، مدير المنصة
│   └── policies/         # سياسات العمل دون اتصال (Offline Authority Expiry)
│
├── security/             # 🔐 طبقة التشفير وحماية البيانات
│   ├── audit/            # سجلات التدقيق التشفيرية غير القابلة للتعديل (Merkle / Hash Roots)
│   └── credentials/      # تشفير وحفظ كلمات المرور والمفاتيح
│
├── api/                  # 🌐 طبقة منافذ الربط (Endpoints & Routing)
│   └── controllers/      # استقبال الطلبات والتحقق من صحة DTOs
│
├── presentation/         # 🖥️ طبقة النماذج التقديمية (View Models)
│   ├── pos-view-model.ts           # عقل نقطة البيع وحسابات السلة وحماية FEFO
│   └── platform-admin-view-model.ts # عقل إدارة المنصة المركزية والمستأجرين
│
└── kernel/               # ⏱️ النواة المشتركة (الوقت، توليد المعرفات، معالجة الأخطاء)
```

---

## 🔵 3. تفصيل الفرونت إند: `apps/` (The Frontend Applications Workspace)

يحتوي مجلد `apps/` على جميع التطبيقات والواجهات التي يتفاعل معها المستخدم النهائي، وتعمل كوحدات مستقلة (Modular Web Apps):

```text
apps/
├── landing/              # 🌐 صفحة الهبوط التسويقية (B2B SaaS Landing Page)
│   ├── index.html        # نقطة الدخول الرئيسية لصفحة الهبوط (http://localhost:3000/)
│   ├── css/              # تصميم النظام: variables.css (الوضع الليلي والنهاري), layout.css, components.css
│   └── js/               # المكونات التفاعلية: Navbar, Hero, Showcase, Pricing, Faq, Footer
│
├── pharmacy-erp/         # 💊 منظومة الصيدلية ونقطة البيع المدمجة (Flagship Pharmacy ERP)
│   ├── index.html        # واجهة النظام (لوحة التحكم، الكتالوج، ونقطة البيع)
│   ├── css/              # ستايلات النظام ونقطة البيع (pos.css)
│   ├── js/components/    # المكونات: PosView, MedicinesTable, Topbar, Sidebar, Dialogs
│   ├── js/services/      # خدمات العرض: posService, medicineService, receiptService
│   └── js/state/         # إدارة الحالة: store.js, mockData.js
│
├── platform-admin/       # 🏛️ لوحة إدارة المنصة المركزية (Platform SaaS Console)
│   ├── index.html        # واجهة إدارة المستأجرين (http://localhost:3000/platform-admin/)
│   ├── css/              # التصميم الموحد
│   └── js/               # خدمات تهيئة الصيدليات وسجلات التدقيق
│
├── desktop-pos/          # 💻 بيئة تشغيل الكاشير المكتبية المستقلة (Standalone POS)
│   ├── index.html        # واجهة الكاشير المخصصة لنظام Electron/Desktop
│   ├── style.css         # أنماط الكاشير
│   └── app.js            # منطق التشغيل المكتبي
│
└── server.mjs            # 🚀 خادم التطوير المحلي الموحد (Local Gateway Server on Port 3000)
```

---

## 🧪 4. حزمة الاختبارات الآلية: `tests/` (The 286 Test Suite)

تحتوي على **286 اختباراً آلياً** صارماً تغطي كافة عقود الأمان والتشغيل الدوائي:
* `tests/p0-01-database-persistence.test.mjs`: مطابقة واختبارات سلامة قواعد البيانات SQLite و PostgreSQL.
* `tests/p0-02-sales-concurrency.test.mjs`: منع البيع المتزامن وضمان عدم خصم نفس التشغيلة مرتين.
* `tests/p0-05-fefo-enforcement.test.mjs`: التحقق الصارم من إلزام صرف التشغيلات الأقرب انتهاءً أولاً.
* `tests/p0-09-offline-allocation.test.mjs`: اختبارات حصة المزامنة عند انقطاع الإنترنت (معيار R1-A1).
* `tests/p0-14-pos-and-admin-ui.test.mjs`: التحقق من وجود وسلامة ملفات الواجهات (`apps/desktop-pos` و `apps/platform-admin`).

> **⚠️ تنبيه هام لجميع المطورين:**  
> ملفات الاختبارات في `tests/` تعتمد على استيراد المخرجات المترجمة عبر المسار `../dist/src/...` وتقرأ مسارات `apps/` مباشرة. الحفاظ على مجلد `src/` ومجلد `apps/` في مواقعهما الحالية هو الضمان لعدم كسر أي اختبار في الـ CI/CD.

---

## 🚀 5. أوامر التشغيل والبناء السريعة (Developer Cheatsheet)

| الأمر | الوظيفة |
| :--- | :--- |
| `npm run build` | ترجمة كود الباك إند من TypeScript إلى JavaScript داخل مجلد `dist/` |
| `npm test` | بناء الباك إند وتشغيل كافة الاختبارات الآلية الـ 286 للتأكد من السلامة |
| `npm run apps:start` | تشغيل خادم التطبيقات الموحد على الرابط `http://localhost:3000/` |
| `npm run check` | فحص شامل للبناء وتشغيل الاختبارات بالتتابع |

---

## 🔗 6. الروابط المباشرة لبيئة العمل المحلية

* 🌐 **صفحة الهبوط والتسويق:** [http://localhost:3000/](http://localhost:3000/)
* 💊 **منظومة إدارة الصيدلية و POS:** [http://localhost:3000/pharmacy-erp/](http://localhost:3000/pharmacy-erp/)
* 🏛️ **لوحة إدارة المنصة المركزية:** [http://localhost:3000/platform-admin/](http://localhost:3000/platform-admin/)
* 💻 **نقطة البيع المستقلة:** [http://localhost:3000/desktop-pos/](http://localhost:3000/desktop-pos/)
* 🩺 **فحص حالة الخادم (Health Check):** [http://localhost:3000/health](http://localhost:3000/health)
