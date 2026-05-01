# وصل داونلودر

بوت تليجرام عربي لتحميل المقاطع العامة من TikTok وInstagram وX/Twitter وYouTube Shorts باستخدام Node.js وTelegraf وSupabase وyt-dlp وFFmpeg.

> البوت مخصص للروابط العامة فقط. لا تستخدمه لتحميل محتوى خاص أو محتوى لا تملك حق تحميله.

## المزايا

- تسجيل المستخدم تلقائيًا عند `/start`.
- 5 تحميلات مجانية لكل مستخدم جديد.
- اشتراك شهري يدوي بقيمة 10 ريال.
- أوامر أدمن محمية عبر `ADMIN_IDS`.
- لا يتم خصم الرصيد إلا بعد نجاح إرسال الفيديو.
- حد أقصى لحجم الملف.
- منع السبام عبر مهلة بين طلبات التحميل.
- قاعدة البيانات الوحيدة: Supabase.

## هيكل المشروع

```text
wasl-downloader-bot/
├── package.json
├── .env.example
├── README.md
├── supabase.sql
├── src/
│   ├── bot.js
│   ├── config/
│   │   └── env.js
│   ├── services/
│   │   ├── supabase.js
│   │   ├── userService.js
│   │   └── downloaderService.js
│   ├── commands/
│   │   ├── userCommands.js
│   │   └── adminCommands.js
│   ├── middlewares/
│   │   ├── authAdmin.js
│   │   └── cooldown.js
│   └── utils/
│       ├── messages.js
│       ├── validators.js
│       └── cleanup.js
```

## إنشاء بوت من BotFather

1. افتح تليجرام وابحث عن `@BotFather`.
2. أرسل الأمر `/newbot`.
3. اختر اسمًا للبوت، مثل: `وصل داونلودر`.
4. اختر اسم مستخدم ينتهي بـ `bot`.
5. انسخ التوكن وضعه في `BOT_TOKEN`.

## جلب ADMIN_IDS

1. افتح تليجرام وابحث عن `@userinfobot` أو أي بوت يعرض معرف حسابك.
2. انسخ رقم `Id`.
3. ضع الرقم داخل `.env`:

```env
ADMIN_IDS=123456789
```

لأكثر من أدمن:

```env
ADMIN_IDS=123456789,987654321
```

## إعداد Supabase

1. أنشئ حسابًا في Supabase.
2. أنشئ مشروعًا جديدًا.
3. من Project Settings ثم API انسخ:
   - Project URL إلى `SUPABASE_URL`
   - anon public key إلى `SUPABASE_ANON_KEY`
4. افتح SQL Editor في Supabase.
5. انسخ محتوى ملف `supabase.sql` ونفذه.

الجدول المطلوب سيُنشأ باسم `users` داخل schema `public`.

## ملف البيئة

انسخ `.env.example` إلى `.env`:

```bash
cp .env.example .env
```

ثم عدل القيم:

```env
BOT_TOKEN=ضع_توكن_البوت
ADMIN_IDS=ضع_معرفات_الأدمن
SUPABASE_URL=ضع_رابط_مشروع_supabase
SUPABASE_ANON_KEY=ضع_مفتاح_anon
TRIAL_LIMIT=5
SUBSCRIPTION_PRICE=10
YTDLP_PATH=yt-dlp
FFMPEG_PATH=ffmpeg
MAX_FILE_SIZE_MB=50
DOWNLOAD_COOLDOWN_SECONDS=20
```

## تثبيت المتطلبات على Ubuntu

```bash
sudo apt update
sudo apt install -y ffmpeg python3-pip
pip3 install -U yt-dlp
```

ثبت Node.js 18 أو أحدث. مثال باستخدام NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

تحقق من الإصدارات:

```bash
node -v
npm -v
yt-dlp --version
ffmpeg -version
```

## التشغيل المحلي

```bash
npm install
npm start
```

عند نجاح التشغيل ستظهر رسالة:

```text
تم تشغيل بوت وصل داونلودر بنجاح
```
## لوحة التحكم (Admin Dashboard) 🌐

تمت إضافة لوحة تحكم ويب احترافية لإدارة المستخدمين واشتراكاتهم بسهولة.

### طريقة الدخول للوحة التحكم:
1. تأكد من تحديث ملف `.env` وإضافة المتغيرات الخاصة باللوحة:
   ```env
   ADMIN_WEB_USERNAME=admin
   ADMIN_WEB_PASSWORD=admin123
   ADMIN_SESSION_SECRET=super_secret_key
   DASHBOARD_PORT=3000
   ```
2. لتشغيل اللوحة محلياً:
   ```bash
   npm run web
   ```
3. افتح المتصفح على الرابط: `http://localhost:3000`

### التشغيل المستمر عبر PM2 (للسيرفر):
يمكنك تشغيل البوت ولوحة التحكم معاً في الخلفية عبر PM2:
```bash
# تشغيل البوت
pm2 start src/bot.js --name wasl-downloader-bot

# تشغيل لوحة التحكم
pm2 start src/web/server.js --name wasl-downloader-dashboard

# حفظ الإعدادات لتعمل مع إعادة تشغيل السيرفر
pm2 save
```

### ملاحظات أمنية هامة 🔒:
- **لا تترك كلمة المرور الافتراضية `admin123`، قم بتغييرها فوراً في ملف `.env`!**
- إذا كنت تستخدم AWS EC2 أو أي خادم سحابي، تأكد من فتح المنفذ (Port 3000) في إعدادات (Security Groups) للوصول للوحة من الخارج.
- يُنصح بربط اللوحة بدومين مع شهادة SSL (HTTPS) إذا كانت اللوحة متاحة على الإنترنت.
## أوامر المستخدم

- `/start` تسجيل وترحيب.
- `/help` تعليمات الاستخدام.
- `/my_status` عرض حالة الحساب والرصيد.
- إرسال رابط مباشر لتحميل الفيديو.

## أوامر الأدمن

هذه الأوامر تعمل فقط للحسابات الموجودة في `ADMIN_IDS`.

```text
/stats
/users
/activate USER_ID 30
/deactivate USER_ID
/reset_trial USER_ID
/broadcast نص الرسالة
```

أمثلة:

```text
/activate 123456789 30
/deactivate 123456789
/reset_trial 123456789
/broadcast تم تحديث الخدمة، شكرًا لاستخدامكم وصل داونلودر.
```

## التشغيل على AWS EC2

1. أنشئ EC2 Ubuntu.
2. افتح منفذ SSH فقط، لأن البوت يعمل بنظام polling ولا يحتاج منفذ ويب.
3. اتصل بالسيرفر:

```bash
ssh -i key.pem ubuntu@YOUR_SERVER_IP
```

4. ثبت المتطلبات:

```bash
sudo apt update
sudo apt install -y git ffmpeg python3-pip
pip3 install -U yt-dlp
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

5. ارفع المشروع أو اسحبه من Git:

```bash
git clone YOUR_REPOSITORY_URL wasl-downloader-bot
cd wasl-downloader-bot
```

6. جهز `.env`:

```bash
cp .env.example .env
nano .env
```

7. ثبت الحزم:

```bash
npm install
```

8. جرب التشغيل:

```bash
npm start
```

## التشغيل عبر PM2

```bash
sudo npm install -g pm2
pm2 start src/bot.js --name wasl-downloader
pm2 save
pm2 startup
pm2 logs wasl-downloader
```

بعد تنفيذ `pm2 startup` سيظهر أمر طويل. انسخه ونفذه كما هو لتفعيل التشغيل التلقائي بعد إعادة تشغيل السيرفر.

أوامر PM2 المهمة:

```bash
pm2 status
pm2 logs wasl-downloader
pm2 restart wasl-downloader
pm2 stop wasl-downloader
pm2 delete wasl-downloader
pm2 monit
```

## أشهر الأخطاء وحلولها

### البوت لا يعمل ويظهر خطأ BOT_TOKEN

تأكد أن ملف `.env` موجود وأن `BOT_TOKEN` غير فارغ.

### خطأ في Supabase

تأكد من:

- صحة `SUPABASE_URL`.
- صحة `SUPABASE_ANON_KEY`.
- تنفيذ ملف `supabase.sql`.
- وجود جدول `users` في schema `public`.

### yt-dlp غير موجود

نفذ:

```bash
pip3 install -U yt-dlp
yt-dlp --version
```

إذا كان المسار مختلفًا، ضع المسار الكامل في:

```env
YTDLP_PATH=/home/ubuntu/.local/bin/yt-dlp
```

### FFmpeg غير موجود

نفذ:

```bash
sudo apt install -y ffmpeg
ffmpeg -version
```

### الملف أكبر من الحد المسموح

ارفع قيمة:

```env
MAX_FILE_SIZE_MB=50
```

مع الانتباه إلى حدود إرسال الملفات في تليجرام واستهلاك موارد السيرفر.

### رسالة الرابط غير مدعوم

تأكد أن الرابط من موقع مدعوم وأن فيديو YouTube بصيغة Shorts عند استخدام youtube.com.

### الاشتراك انتهى رغم أنه كان مفعلًا

البوت يفحص تاريخ `subscription_end` تلقائيًا. إذا انتهى التاريخ يعود المستخدم إلى غير مشترك.

## ملاحظات إنتاجية

- استخدم EC2 بحجم مناسب إذا كان عدد المستخدمين كبيرًا.
- راقب مساحة التخزين لأن التحميل يتم مؤقتًا داخل مجلد `tmp`.
- حدث yt-dlp دوريًا لأن المواقع تغير آلياتها باستمرار:

```bash
pip3 install -U yt-dlp
pm2 restart wasl-downloader
```

- لا تشارك ملف `.env` أو مفاتيح Supabase مع أي شخص.
