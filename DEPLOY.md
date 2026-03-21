# دليل النشر — مدراس (Meadras)

> نظام SaaS لإدارة المدارس السعودية — pnpm Workspaces + Express 5 + React 19 + PostgreSQL

---

## البنية المعمارية

```
Meadras/
├── artifacts/
│   ├── api-server/      ← Express 5 Backend  →  Render
│   └── school-manager/  ← React 19 Frontend  →  Vercel (اختياري)
├── lib/
│   ├── db/              ← Drizzle ORM + PostgreSQL schema
│   ├── api-zod/         ← Zod validation schemas
│   └── api-client-react/← React Query hooks
└── render.yaml          ← إعداد Render
```

---

## 🚀 الطريقة 1: Render All-in-One (الأبسط)

### الخطوات:

1. اذهب إلى [render.com](https://render.com) → New → Web Service
2. اربط GitHub واختر المستودع `rsyg991-cloud/Meadras`
3. اختر **Blueprint** ليقرأ Render ملف `render.yaml` تلقائياً
4. أضف متغيرات البيئة في الخدمة:

| المتغير | القيمة |
|---------|--------|
| `DATABASE_URL` | رابط PostgreSQL (Render أو خارجي) |
| `JWT_SECRET` | مفتاح عشوائي طويل |
| `NODE_ENV` | `production` |
| `MOYASAR_SECRET_KEY` | مفتاح Moyasar السري (اختياري) |
| `MOYASAR_PUBLISHABLE_KEY` | مفتاح Moyasar العام (اختياري) |

5. Render سيبني ويشغل الخدمة بالأوامر الموجودة في `render.yaml`.

**لتوليد JWT_SECRET آمن:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🌐 الطريقة 2: Render (Backend) + Vercel (Frontend)

### الجزء الأول — Render (API Backend):

1. أنشئ Web Service على Render من نفس المستودع
2. استخدم أوامر البناء والتشغيل التالية:

```bash
npm install -g pnpm@9
pnpm install --frozen-lockfile
BASE_PATH=/ pnpm --filter @workspace/school-manager run build
pnpm --filter @workspace/api-server run build
```

Start Command:

```bash
node artifacts/api-server/dist/index.cjs
```

3. أضف متغيرات البيئة:

| المتغير | القيمة |
|---------|--------|
| `DATABASE_URL` | رابط PostgreSQL |
| `JWT_SECRET` | مفتاح عشوائي طويل |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |

### الجزء الثاني — Vercel (Frontend):

1. اذهب إلى [vercel.com](https://vercel.com) → New Project
2. استورد المستودع واضبط **Root Directory**: `artifacts/school-manager`
3. عدّل `artifacts/school-manager/vercel.json` واستبدل:

```txt
https://YOUR_RENDER_BACKEND_URL/api/$1
```

برابط Render الفعلي، مثال:

```txt
https://meadras-api.onrender.com/api/$1
```

4. أضف متغير البيئة في Vercel: `NODE_ENV=production`

---

## 🚄 الطريقة 3: Railway (Backend) + Vercel (Frontend)

### الجزء الأول — Railway (API Backend):

1. في Railway أنشئ Service من نفس المستودع (Deploy from GitHub).
2. Railway سيقرأ `railway.json` تلقائياً ويستخدم:

- Build: تثبيت pnpm ثم بناء `@workspace/school-manager` و `@workspace/api-server`
- Start: `node artifacts/api-server/dist/index.cjs`
- Healthcheck: `/api/health`

3. أضف متغيرات البيئة في Railway:

| المتغير | القيمة |
|---------|--------|
| `DATABASE_URL` | رابط PostgreSQL |
| `JWT_SECRET` | مفتاح عشوائي طويل |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | رابط Vercel النهائي، مثال: `https://your-app.vercel.app` |

### الجزء الثاني — Vercel (Frontend):

1. في Vercel أنشئ مشروع جديد من نفس المستودع.
2. اضبط **Root Directory** على: `artifacts/school-manager`
3. افتح ملف `artifacts/school-manager/vercel.json` واستبدل:

```txt
https://YOUR_RAILWAY_BACKEND_URL/api/$1
```

برابط Railway الفعلي، مثال:

```txt
https://meadras-api-production.up.railway.app/api/$1
```

4. أضف متغير البيئة في Vercel: `NODE_ENV=production`
5. أعد Deploy في Vercel بعد تحديث rewrite.

---

## 🔧 البناء المحلي

```bash
pnpm install
pnpm run build:prod
NODE_ENV=production PORT=3001 DATABASE_URL=<url> JWT_SECRET=<secret> \
  node artifacts/api-server/dist/index.cjs
```

---

## 📋 متغيرات البيئة

| المتغير | الوصف | مطلوب |
|---------|-------|--------|
| `DATABASE_URL` | رابط PostgreSQL | ✅ إلزامي |
| `JWT_SECRET` | مفتاح JWT السري (64+ حرف) | ✅ إلزامي |
| `PORT` | يضبط تلقائياً من منصة الاستضافة | تلقائي |
| `NODE_ENV` | `production` | ✅ إلزامي |
| `FRONTEND_URL` | عنوان Vercel (إذا كانا منفصلين) | اختياري |
| `MOYASAR_SECRET_KEY` | مفتاح Moyasar السري | اختياري |
| `MOYASAR_PUBLISHABLE_KEY` | مفتاح Moyasar العام | اختياري |

---

## ⚠️ ملاحظات مهمة

- استخدم **pnpm** دائماً.
- قاعدة البيانات تُهاجَر تلقائياً عند أول تشغيل.
- `JWT_SECRET` يجب أن يكون ثابتاً ولا يتغير بين إعادة التشغيل.
- عند استخدام PostgreSQL مُدار، تأكد من تفعيل SSL في الإنتاج.
