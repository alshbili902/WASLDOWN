const express = require('express');
const session = require('express-session');
const path = require('path');
const env = require('../config/env');

const app = express();

// إعداد EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// إعداد الجلسة
app.use(session({
  secret: process.env.ADMIN_SESSION_SECRET || 'fallback_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24 ساعة
  }
}));

// إعداد الـ Routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const couponRoutes = require('./routes/couponRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const webUserAuthRoutes = require('./routes/webUserAuthRoutes');
const accountRoutes = require('./routes/accountRoutes');
const apiRoutes = require('./routes/apiRoutes');
const toolRoutes = require('./routes/toolRoutes');

// Global Variables for all views
app.use((req, res, next) => {
  res.locals.userId = req.session.userId || null;
  res.locals.currentPage = req.path.split('/')[1] || 'home';
  res.locals.tools = []; // القيمة الافتراضية لتجنب الأخطاء في القوالب
  next();
});

// مسارات الموقع التعريفي (Landing Pages)
app.get('/', (req, res) => res.render('landing', { page: 'home' }));
app.get('/features', (req, res) => res.render('landing', { page: 'features' }));
app.get('/pricing', (req, res) => res.render('landing', { page: 'pricing' }));
app.get('/contact', (req, res) => res.render('landing', { page: 'contact' }));
app.get('/developer', (req, res) => res.render('landing', { page: 'developer' }));
app.get('/terms', (req, res) => res.render('landing', { page: 'terms' }));
app.get('/privacy', (req, res) => res.render('landing', { page: 'privacy' }));

// مسارات المستخدم
app.use('/', webUserAuthRoutes);
app.use('/', toolRoutes); // تم تقديمه لضمان الأولوية
app.use('/', accountRoutes);
app.use('/api', apiRoutes);

// المتغيرات العامة لجميع صفحات لوحة التحكم
app.use('/admin', (req, res, next) => {
  res.locals.path = req.path;
  res.locals.user = req.session.admin;
  next();
});

app.use('/auth', authRoutes);
app.use('/admin', dashboardRoutes);
app.use('/admin/users', userRoutes);
app.use('/admin/coupons', couponRoutes);

// صفحة غير موجودة
app.use((req, res) => {
  res.status(404).render('404', { pageTitle: 'الصفحة غير موجودة' });
});

const PORT = env.dashboardPort;
app.listen(PORT, () => {
  env.logStartupInfo();
  console.log(`🌐 Dashboard is running on http://localhost:${PORT}`);
});
