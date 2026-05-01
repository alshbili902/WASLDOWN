const express = require('express');
const router = express.Router();
const supabase = require('../../services/supabase');
const downloaderService = require('../../services/downloaderService');
const linkShortenerService = require('../../services/linkShortenerService');
const aiService = require('../../services/aiService');
const imageEnhanceService = require('../../services/imageEnhanceService');
const imageConverterService = require('../../services/imageConverterService');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'temp_uploads/', limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

async function requireApiAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'الرجاء تسجيل الدخول أولاً' });
  }
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', req.session.userId).single();
  if (!profile) return res.status(401).json({ error: 'الحساب غير موجود' });
  
  req.profile = profile;
  next();
}

async function checkLimits(req, res, next) {
  const p = req.profile;
  
  // استثناء خاص للمسؤول
  if (p.email === 'aa0556805220@gmail.com') return next();

  // المشتركين في VIP لا تنطبق عليهم القيود
  const isSubActive = p.is_subscribed && new Date(p.subscription_end).getTime() > Date.now();
  if (isSubActive) return next();

  // جلب سجلات اليوم الحالي
  const today = new Date().toISOString().split('T')[0];
  const { data: logs, error } = await supabase
    .from('usage_logs')
    .select('action_type')
    .eq('profile_id', p.id)
    .gte('created_at', `${today}T00:00:00Z`);

  if (error) return next();

  // تصنيف العمليات
  const downloads = logs.filter(l => l.action_type.includes('تحميل')).length;
  const others = logs.filter(l => !l.action_type.includes('تحميل')).length;

  // تحديد نوع العملية الحالية من المسار
  const isDownloadAction = req.path.includes('download') || req.path.includes('media');

  if (isDownloadAction) {
    if (downloads >= 10) {
      return res.status(403).json({ 
        error: 'انتهت حدود التحميل المجانية (10 مرات يومياً). اشترك الآن في باقة VIP للحصول على تحميل غير محدود وميزات احترافية! 🚀' 
      });
    }
  } else {
    if (others >= 2) {
      return res.status(403).json({ 
        error: 'وصلت للحد الأقصى لاستخدام الأدوات الإضافية (مرتين يومياً). اشترك في VIP لفتح كافة الأدوات بلا حدود! ⭐' 
      });
    }
  }
  
  next();
}

async function consumeLimitAndLog(profile, action_type) {
  const isSubActive = profile.is_subscribed && new Date(profile.subscription_end).getTime() > Date.now();
  const updates = { total_downloads: (profile.total_downloads || 0) + 1 };
  if (!isSubActive) {
    updates.trial_used = (profile.trial_used || 0) + 1;
  }
  
  await supabase.from('profiles').update(updates).eq('id', profile.id);
  
  await supabase.from('usage_logs').insert([{
    profile_id: profile.id,
    source: 'website',
    action_type,
    status: 'success'
  }]);
}

router.use(requireApiAuth);
router.use(checkLimits);

// 1. اختصار رابط
router.post('/shorten-link', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'الرابط مطلوب' });
    const shortUrl = await linkShortenerService.shortenUrl(url);
    await consumeLimitAndLog(req.profile, 'اختصار رابط');
    res.json({ result: shortUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. تحليل محتوى
router.post('/analyze-content', async (req, res) => {
  try {
    if (req.profile.plan_type !== 'vip') return res.status(403).json({ error: 'هذه الميزة لـ VIP فقط ⭐' });
    const { text } = req.body;
    const result = await aiService.analyzeContent(text, process.env.OPENAI_API_KEY);
    await consumeLimitAndLog(req.profile, 'تحليل محتوى');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. تلخيص فيديو
router.post('/summarize-video', async (req, res) => {
  try {
    if (req.profile.plan_type !== 'vip') return res.status(403).json({ error: 'هذه الميزة لـ VIP فقط ⭐' });
    const { url } = req.body;
    const result = await aiService.summarizeVideo(url, process.env.OPENAI_API_KEY);
    await consumeLimitAndLog(req.profile, 'تلخيص فيديو');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. تحميل فيديو / صوت (القديم - سنبقيه مؤقتاً للتوافق)
router.post('/download', async (req, res) => {
  const { url, format } = req.body;
  if (!url) return res.status(400).json({ error: 'الرابط مطلوب' });
  
  try {
    const downloadResult = await downloaderService.downloadMedia(url, format || 'video');
    await consumeLimitAndLog(req.profile, format === 'video' ? 'تحميل فيديو' : 'تحميل صوت');
    
    const ext = format === 'audio' ? 'mp3' : 'mp4';
    const fileName = `wasl_${ext}_${Date.now()}.${ext}`;
    
    // Strict Headers for iPhone/Safari
    res.setHeader('Content-Type', ext === 'mp4' ? 'video/mp4' : 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.download(downloadResult.filePath, fileName, (err) => {
      // Delay cleanup to 30 minutes as requested
      setTimeout(() => {
        if (downloadResult.jobDirectory && fs.existsSync(downloadResult.jobDirectory)) {
          fs.rmSync(downloadResult.jobDirectory, { recursive: true, force: true });
        }
      }, 30 * 60 * 1000);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Unified Media Endpoints ---

// POST /api/media/inspect
router.post('/media/inspect', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'الرابط مطلوب' });
    const result = await downloaderService.inspectMedia(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/download-video
router.post('/media/download-video', async (req, res) => {
  try {
    const { url, quality } = req.body;
    // quality logic can be added to downloadMedia args if needed
    const downloadResult = await downloaderService.downloadMedia(url, 'video');
    await consumeLimitAndLog(req.profile, 'تحميل فيديو');
    
    const isInstagram = url.includes('instagram.com');
    const fileName = isInstagram ? 'wasl_instagram_iphone_ready.mp4' : `wasl_video_${Date.now()}.mp4`;
    
    // Strict Headers for iPhone/Safari
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.download(downloadResult.filePath, fileName, () => {
      // Delay cleanup to 30 minutes
      setTimeout(() => {
        if (downloadResult.jobDirectory && fs.existsSync(downloadResult.jobDirectory)) {
          fs.rmSync(downloadResult.jobDirectory, { recursive: true, force: true });
        }
      }, 30 * 60 * 1000);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/download-audio
router.post('/media/download-audio', async (req, res) => {
  try {
    const { url, format } = req.body; // mp3, m4a, wav
    const formatType = `audio_${format || 'mp3'}`;
    const downloadResult = await downloaderService.downloadMedia(url, formatType);
    await consumeLimitAndLog(req.profile, `تحميل صوت ${format}`);
    const fileName = `wasl_audio_${Date.now()}.${format || 'mp3'}`;
    res.download(downloadResult.filePath, fileName, () => {
      fs.rmSync(downloadResult.jobDirectory, { recursive: true, force: true });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/summarize
router.post('/media/summarize', async (req, res) => {
  try {
    const { url } = req.body;
    if (req.profile.plan_type !== 'vip') return res.status(403).json({ error: 'هذه الميزة لـ VIP فقط ⭐' });
    const result = await aiService.summarizeVideo(url, process.env.OPENAI_API_KEY);
    await consumeLimitAndLog(req.profile, 'تلخيص فيديو');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/thumbnail
router.post('/media/thumbnail', async (req, res) => {
  try {
    const { thumbnailUrl } = req.body;
    if (!thumbnailUrl) return res.status(400).json({ error: 'رابط الصورة غير موجود' });
    // Simply redirect to the thumbnail URL or fetch and serve
    res.redirect(thumbnailUrl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. تحسين صورة
router.post('/enhance-image', upload.single('image'), async (req, res) => {
  try {
    if (req.profile.plan_type !== 'vip') return res.status(403).json({ error: 'هذه الميزة لـ VIP فقط ⭐' });
    if (!req.file) return res.status(400).json({ error: 'الرجاء رفع صورة' });
    
    const inputBuffer = fs.readFileSync(req.file.path);
    const enhancedBuffer = await imageEnhanceService.enhanceImage(inputBuffer);
    await consumeLimitAndLog(req.profile, 'تحسين صورة');
    
    res.set('Content-Type', 'image/jpeg');
    res.send(enhancedBuffer);
    
    fs.unlinkSync(req.file.path);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. تحويل صورة
router.post('/convert-image', upload.single('image'), async (req, res) => {
  try {
    const { format } = req.body; // jpg, png, webp, pdf
    if (!req.file) return res.status(400).json({ error: 'الرجاء رفع صورة' });
    
    const inputBuffer = fs.readFileSync(req.file.path);
    const convertedBuffer = await imageConverterService.convertImage(inputBuffer, format);
    await consumeLimitAndLog(req.profile, `تحويل صورة إلى ${format}`);
    
    res.set('Content-Type', format === 'pdf' ? 'application/pdf' : `image/${format}`);
    res.send(convertedBuffer);
    
    fs.unlinkSync(req.file.path);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. دمج صور في PDF
router.post('/merge-pdf', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'الرجاء رفع صور' });
    
    const buffers = req.files.map(f => fs.readFileSync(f.path));
    const pdfBuffer = await imageConverterService.createMultiPagePdf(buffers);
    await consumeLimitAndLog(req.profile, 'إنشاء PDF متعدد');
    
    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
    
    req.files.forEach(f => fs.unlinkSync(f.path));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
