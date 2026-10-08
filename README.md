# Amirverse V4

نسخه چهارم Amirverse؛ یک تجربه وب شخصی، سه‌بعدی، فارسی و موبایل‌محور که هسته هوش مصنوعی، حافظه، تولید محتوا و Tool System را در یک معماری واقعی کنار هم قرار می‌دهد.

## امکانات اصلی

### 🌌 دنیای سه‌بعدی
- میدان مرکزی و ساختمان‌های قابل تعامل
- ساختمان‌های بازدید، ساخت، دستیار، حافظه و کنترل
- کنترل لمسی با جوی‌استیک روی گوشی
- چرخش دید با کشیدن صفحه
- محافظت در برابر کلیک ناخواسته بعد از swipe
- سه سطح کیفیت سه‌بعدی + حالت کم‌مصرف
- تشخیص `prefers-reduced-motion`
- نورپردازی، مه، ستاره‌ها، ماه، شهر و آواتار ساده

### 🖼️ بازدید
- اتاق گالری سه‌بعدی
- افزودن عکس از گوشی
- فشرده‌سازی خودکار عکس برای نگه‌داری سبک‌تر در مرورگر
- افزودن متن شخصی به قاب‌ها
- حذف آیتم‌ها
- کلیک روی قاب و نمایش بزرگ
- نگه‌داری محلی آیتم‌های گالری

### 🎨 مرکز ساخت با AI
- تولید تصویر
- تولید سند متنی
- ساخت PDF
- ساخت PowerPoint
- تاریخچه متادیتای خروجی‌ها برای هر حساب
- دانلود مستقیم خروجی‌ها

### 🤖 Amirverse AI
- OpenAI Responses API
- چت ماندگار
- حافظه مرتبط
- اجرای چندمرحله‌ای Tool Call تا سقف مشخص
- ابزارهای جابه‌جایی، حافظه، تم، کیفیت، حالت کم‌مصرف، انیمیشن و صدا
- جلوگیری از ادعای اجرای کاری که انجام نشده

### 🧠 حافظه
- دیتابیس سروری
- نمایش و حذف
- حذف همه
- کپی JSON
- تفکیک مالکیت با `user_id`

### 👤 حساب کاربری
- ثبت‌نام و ورود
- رمزنگاری گذرواژه با bcrypt
- session cookie امن
- انقضای session
- rate limit برای ورود و ثبت‌نام

### ⚙️ کنترل
- تم تاریک/روشن
- کیفیت سه‌بعدی
- حالت کم‌مصرف
- انیمیشن
- صدای محیط
- نصب به‌عنوان PWA در مرورگرهای پشتیبان

### 🔐 امنیت و پایداری
- API Key فقط سمت سرور
- عدم استفاده از CDN برای Three.js
- هدرهای پایه امنیتی
- پاک‌سازی و محدودکردن ورودی‌ها
- rate limiting برای APIهای پرهزینه
- `no-store` برای پاسخ‌های حساس
- Error Boundary و صفحه 404
- مسیر Health برای بررسی دیتابیس و تنظیم بودن AI

## نصب روی ویندوز

پیش‌نیاز پیشنهادی: Node.js 22+

```powershell
cd مسیر\amirverse_v4
npm install
Copy-Item .env.example .env.local
npm run dev
```

سپس:

```text
http://localhost:3000
```

## فعال کردن AI واقعی

داخل `.env.local`:

```env
OPENAI_API_KEY=کلید-خودت
OPENAI_TEXT_MODEL=gpt-5.1
OPENAI_IMAGE_MODEL=gpt-image-2
```

کلید را داخل کد React یا مرورگر قرار نده.

## حافظه و دیتابیس ابری

برای اجرای محلی، همین مقدار کافی است:

```env
DATABASE_URL=file:./data/amirverse.db
```

برای Turso/libSQL:

```env
DATABASE_URL=libsql://YOUR-DB.turso.io
DATABASE_AUTH_TOKEN=YOUR_TOKEN
```

## PDF فارسی

V4 چند مسیر متداول فونت Unicode را خودکار امتحان می‌کند. برای محیط production بهتر است مسیر فونت را صریحاً تنظیم کنی:

```env
PDF_FONT_PATH=C:\Windows\Fonts\tahoma.ttf
```

یا یک فونت Unicode مناسب روی لینوکس سرور.

## APIهای مهم

```text
GET  /api/health
GET  /api/auth
POST /api/auth
GET  /api/preferences
POST /api/preferences
GET  /api/memory
POST /api/memory
DELETE /api/memory
GET  /api/artifacts
GET  /api/ai/chat
POST /api/ai/chat
POST /api/generate/image
POST /api/generate/document
POST /api/generate/pdf
POST /api/generate/ppt
```

## توجه مهم درباره این محیط

کد V4 از نظر parse و QA داخلی بررسی شده است. اجرای کامل `npm install` و `next build` در محیط ساخت فعلی به‌دلیل timeout شبکه و نبود dependencyهای npm قابل تکمیل نبود؛ بنابراین build موفق شبکه‌ای را ادعا نمی‌کنیم. پروژه همراه فایل‌های تست و راه‌اندازی تحویل داده شده تا روی سیستم خودت dependencyها نصب شوند.
