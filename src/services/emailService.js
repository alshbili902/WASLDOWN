const nodemailer = require('nodemailer');

// إعداد خدمة البريد باستخدام متغيرات البيئة أو حساب اختباري
let transporter;

async function initMailer() {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS.replace(/\s/g, '') // إزالة أي مسافات احتياطاً
      },
      tls: {
        rejectUnauthorized: false // لتجنب مشاكل الشهادات في بعض البيئات
      }
    });
  } else {
    // حساب Ethereal وهمي للتطوير
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('استخدام إيميل اختباري من Ethereal:', testAccount.user);
  }
}

initMailer();

async function sendOtpEmail(toEmail, otpCode) {
  if (!transporter) await initMailer();
  
  const sender = process.env.SMTP_USER || 'noreply@wasldownloader.com';
  
  const mailOptions = {
    from: `"وصل داونلودر" <${sender}>`,
    to: toEmail,
    subject: 'كود التحقق الخاص بك لربط تليجرام 🔒',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; direction: rtl;">
        <h2 style="color: #333;">مرحباً بك في وصل داونلودر!</h2>
        <p style="color: #666;">لقد طلبت ربط حسابك في الموقع مع بوت تليجرام.</p>
        <p style="color: #666;">كود التحقق الخاص بك هو:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 10px; display: inline-block; margin: 20px 0;">
          <h1 style="color: #4f46e5; letter-spacing: 5px; margin: 0;">${otpCode}</h1>
        </div>
        <p style="color: #999; font-size: 14px;">هذا الكود صالح لمدة 5 دقائق فقط.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (process.env.SMTP_HOST.includes('ethereal')) {
      console.log('تم إرسال إيميل تجريبي:', nodemailer.getTestMessageUrl(info));
    } else {
      console.log('تم إرسال الإيميل بنجاح إلى:', toEmail);
    }
  } catch (error) {
    console.error('SMTP Error:', error);
    throw new Error('فشل إرسال البريد الإلكتروني');
  }
}

module.exports = { sendOtpEmail };
