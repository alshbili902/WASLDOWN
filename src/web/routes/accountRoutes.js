const express = require('express');
const router = express.Router();
const supabase = require('../../services/supabase');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    const redirect = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?redirect=${redirect}&error=الرجاء تسجيل الدخول للوصول لحسابك`);
  }
  next();
}

router.get('/account', requireAuth, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.session.userId)
      .single();

    if (error) throw error;

    // جلب آخر العمليات
    const { data: logs } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.render('account', {
      page: 'account',
      profile,
      logs: logs || [],
      error: req.query.error,
      success: req.query.success
    });
  } catch (err) {
    console.error('Account error:', err);
    res.redirect('/login?error=حدث خطأ أثناء تحميل الحساب');
  }
});

router.post('/account/link-telegram', requireAuth, async (req, res) => {
  try {
    const code = 'WASL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase.from('linking_codes').insert([{
      profile_id: req.session.userId,
      code,
      expires_at: expiresAt
    }]);

    res.redirect(`/account?success=كود الربط الخاص بك هو: ${code} (صالح لمدة 15 دقيقة، أرسله للبوت /link ${code})`);
  } catch (err) {
    console.error('Linking error:', err);
    res.redirect('/account?error=حدث خطأ أثناء توليد الكود');
  }
});

module.exports = router;
