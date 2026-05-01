const express = require('express');
const router = express.Router();
const supabase = require('../../services/supabase');

const TOOLS = [
  {
    id: 'video-downloader',
    name: 'تحميل فيديو من رابط',
    desc: 'تحميل المقاطع من يوتيوب، تيك توك، انستقرام وأكثر من 1000 موقع.',
    icon: 'video',
    vip: false,
    category: 'تحميل'
  },
  {
    id: 'audio-downloader',
    name: 'استخراج الصوت من رابط',
    desc: 'حول أي فيديو إلى ملف صوتي عالي الجودة بصيغة MP3 أو WAV.',
    icon: 'music',
    vip: false,
    category: 'تحميل'
  },
  {
    id: 'video-summary',
    name: 'تلخيص فيديو AI',
    desc: 'احصل على ملخص شامل لأي فيديو يوتيوب باستخدام الذكاء الاصطناعي.',
    icon: 'brain',
    vip: true,
    category: 'ذكاء اصطناعي'
  },
  {
    id: 'content-analysis',
    name: 'تحليل محتوى AI',
    desc: 'حلل النصوص والروابط واقترح عناوين وهاشتاقات ذكية لمحتواك.',
    icon: 'bar-chart',
    vip: true,
    category: 'ذكاء اصطناعي'
  },
  {
    id: 'image-enhancer',
    name: 'تحسين جودة الصور AI',
    desc: 'ارفع جودة صورك وحسن ألوانها بضغطة زر واحدة باستخدام الذكاء الاصطناعي.',
    icon: 'sparkles',
    vip: true,
    category: 'ذكاء اصطناعي'
  },
  {
    id: 'image-converter',
    name: 'تحويل صيغ الصور',
    desc: 'حول صورك بين صيغ JPG, PNG, WEBP و PDF بسهولة.',
    icon: 'file-image',
    vip: false,
    category: 'صور'
  },
  {
    id: 'images-to-pdf',
    name: 'دمج الصور في PDF',
    desc: 'اختر عدة صور وادمجها في ملف PDF واحد ومنظم.',
    icon: 'layers',
    vip: false,
    category: 'صور'
  },
  {
    id: 'link-shortener',
    name: 'اختصار الروابط',
    desc: 'اختصر الروابط الطويلة إلى روابط قصيرة وسهلة المشاركة.',
    icon: 'link',
    vip: false,
    category: 'أدوات'
  },
  {
    id: 'thumbnail-extractor',
    name: 'استخراج صورة الغلاف',
    desc: 'استخرج صورة الغلاف (Thumbnail) لأي مقطع فيديو بجودة عالية.',
    icon: 'image',
    vip: false,
    category: 'أدوات'
  },
  {
    id: 'video-compressor',
    name: 'ضغط الفيديو',
    desc: 'قلل حجم الفيديو مع الحفاظ على جودة ممتازة للمشاركة السريعة.',
    icon: 'minimize-2',
    vip: true,
    category: 'فيديو'
  },
  {
    id: 'video-to-gif',
    name: 'تحويل فيديو إلى GIF',
    desc: 'حول مقاطع الفيديو القصيرة إلى صور متحركة GIF.',
    icon: 'camera',
    vip: true,
    category: 'فيديو'
  },
  {
    id: 'trim-media',
    name: 'قص فيديو أو صوت',
    desc: 'حدد بداية ونهاية المقطع وقم بقصه بسهولة.',
    icon: 'scissors',
    vip: true,
    category: 'فيديو'
  }
];

async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    const redirect = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?redirect=${redirect}&error=الرجاء تسجيل الدخول للوصول للأدوات`);
  }
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', req.session.userId).single();
  if (!profile) return res.redirect('/login');
  
  req.profile = profile;
  next();
}

// الصفحة الرئيسية للأدوات
router.get('/tools', requireAuth, async (req, res) => {
  res.render('tools', { 
    page: 'tools', 
    profile: req.profile,
    tools: TOOLS
  });
});

// صفحات الأدوات المنفردة
router.get('/tools/:toolId', requireAuth, async (req, res) => {
  const tool = TOOLS.find(t => t.id === req.params.toolId);
  
  if (!tool) {
    return res.status(404).render('404', { pageTitle: 'الأداة غير موجودة' });
  }

  // تحقق من الـ VIP
  const isSubActive = req.profile.is_subscribed && new Date(req.profile.subscription_end).getTime() > Date.now();
  if (tool.vip && !isSubActive) {
    return res.render('tool-vip-locked', { 
        page: 'tools', 
        profile: req.profile, 
        tool 
    });
  }

  res.render('tool-page', { 
    page: 'tools', 
    profile: req.profile, 
    tool 
  });
});

module.exports = router;
