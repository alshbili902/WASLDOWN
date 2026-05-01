const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// حماية صفحة الدخول من التخمين
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات فقط
  message: 'محاولات دخول كثيرة، يرجى المحاولة بعد 15 دقيقة.'
});

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('login', { pageTitle: 'تسجيل الدخول', error: null });
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_WEB_USERNAME;
  const adminPass = process.env.ADMIN_WEB_PASSWORD;

  if (username && password && 
      username.trim() === adminUser.trim() && 
      password.trim() === adminPass.trim()) {
    req.session.admin = true;
    return res.redirect('/admin');
  }

  res.render('login', { pageTitle: 'تسجيل الدخول', error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;
