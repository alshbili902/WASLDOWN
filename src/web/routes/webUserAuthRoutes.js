const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../../services/supabase');

router.get('/login', (req, res) => {
  const redirect = req.query.redirect || '';
  if (req.session.userId) return res.redirect(redirect || '/account');
  res.render('user-login', { 
    page: 'login', 
    error: req.query.error, 
    success: req.query.success,
    redirect 
  });
});

router.post('/login', async (req, res) => {
  const { email, password, redirect } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.redirect(`/login?redirect=${encodeURIComponent(redirect || '')}&error=${encodeURIComponent(error.message)}`);
    }

    req.session.userId = data.user.id;
    res.redirect(redirect || '/account');
  } catch (err) {
    console.error('Login error:', err);
    res.redirect(`/login?redirect=${encodeURIComponent(redirect || '')}&error=حدث خطأ أثناء تسجيل الدخول`);
  }
});

router.get('/register', (req, res) => {
  const redirect = req.query.redirect || '';
  if (req.session.userId) return res.redirect(redirect || '/account');
  res.render('user-register', { 
    page: 'register', 
    error: req.query.error,
    redirect 
  });
});

router.post('/register', async (req, res) => {
  const { full_name, email, password, password_confirm, redirect } = req.body;
  
  if (password !== password_confirm) {
    return res.redirect(`/register?redirect=${encodeURIComponent(redirect || '')}&error=كلمتا المرور غير متطابقتين`);
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
        emailRedirectTo: 'http://13.60.82.20/auth/callback'
      }
    });

    if (error) {
      return res.redirect(`/register?redirect=${encodeURIComponent(redirect || '')}&error=${encodeURIComponent(error.message)}`);
    }

    // إنشاء بروفايل في جدول profiles إذا لم يكن هناك ترجر
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: data.user.id,
          full_name,
          email,
          plan_type: 'free',
          is_subscribed: false
        }]);
      
      if (profileError) console.error('Profile creation error:', profileError);
    }

    res.redirect(`/login?success=${encodeURIComponent('تم إرسال رابط التحقق لبريدك الإلكتروني. يرجى تفعيل حسابك للدخول.')}`);
  } catch (err) {
    console.error('Register error:', err);
    res.redirect(`/register?redirect=${encodeURIComponent(redirect || '')}&error=حدث خطأ أثناء إنشاء الحساب`);
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/');
  });
});

// إضافة مسار Callback للتحقق من الإيميل
router.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      // تحديث حالة التحقق في جدول profiles
      await supabase.from('profiles').update({ email_verified: true }).eq('id', data.session.user.id);
      
      req.session.userId = data.session.user.id;
      return res.redirect('/account?success=تم تفعيل الحساب بنجاح');
    }
  }
  res.redirect('/login?error=فشل التحقق من الإيميل أو انتهت صلاحية الرابط');
});

module.exports = router;
