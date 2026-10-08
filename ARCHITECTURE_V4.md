# معماری Amirverse V4

```text
Browser / Mobile
      │
      ▼
Next.js App Router
      │
 ┌────┴────────────┐
 ▼                 ▼
UI + Three.js      API Routes
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
        Auth       Memory      AI
          │          │          │
          └──────────┼──────────┘
                     ▼
                 libSQL/SQLite
                     │
                     ▼
             OpenAI Responses API
                     │
                     ▼
                Tool System
```

## مرزها

- `components/`: فقط رابط کاربری و تعامل مرورگر
- `WorldCanvas.tsx`: موتور Three.js سمت کلاینت
- `app/api/`: مرز سرور برای auth، memory، AI و generation
- `lib/`: منطق دامنه، دیتابیس، امنیت، ابزارها و تولید فایل
- `public/`: manifest و فایل‌های عمومی

## اصل امنیتی

`OPENAI_API_KEY` هرگز در Client Component استفاده نمی‌شود. مرورگر فقط با endpointهای `/api/*` کار می‌کند.

## چرخه Tool

```text
User Message
    ↓
Responses API
    ↓
Function Call
    ↓
runTool()
    ↓
Action for Browser + Tool Output
    ↓
Responses API again
    ↓
Final Persian Answer
```

چرخه حداکثر پنج دور اجرا می‌شود تا Tool Loop بی‌نهایت نشود.

## داده‌ها

### users
اطلاعات حساب و hash رمز عبور

### sessions
session token hash و تاریخ انقضا

### memories
حافظه‌های مستقل هر کاربر

### messages
تاریخچه چت هر کاربر

### preferences
تنظیمات تجربه کاربری

### artifacts
تاریخچه متادیتای خروجی‌های ساخته‌شده

## کنترل عملکرد

- `performance`: کمترین هزینه رندر
- `balanced`: انتخاب پیش‌فرض
- `high`: کیفیت بالاتر برای دستگاه‌های قوی
- `lowPower`: کاهش Pixel Ratio، آنتی‌الایز و تعداد ستاره‌ها
- `prefers-reduced-motion`: خاموش‌کردن انیمیشن‌های رابط
