const express = require('express');
const router = express.Router();
const requireWebAdmin = require('../middlewares/requireWebAdmin');
const supabase = require('../../services/supabase');

router.use(requireWebAdmin);

// صفحة المستخدمين
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

    // البحث
    const search = req.query.search;
    if (search) {
      if (search.includes('@')) {
        query = query.ilike('email', `%${search}%`);
      } else if (!isNaN(search)) {
        query = query.eq('telegram_id', search);
      } else {
        query = query.ilike('full_name', `%${search}%`);
      }
    }

    const { data: users, error } = await query;
    if (error) throw error;

    res.render('users', {
      pageTitle: 'إدارة المستخدمين',
      users,
      search: search || ''
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('خطأ في جلب المستخدمين');
  }
});

// صفحة تفاصيل مستخدم
router.get('/:id', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !user) return res.status(404).render('404', { pageTitle: 'المستخدم غير موجود' });

    res.render('user-details', {
      pageTitle: `تفاصيل المستخدم ${user.full_name || user.email}`,
      user,
      success_msg: req.query.success_msg || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('خطأ');
  }
});

// إجراءات إدارة المستخدم والاشتراك
router.post('/:id/action', async (req, res) => {
  try {
    const { action, amount, unit } = req.body;
    const profileId = req.params.id;

    if (action === 'delete') {
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw error;
      return res.redirect('/admin/users');
    }

    let updates = { updated_at: new Date().toISOString() };

    if (action === 'activate') {
      const val = parseInt(amount) || 30;
      const ms = unit === 'minutes' ? val * 60 * 1000 : val * 24 * 60 * 60 * 1000;
      updates.is_subscribed = true;
      updates.subscription_end = new Date(Date.now() + ms).toISOString();
    } else if (action === 'deactivate') {
      updates.is_subscribed = false;
      updates.subscription_end = null;
    } else if (action === 'reset_trial') {
      updates.trial_used = 0;
    } else if (action === 'update_limit') {
      const limit = parseInt(req.body.trial_limit);
      if (!isNaN(limit)) updates.trial_limit = limit;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId);

    if (error) throw error;

    res.redirect(`/admin/users/${profileId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('حدث خطأ أثناء تنفيذ الإجراء');
  }
});

module.exports = router;
