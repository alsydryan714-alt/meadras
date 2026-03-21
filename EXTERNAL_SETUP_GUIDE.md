# دليل تشغيل نظام يُسر (Meadras) خارج بيئة Replit

هذا الدليل مخصص لتشغيل المشروع محلياً على جهازك الخاص أو على خادم (VPS) بعيداً عن بيئة Replit.

## 📋 المتطلبات الأساسية
قبل البدء، تأكد من تثبيت الأدوات التالية:
- **Node.js**: إصدار 20 أو أحدث.
- **pnpm**: أداة إدارة الحزم (يمكن تثبيتها عبر `npm install -g pnpm`).
- **PostgreSQL**: قاعدة بيانات تعمل محلياً أو سحابياً.

---

## 🚀 خطوات التشغيل السريع (محلياً)

### 1. إعداد قاعدة البيانات
قم بإنشاء قاعدة بيانات جديدة في PostgreSQL واحصل على رابط الاتصال (Connection String)، والذي يكون عادةً بهذا الشكل:
`postgres://username:password@localhost:5432/database_name`

### 2. إعداد متغيرات البيئة
قم بإنشاء ملف باسم `.env` في المجلد الرئيسي للمشروع وأضف القيم التالية:
```env
DATABASE_URL=postgres://username:password@localhost:5432/database_name
JWT_SECRET=قم_بكتابة_سلسلة_عشوائية_طويلة_هنا
NODE_ENV=development
PORT=5000
API_PORT=3001
```

### 3. تثبيت الاعتمادات
افتح الطرفية (Terminal) في مجلد المشروع وقم بتشغيل:
```bash
pnpm install
```

### 4. تهيئة قاعدة البيانات (Migration)
لرفع جداول البيانات إلى قاعدة البيانات الخاصة بك:
```bash
pnpm --filter @workspace/db run push
```

### 5. تشغيل المشروع في وضع التطوير
تحتاج إلى تشغيل الواجهة الخلفية (Backend) والواجهة الأمامية (Frontend) معاً:

- **تشغيل الـ Backend:**
  ```bash
  pnpm --filter @workspace/api-server run dev
  ```
- **تشغيل الـ Frontend:**
  ```bash
  pnpm --filter @workspace/school-manager run dev
  ```

سيكون التطبيق متاحاً على الرابط: `http://localhost:5000`

---

## 🌐 التشغيل في وضع الإنتاج (Production)
إذا كنت تريد رفع المشروع على خادم خاص:

1. **بناء المشروع:**
   ```bash
   pnpm run build:prod
   ```
2. **تشغيل الخادم الموحد:**
   سيقوم الخادم بتشغيل الـ API وتقديم ملفات الـ Frontend في نفس الوقت:
   ```bash
   NODE_ENV=production PORT=8080 DATABASE_URL=... JWT_SECRET=... node artifacts/api-server/dist/index.cjs
   ```

---

## 🔑 بيانات الدخول الافتراضية
عند تشغيل المشروع لأول مرة، سيتم إنشاء حساب مدير النظام تلقائياً:
- **البريد الإلكتروني:** `Rsyg991@gmail.com`
- **كلمة المرور:** `123456789`

---

## 🛠 حل المشكلات الشائعة
- **خطأ في pnpm**: تأكد من أنك تستخدم إصدار pnpm 9 فما فوق.
- **فشل الاتصال بقاعدة البيانات**: تأكد من أن PostgreSQL يعمل وأن الرابط في ملف `.env` صحيح.
- **مشاكل في البناء (Build)**: جرب مسح مجلدات `node_modules` وإعادة التثبيت باستخدام `pnpm install --frozen-lockfile`.
