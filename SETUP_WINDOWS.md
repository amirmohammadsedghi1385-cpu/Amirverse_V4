# راه‌اندازی Amirverse V4 در ویندوز

## ۱. نصب Node.js

Node.js 22 یا بالاتر نصب باشد.

بررسی:

```powershell
node -v
npm -v
```

## ۲. ورود به پوشه پروژه

```powershell
cd C:\مسیر\amirverse_v4
```

## ۳. نصب پکیج‌ها

```powershell
npm install
```

## ۴. ساخت فایل محیطی

```powershell
Copy-Item .env.example .env.local
```

## ۵. کلید OpenAI

`.env.local` را باز کن و مقدار زیر را وارد کن:

```env
OPENAI_API_KEY=YOUR_KEY
```

## ۶. اجرای توسعه

```powershell
npm run dev
```

بعد در مرورگر باز کن:

```text
http://localhost:3000
```

## ۷. تست Health

در مرورگر:

```text
http://localhost:3000/api/health
```

پاسخ سالم باید چیزی شبیه این باشد:

```json
{"ok":true,"database":"ready","aiConfigured":true}
```

## ۸. PDF فارسی

اگر PDF فارسی به فونت نیاز داشت:

```env
PDF_FONT_PATH=C:\Windows\Fonts\tahoma.ttf
```

## ۹. Build production

```powershell
npm run build
npm start
```
