const express = require('express');
const router = express.Router();
const requireWebAdmin = require('../middlewares/requireWebAdmin');
const supabase = require('../../services/supabase');
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

router.use(requireWebAdmin);

// صفحة الإرسال الجماعي
router.get('/', async (req, res) => {
  res.render('broadcast', {
    pageTitle: 'إرسال رسالة جماعية',
    success: req.query.success === 'true',
    error: req.query.error || null
  });
});

// تنفيذ الإرسال
router.post('/send', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.redirect('/admin/broadcast?error=يرجى كتابة رسالة');

    // جلب جميع المستخدمين الذين لديهم Telegram ID
    const { data: users, error } = await supabase
      .from('profiles')
      .select('telegram_id')
      .not('telegram_id', 'is', null);

    if (error) throw error;

    let successCount = 0;
    let failCount = 0;

    // إرسال الرسائل (مع تأخير بسيط لتجنب الحظر من تليجرام)
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'HTML' });
        successCount++;
        // تأخير 50 ملي ثانية بين كل رسالة
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error(`Failed to send to ${user.telegram_id}:`, err.message);
        failCount++;
      }
    }

    res.redirect(`/admin/broadcast?success=true&sent=${successCount}&failed=${failCount}`);
  } catch (error) {
    console.error(error);
    res.redirect('/admin/broadcast?error=حدث خطأ أثناء الإرسال');
  }
});

// إرسال لمستخدم محدد
router.post('/send-single', async (req, res) => {
  try {
    const { telegram_id, message, profile_id } = req.body;
    if (!telegram_id || !message) {
        return res.redirect(`/admin/users/${profile_id}?error=بيانات ناقصة`);
    }

    await bot.telegram.sendMessage(telegram_id, message, { parse_mode: 'HTML' });
    
    res.redirect(`/admin/users/${profile_id}?success_msg=تم إرسال الرسالة بنجاح`);
  } catch (error) {
    console.error(error);
    const profile_id = req.body.profile_id;
    res.redirect(`/admin/users/${profile_id}?error=فشل الإرسال: ${error.message}`);
  }
});

module.exports = router;
