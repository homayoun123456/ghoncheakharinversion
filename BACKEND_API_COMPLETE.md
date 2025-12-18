# 🌹 بک‌اند کامل غنچه لاله زار - Complete Backend API

## ✅ کارهای انجام شده

### 1. سرور اصلی (Main Server)
- `backend/server.js` - سرور Express.js کامل با تمام تنظیمات

### 2. پایگاه داده (Database)
- `backend/database.js` - SQLite با better-sqlite3
- جداول: users, posts, pages, products, messages, subscribers, media, settings, activity_log
- داده‌های اولیه خودکار (کاربر admin و محصولات نمونه)

### 3. احراز هویت (Authentication)
- `backend/middleware/auth.js` - Middleware های احراز هویت JWT
- `backend/routes/auth.js` - API های ورود، ثبت‌نام، پروفایل

### 4. مسیرهای API (API Routes)

| فایل | توضیحات |
|------|---------|
| `routes/auth.js` | ورود، خروج، پروفایل، تغییر رمز |
| `routes/posts.js` | CRUD مطالب با slug و SEO |
| `routes/pages.js` | CRUD صفحات با ساختار درختی |
| `routes/products.js` | CRUD محصولات با ویژگی‌ها و گالری |
| `routes/messages.js` | مدیریت پیام‌های تماس |
| `routes/subscribers.js` | مدیریت خبرنامه + خروجی CSV |
| `routes/media.js` | آپلود و مدیریت فایل |
| `routes/settings.js` | تنظیمات سایت |
| `routes/users.js` | مدیریت کاربران (ادمین) |

### 5. ابزارها (Utilities)
- `utils/helpers.js` - توابع کمکی (slug فارسی، فرمت تاریخ و...)
- `utils/email.js` - سرویس ایمیل (آماده برای SMTP)
- `utils/validation.js` - اعتبارسنجی ورودی‌ها

### 6. فایل‌های فرانت‌اند
- `admin/api-client.js` - کلاینت API برای پنل ادمین
- `js/api.js` - کلاینت API برای سایت اصلی
- `admin/admin.js` - جاوااسکریپت کامل ادمین با API

### 7. مستندات
- `backend/README.md` - مستندات کامل API
- `api-docs.html` - صفحه مستندات تعاملی

---

## 📋 API Endpoints

### 🔐 احراز هویت
```
POST   /api/auth/login      - ورود
POST   /api/auth/logout     - خروج
GET    /api/auth/check      - بررسی توکن
GET    /api/auth/me         - اطلاعات کاربر
PUT    /api/auth/profile    - بروزرسانی پروفایل
PUT    /api/auth/password   - تغییر رمز عبور
```

### 📝 مطالب
```
GET    /api/posts           - لیست مطالب
GET    /api/posts/:id       - جزئیات مطلب
POST   /api/posts           - ایجاد مطلب
PUT    /api/posts/:id       - ویرایش مطلب
DELETE /api/posts/:id       - حذف مطلب
```

### 📄 صفحات
```
GET    /api/pages           - لیست صفحات
GET    /api/pages/:id       - جزئیات صفحه
POST   /api/pages           - ایجاد صفحه
PUT    /api/pages/:id       - ویرایش صفحه
DELETE /api/pages/:id       - حذف صفحه
```

### 🛍️ محصولات
```
GET    /api/products        - لیست محصولات
GET    /api/products/:id    - جزئیات محصول
POST   /api/products        - ایجاد محصول
PUT    /api/products/:id    - ویرایش محصول
DELETE /api/products/:id    - حذف محصول
```

### 💬 پیام‌ها
```
GET    /api/messages        - لیست پیام‌ها
GET    /api/messages/:id    - جزئیات پیام
PUT    /api/messages/:id    - بروزرسانی پیام
DELETE /api/messages/:id    - حذف پیام
```

### 📧 خبرنامه
```
GET    /api/subscribers     - لیست مشترکین
GET    /api/subscribers/export/csv - خروجی CSV
POST   /api/subscribers     - افزودن مشترک
DELETE /api/subscribers/:id - حذف مشترک
```

### 🖼️ رسانه
```
GET    /api/media           - لیست فایل‌ها
POST   /api/media/upload    - آپلود فایل
POST   /api/media/upload-multiple - آپلود چند فایل
DELETE /api/media/:id       - حذف فایل
```

### ⚙️ تنظیمات
```
GET    /api/settings        - دریافت تنظیمات
GET    /api/settings/public - تنظیمات عمومی
PUT    /api/settings        - بروزرسانی تنظیمات
```

### 👥 کاربران (فقط ادمین)
```
GET    /api/users           - لیست کاربران
POST   /api/users           - ایجاد کاربر
PUT    /api/users/:id       - ویرایش کاربر
DELETE /api/users/:id       - حذف کاربر
```

### 🌐 عمومی (بدون احراز هویت)
```
POST   /api/contact         - ارسال فرم تماس
POST   /api/subscribe       - عضویت خبرنامه
GET    /api/health          - بررسی سلامت
GET    /api/stats           - آمار داشبورد
```

---

## 🚀 راه‌اندازی

### روش 1: از پوشه اصلی
```bash
npm install
npm start
```

### روش 2: از پوشه backend
```bash
cd backend
npm install
npm start
```

### روش 3: اسکریپت startup
```bash
./start-server.sh
```

---

## 🔑 اطلاعات ورود پیش‌فرض

```
نام کاربری: admin
رمز عبور: admin123
```

---

## 📁 ساختار فایل‌ها

```
backend/
├── server.js           # سرور اصلی Express
├── database.js         # تنظیم SQLite
├── package.json        # وابستگی‌ها
├── README.md           # مستندات
│
├── middleware/
│   └── auth.js         # میدلور احراز هویت
│
├── routes/
│   ├── auth.js         # API احراز هویت
│   ├── posts.js        # API مطالب
│   ├── pages.js        # API صفحات
│   ├── products.js     # API محصولات
│   ├── messages.js     # API پیام‌ها
│   ├── subscribers.js  # API خبرنامه
│   ├── media.js        # API رسانه
│   ├── settings.js     # API تنظیمات
│   └── users.js        # API کاربران
│
└── utils/
    ├── helpers.js      # توابع کمکی
    ├── email.js        # سرویس ایمیل
    └── validation.js   # اعتبارسنجی
```

---

## 🛡️ ویژگی‌های امنیتی

- ✅ احراز هویت JWT
- ✅ هش رمز عبور با bcrypt
- ✅ CORS محدود
- ✅ Session امن
- ✅ اعتبارسنجی ورودی
- ✅ محدودیت حجم آپلود
- ✅ فیلتر نوع فایل
- ✅ لاگ فعالیت‌ها

---

## 📊 پایگاه داده

SQLite با better-sqlite3 - سبک، سریع و بدون نیاز به سرور جداگانه

### جداول:
- `users` - کاربران
- `posts` - مطالب
- `pages` - صفحات
- `products` - محصولات
- `messages` - پیام‌ها
- `subscribers` - مشترکین
- `media` - رسانه‌ها
- `settings` - تنظیمات
- `activity_log` - لاگ فعالیت

---

## 🔧 متغیرهای محیطی

```env
PORT=3000
JWT_SECRET=your-secret-key
NODE_ENV=development
SMTP_HOST=smtp.example.com
SMTP_USER=your-email
SMTP_PASS=your-password
```

---

## 📞 پشتیبانی

- مستندات: `/api-docs.html`
- بررسی سلامت: `/api/health`
- پنل مدیریت: `/admin/login.html`

---

**غنچه لاله زار** - تولید و صادرات غنچه گل محمدی 🌹
