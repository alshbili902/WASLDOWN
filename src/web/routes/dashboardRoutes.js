const express = require('express');
const router = express.Router();
const requireWebAdmin = require('../middlewares/requireWebAdmin');
const supabase = require('../../services/supabase');

router.get('/', requireWebAdmin, async (req, res) => {
  try {
    // جلب الإحصائيات من قاعدة البيانات
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalUsers = users.length;
    let subscribed = 0;
    let trialEnded = 0;
    let totalDownloads = 0;
    
    const now = new Date().getTime();

    users.forEach(u => {
      totalDownloads += (u.total_downloads || 0);
      
      // التحقق من الاشتراك
      let isSubActive = false;
      if (u.is_subscribed && u.subscription_end) {
        if (new Date(u.subscription_end).getTime() > now) {
          isSubActive = true;
          subscribed++;
        }
      }

      // التحقق من انتهاء التجربة
      if (!isSubActive && (u.trial_used || 0) >= (u.trial_limit || 5)) {
        trialEnded++;
      }
    });

    const notSubscribed = totalUsers - subscribed;

    res.render('dashboard', {
      pageTitle: 'الرئيسية',
      stats: {
        totalUsers,
        subscribed,
        notSubscribed,
        trialEnded,
        totalDownloads
      },
      recentUsers: users.slice(0, 10) // آخر 10 مستخدمين
    });
  } catch (error) {
    console.error('Error in dashboard:', error);
    res.status(500).send('حدث خطأ في الخادم');
  }
});

module.exports = router;
