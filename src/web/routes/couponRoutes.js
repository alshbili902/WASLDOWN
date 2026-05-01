const express = require('express');
const router = express.Router();
const requireWebAdmin = require('../middlewares/requireWebAdmin');
const supabase = require('../../services/supabase');

// عرض الكوبونات
router.get('/', requireWebAdmin, async (req, res) => {
  try {
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.render('coupons', {
      pageTitle: 'إدارة الكوبونات',
      coupons: coupons || [],
      error: req.query.error,
      success: req.query.success
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).send('حدث خطأ أثناء جلب الكوبونات');
  }
});

// إنشاء كوبون جديد
router.post('/create', requireWebAdmin, async (req, res) => {
  const { code, discount_percentage, expires_at, usage_limit, subscription_days } = req.body;
  
  if (!code || !discount_percentage) {
    return res.redirect('/admin/coupons?error=الرجاء إدخال رمز الكوبون والنسبة');
  }

  try {
    const { error } = await supabase.from('coupons').insert([{
      code: code.toUpperCase().trim(),
      discount_percentage: parseInt(discount_percentage),
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
      usage_limit: usage_limit ? parseInt(usage_limit) : null,
      // يمكننا إضافة أيام اشتراك للمستخدم إذا أردنا استخدام الكوبونات كطريقة لتفعيل الاشتراكات المجانية
      // subscription_days: subscription_days ? parseInt(subscription_days) : null
    }]);

    if (error) {
      if (error.code === '23505') {
        return res.redirect('/admin/coupons?error=رمز الكوبون موجود مسبقاً');
      }
      throw error;
    }

    res.redirect('/admin/coupons?success=تم إنشاء الكوبون بنجاح');
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.redirect('/admin/coupons?error=حدث خطأ أثناء إنشاء الكوبون');
  }
});

// حذف كوبون
router.post('/delete/:code', requireWebAdmin, async (req, res) => {
  const { code } = req.params;
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('code', code);

    if (error) throw error;
    res.redirect('/admin/coupons?success=تم حذف الكوبون بنجاح');
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.redirect('/admin/coupons?error=حدث خطأ أثناء حذف الكوبون');
  }
});

module.exports = router;
