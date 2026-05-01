const env = require('../config/env');

function formatDate(value) {
  if (!value) return 'غير محدد';

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Riyadh'
  }).format(new Date(value));
}

function welcome(user) {
  const remaining = Math.max((user.trial_limit || env.trialLimit) - (user.trial_used || 0), 0);

  return [
    'أهلًا بك في وصل داونلودر.',
    '',
    'أرسل رابط فيديو عام من Snapchat أو TikTok أو Instagram أو X/Twitter أو YouTube Shorts، وسأجهز لك المقطع مباشرة.',
    '',
    `لديك ${remaining} تحميلات مجانية للتجربة.`,
    `الاشتراك الشهري ${env.subscriptionPrice} ريال`,
    'تحميل غير محدود + مميزات إضافية',
    '',
    'الأوامر المتاحة:',
    '/help',
    '/my_status'
  ].join('\n');
}

function help() {
  return [
    'طريقة الاستخدام:',
    '',
    '1. أرسل رابط فيديو عام مدعوم.',
    '2. انتظر حتى يتم تجهيز المقطع.',
    '3. سيتم إرسال الفيديو داخل المحادثة.',
    '',
    'المواقع المدعومة: Snapchat، TikTok، Instagram، X/Twitter، YouTube Shorts.',
    '',
    'لا يتم خصم أي تحميل من رصيدك إلا بعد إرسال الفيديو بنجاح.'
  ].join('\n');
}

function subscriptionRequired(user) {
  const userId = user ? user.telegram_id : 'غير معروف';
  const waMessage = encodeURIComponent(`أهلاً، أريد الاشتراك في بوت وصل داونلودر (الباقة الشهرية)\n\nمعلومات العميل:\nرقم تليجرام: ${userId}`);
  
  return [
    'انتهت تحميلات التجربة المجانية.',
    '',
    `الاشتراك الشهري ${env.subscriptionPrice} ريال`,
    'تحميل غير محدود + مميزات إضافية',
    '',
    'للاشتراك، تواصل مع الدعم الفني عبر الرابط التالي:',
    `https://wa.me/966556805220?text=${waMessage}`
  ].join('\n');
}

function accountStatus(user) {
  const trialLimit = user.trial_limit || env.trialLimit;
  const trialUsed = user.trial_used || 0;
  const remaining = Math.max(trialLimit - trialUsed, 0);

  const subscriptionText = user.is_subscribed
    ? `مشترك حتى: ${formatDate(user.subscription_end)}`
    : 'غير مشترك';

  return [
    'حالة حسابك:',
    '',
    `رقم المستخدم: ${user.telegram_id}`,
    `الاشتراك: ${subscriptionText}`,
    `رصيد التجربة المتبقي: ${remaining} من ${trialLimit}`,
    `إجمالي التحميلات الناجحة: ${user.total_downloads || 0}`,
    '',
    '💡 لتغيير البريد الإلكتروني المرتبط، استخدم الأمر: /change_email'
  ].join('\n');
}

function adminActivated(userId, days) {
  return `تم تفعيل اشتراك المستخدم ${userId} لمدة ${days} يوم بنجاح.`;
}

function adminDeactivated(userId) {
  return `تم إلغاء اشتراك المستخدم ${userId} بنجاح.`;
}

function invalidUrl() {
  return 'الرابط غير مدعوم. أرسل رابطًا عامًا من Snapchat أو TikTok أو Instagram أو X/Twitter أو YouTube Shorts.';
}

function downloadFailed(reason) {
  return `تعذر تحميل المقطع. السبب: ${reason || 'حدث خطأ غير متوقع أثناء التحميل.'}`;
}

function waiting() {
  return 'جاري تجهيز الملف، يرجى الانتظار...';
}

function cooldown(seconds) {
  return `يرجى الانتظار ${seconds} ثانية قبل طلب تحميل جديد.`;
}

module.exports = {
  welcome,
  help,
  subscriptionRequired,
  accountStatus,
  adminActivated,
  adminDeactivated,
  invalidUrl,
  downloadFailed,
  waiting,
  cooldown,
  formatDate
};
