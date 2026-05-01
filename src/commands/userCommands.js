const { Markup } = require('telegraf');
const userService = require('../services/userService');
const downloaderService = require('../services/downloaderService');
const messages = require('../utils/messages');
const { extractUrl, isSupportedUrl } = require('../utils/validators');
const { removeDirectory } = require('../utils/cleanup');
const { getRemainingCooldownSeconds, markDownloadAttempt } = require('../middlewares/cooldown');
const pointsService = require('../services/pointsService');
const couponService = require('../services/couponService');

const mainMenu = Markup.keyboard([
  ['🎬 تحميل جديد', '🧾 تحويل ملفات'],
  ['🧠 تلخيص فيديو', '🖼️ تحسين صورة'],
  ['🔗 اختصار رابط', '📊 تحليل المحتوى'],
  ['🎯 نقاطي', '👥 دعوة الأصدقاء'],
  ['🎟️ استخدام كوبون', '📊 حالتي'],
  ['🔄 تغيير الإيميل']
]).resize();

const userDownloadMap = new Map();
const userConversionMap = new Map();
const userMultiImagesMap = new Map();

async function registerUserCommands(bot) {
  bot.start(async (ctx) => {
    try {
      const user = ctx.userProfile;
      
      // معالجة رابط الإحالة
      if (ctx.payload && ctx.payload.startsWith('ref')) {
        const success = await pointsService.processReferral(ctx.from.id, ctx.payload);
        if (success) {
          await ctx.reply('مرحباً بك! تم تسجيلك بنجاح عبر رابط دعوة صديق 🎉');
        }
      }
      
      await ctx.reply(messages.welcome(user), mainMenu);
    } catch (error) {
      console.error('خطأ في أمر start:', error);
      await ctx.reply('تعذر تسجيل حسابك الآن. حاول مرة أخرى لاحقًا.');
    }
  });

  bot.help(async (ctx) => {
    await ctx.reply(messages.help());
  });

  bot.command('my_status', async (ctx) => {
    try {
      const user = ctx.userProfile;
      await ctx.reply(messages.accountStatus(user), mainMenu);
    } catch (error) {
      console.error('خطأ في أمر my_status:', error);
      await ctx.reply('تعذر عرض حالة الحساب الآن. حاول مرة أخرى لاحقًا.');
    }
  });

  bot.hears('📊 حالتي', async (ctx) => {
    try {
      const user = ctx.userProfile;
      await ctx.reply(messages.accountStatus(user));
    } catch (error) {
      await ctx.reply('تعذر عرض حالة الحساب الآن.');
    }
  });

  bot.hears('👥 دعوة الأصدقاء', async (ctx) => {
    try {
      const user = ctx.userProfile;
      if (!user.referral_code) {
        await ctx.reply('عذراً، كود الإحالة الخاص بك قيد التجهيز. حاول لاحقاً.');
        return;
      }
      const botInfo = await ctx.telegram.getMe();
      const refLink = `https://t.me/${botInfo.username}?start=${user.referral_code}`;
      const msg = `شارك هذا الرابط مع أصدقائك! 🎁\n\nعند اشتراك صديقك، ستحصل على نقاط إضافية يمكنك استبدالها بأيام مجانية.\n\nرابط الدعوة الخاص بك:\n${refLink}`;
      await ctx.reply(msg);
    } catch (error) {
      await ctx.reply('تعذر جلب رابط الدعوة الآن.');
    }
  });

  bot.hears('🎯 نقاطي', async (ctx) => {
    try {
      const user = ctx.userProfile;
      const points = user.points || 0;
      
      let msg = `نقاطك الحالية: ${points} 🎯\n\n`;
      msg += `تحصل على نقطة لكل تحميل، و5 نقاط لكل دعوة صديق.\n`;
      msg += `يمكنك استبدال 100 نقطة بـ 3 أيام اشتراك مجانية!`;

      const kb = Markup.inlineKeyboard([
        Markup.button.callback('🔄 استبدال النقاط (100 نقطة)', 'redeem_points')
      ]);

      await ctx.reply(msg, kb);
    } catch (error) {
      await ctx.reply('تعذر جلب النقاط الآن.');
    }
  });

  bot.action('redeem_points', async (ctx) => {
    try {
      const user = ctx.userProfile;
      await pointsService.redeemPoints(user.id);
      await ctx.answerCbQuery('تم استبدال النقاط بنجاح وتفعيل الاشتراك! 🎉', { show_alert: true });
      await ctx.editMessageText('تم استبدال 100 نقطة بـ 3 أيام اشتراك بنجاح ✅');
    } catch (error) {
      await ctx.answerCbQuery(error.message, { show_alert: true });
    }
  });

  bot.hears('🎟️ استخدام كوبون', async (ctx) => {
    await ctx.reply('لإستخدام كوبون الخصم، أرسل الأمر بهذا الشكل:\n\n/coupon CODE\n\n(استبدل CODE برمز الكوبون)');
  });

  bot.command('coupon', async (ctx) => {
    const text = ctx.message.text.trim();
    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply('الاستخدام الصحيح:\n/coupon YOUR_CODE');
      return;
    }
    const code = parts[1];
    
    try {
      const user = ctx.userProfile;
      const coupon = await couponService.redeemCoupon(user.id, code);
      // مثال: إضافة 3 أيام اشتراك كمكافأة افتراضية لاستخدام الكوبون (يمكنك تعديلها لاحقاً حسب نظام الكوبونات)
      await userService.activateSubscription(user.id, 3);
      await ctx.reply(`تم تفعيل الكوبون بنجاح! 🎉\nحصلت على 3 أيام اشتراك مجانية.\n\nاستمتع بجميع المميزات.`);
    } catch (error) {
      await ctx.reply(error.message || 'الكوبون غير صحيح أو منتهي الصلاحية.');
    }
  });

  bot.hears('🧠 تلخيص فيديو', async (ctx) => {
    try {
      const user = ctx.userProfile;
      if (!userService.isSubscriptionActive(user)) return ctx.reply('هذه الميزة الذكية للمشتركين فقط ⭐');
      userConversionMap.set(ctx.from.id, 'summarize_video');
      await ctx.reply('أرسل رابط فيديو يوتيوب الآن لكي أقوم بتلخيصه لك 🧠');
    } catch (e) {}
  });

  bot.hears('🖼️ تحسين صورة', async (ctx) => {
    try {
      const user = ctx.userProfile;
      if (!userService.isSubscriptionActive(user)) return ctx.reply('هذه الميزة الذكية للمشتركين فقط ⭐');
      userConversionMap.set(ctx.from.id, 'enhance_image');
      await ctx.reply('أرسل الصورة الآن لكي أقوم بتحسين جودتها وألوانها 🖼️✨');
    } catch (e) {}
  });

  bot.hears('🔗 اختصار رابط', async (ctx) => {
    userConversionMap.set(ctx.from.id, 'shorten_link');
    await ctx.reply('أرسل الرابط الطويل الآن 🔗');
  });

  bot.hears('📊 تحليل المحتوى', async (ctx) => {
    try {
      const user = ctx.userProfile;
      if (!userService.isSubscriptionActive(user)) return ctx.reply('هذه الميزة الذكية للمشتركين فقط ⭐');
      userConversionMap.set(ctx.from.id, 'analyze_content');
      await ctx.reply('أرسل النص أو الرابط لكي أحلله وأعطيك عنوان، وصف، وأفضل الأوقات للنشر 📊');
    } catch (e) {}
  });

  bot.hears('🧾 تحويل ملفات', async (ctx) => {
    try {
      const user = ctx.userProfile;
      // يمكنك هنا إضافة تحقق للـ VIP إذا أردت جعل الميزة للمشتركين فقط
      // if (!userService.isSubscriptionActive(user)) return ctx.reply('هذه الميزة للمشتركين فقط ⭐');
      
      await ctx.reply('اختر صيغة التحويل المطلوبة للصورة 👇', Markup.inlineKeyboard([
        [
          Markup.button.callback('🖼️ إلى JPG', 'convert_image_jpg'),
          Markup.button.callback('🖼️ إلى PNG', 'convert_image_png'),
          Markup.button.callback('🖼️ إلى WEBP', 'convert_image_webp')
        ],
        [
          Markup.button.callback('📄 صورة إلى PDF', 'convert_image_pdf'),
          Markup.button.callback('📚 عدة صور إلى PDF', 'convert_image_pdf_multi')
        ]
      ]));
    } catch (error) {
      await ctx.reply('تعذر معالجة الطلب.');
    }
  });

  bot.action(/^convert_image_(.+)$/, async (ctx) => {
    const targetFormat = ctx.match[1];
    userConversionMap.set(ctx.from.id, targetFormat);
    if (targetFormat === 'pdf_multi') {
      userMultiImagesMap.set(ctx.from.id, []);
      await ctx.editMessageText('أنت اخترت إنشاء PDF من عدة صور 📚.\n\nارسل الصور الآن (يمكنك إرسال أكثر من صورة)، ثم اضغط تم الانتهاء.');
    } else {
      await ctx.editMessageText(`أنت اخترت التحويل إلى ${targetFormat.toUpperCase()}.\n\nالرجاء إرسال الصورة الآن 📸`);
    }
  });

  bot.action('cancel_pdf_multi', async (ctx) => {
    userConversionMap.delete(ctx.from.id);
    userMultiImagesMap.delete(ctx.from.id);
    await ctx.editMessageText('تم إلغاء العملية ❌');
  });

  bot.action('finish_pdf_multi', async (ctx) => {
    const userId = ctx.from.id;
    const images = userMultiImagesMap.get(userId) || [];
    
    if (images.length === 0) {
      await ctx.answerCbQuery('لم يتم إرسال أي صور ❌', { show_alert: true });
      return;
    }

    await ctx.editMessageText('جاري إنشاء PDF... ⏳');
    
    try {
      const buffers = [];
      for (const fileId of images) {
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(fileLink.href);
        const arrayBuffer = await response.arrayBuffer();
        buffers.push(Buffer.from(arrayBuffer));
      }

      const imageConverterService = require('../services/imageConverterService');
      const pdfBuffer = await imageConverterService.createMultiPagePdf(buffers);

      await ctx.replyWithDocument({ source: pdfBuffer, filename: `document_${Date.now()}.pdf` }, { caption: 'تم إنشاء الملف بنجاح 📄' });
    } catch (err) {
      console.error(err);
      await ctx.reply('حدث خطأ أثناء الإنشاء ❌');
    } finally {
      userConversionMap.delete(userId);
      userMultiImagesMap.delete(userId);
    }
  });

  bot.action(/^download_(.+)$/, async (ctx) => {
    const formatType = ctx.match[1]; // 'video', 'audio_mp3', 'audio_m4a', 'audio_wav'
    const userId = ctx.from.id;
    const url = userDownloadMap.get(userId);

    if (!url) {
      await ctx.answerCbQuery('الرجاء إرسال الرابط أولاً.', { show_alert: true });
      return;
    }

    let user;
    try {
      user = await userService.registerOrUpdateTelegramUser(ctx.from);
      
      // VIP ميزات
      if (formatType.startsWith('audio_') && !userService.isSubscriptionActive(user)) {
        await ctx.answerCbQuery('هذه الميزة للمشتركين فقط ⭐', { show_alert: true });
        return;
      }
    } catch (e) {
      console.error('خطأ في التحقق من المستخدم:', e);
      await ctx.answerCbQuery('حدث خطأ. حاول مجدداً.', { show_alert: true });
      return;
    }

    const remainingSeconds = getRemainingCooldownSeconds(userId);
    if (remainingSeconds > 0) {
      await ctx.answerCbQuery(messages.cooldown(remainingSeconds), { show_alert: true });
      return;
    }

    let downloadResult = null;

    try {
      const user = ctx.userProfile;
      if (!userService.canDownload(user)) {
        await ctx.editMessageText(messages.subscriptionRequired(user));
        return;
      }

      markDownloadAttempt(userId);
      await ctx.editMessageText(messages.waiting());

      downloadResult = await downloaderService.downloadMedia(url, formatType);

      let caption = 'تم تجهيز الملف بنجاح.';
      if (url.includes('snapchat.com')) {
        caption += '\n\nتنبيه: سناب يضيف علامة مائية تلقائياً';
      }

      if (formatType === 'video') {
        await ctx.replyWithVideo({ source: downloadResult.filePath }, { caption });
      } else {
        await ctx.replyWithAudio({ source: downloadResult.filePath }, { caption });
      }

      await userService.incrementSuccessfulDownload(user.id, 'telegram');
      await pointsService.addPoints(user.id, 1); // +1 نقطة لكل تحميل
      userDownloadMap.delete(userId);
    } catch (error) {
      console.error('خطأ في التحميل:', error);
      await ctx.editMessageText(messages.downloadFailed(error.message));
    } finally {
      if (downloadResult?.jobDirectory) {
        await removeDirectory(downloadResult.jobDirectory);
      }
    }
  });
}

async function handleVideoLink(ctx) {
  const text = ctx.message?.text || '';
  const userId = ctx.from.id;
  const state = userConversionMap.get(userId);

  if (state === 'shorten_link') {
    const linkShortenerService = require('../services/linkShortenerService');
    await ctx.reply('جاري اختصار الرابط... ⏳');
    try {
      const shortUrl = await linkShortenerService.shortenUrl(text);
      await ctx.reply(`تم الاختصار بنجاح! 🎉\n\nالرابط: ${shortUrl}`);
    } catch(err) {
      await ctx.reply(err.message);
    }
    userConversionMap.delete(userId);
    return;
  }

  if (state === 'analyze_content') {
    const aiService = require('../services/aiService');
    await ctx.reply('جاري تحليل المحتوى باستخدام الذكاء الاصطناعي... ⏳🧠');
    const result = await aiService.analyzeContent(text, process.env.OPENAI_API_KEY);
    await ctx.reply(result);
    userConversionMap.delete(userId);
    return;
  }

  if (state === 'summarize_video') {
    const aiService = require('../services/aiService');
    await ctx.reply('جاري مشاهدة وتحليل الفيديو... ⏳🎬');
    const result = await aiService.summarizeVideo(text, process.env.OPENAI_API_KEY);
    await ctx.reply(result);
    userConversionMap.delete(userId);
    return;
  }

  const url = extractUrl(text);

  if (!url || !isSupportedUrl(url)) {
    await ctx.reply(messages.invalidUrl());
    return;
  }

  const remainingSeconds = getRemainingCooldownSeconds(ctx.from.id);
  if (remainingSeconds > 0) {
    await ctx.reply(messages.cooldown(remainingSeconds));
    return;
  }

  try {
    const user = ctx.userProfile;

    if (!userService.canDownload(user)) {
      await ctx.reply(messages.subscriptionRequired(user));
      return;
    }

    userDownloadMap.set(ctx.from.id, url);

    await ctx.reply('اختر نوع التحميل 👇', Markup.inlineKeyboard([
      [Markup.button.callback('🎬 تحميل فيديو', 'download_video')],
      [
        Markup.button.callback('🎧 MP3', 'download_audio_mp3'),
        Markup.button.callback('🎧 M4A', 'download_audio_m4a'),
        Markup.button.callback('🎧 WAV', 'download_audio_wav')
      ]
    ]));

  } catch (error) {
    console.error('خطأ في التحقق من المستخدم:', error);
    await ctx.reply('حدث خطأ أثناء معالجة طلبك.');
  }
}

async function handlePhoto(ctx) {
  const userId = ctx.from.id;
  const targetFormat = userConversionMap.get(userId);

  if (!targetFormat) {
    // لم يطلب تحويل صورة
    return;
  }

  // الحصول على الملف
  let fileId;
  if (ctx.message.photo) {
    fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id; // أعلى جودة
  } else if (ctx.message.document) {
    fileId = ctx.message.document.file_id;
  } else {
    return;
  }

  if (targetFormat === 'pdf_multi') {
    const images = userMultiImagesMap.get(userId) || [];
    
    if (images.length >= 10) {
      await ctx.reply('الحد الأقصى 10 صور فقط ❌');
      return;
    }

    images.push(fileId);
    userMultiImagesMap.set(userId, images);
    
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('✅ تم الانتهاء', 'finish_pdf_multi')],
      [Markup.button.callback('❌ إلغاء العملية', 'cancel_pdf_multi')]
    ]);
    
    await ctx.reply(`تم حفظ الصورة (${images.length}/10) ✔️\nأرسل المزيد من الصور أو اضغط "تم الانتهاء"`, kb);
    return;
  }

  try {
    const file = await ctx.telegram.getFile(fileId);
    
    // التحقق من الحجم (الحد الأقصى 10MB)
    if (file.file_size > 10 * 1024 * 1024) {
      await ctx.reply('الملف كبير جداً ❌ الحد الأقصى هو 10 ميغابايت.');
      userConversionMap.delete(userId);
      return;
    }

    await ctx.reply('جاري تحويل الصورة... ⏳');

    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    if (targetFormat === 'enhance_image') {
      await ctx.reply('جاري تحسين الصورة بلمسة سحرية... ⏳✨');
      const imageEnhanceService = require('../services/imageEnhanceService');
      const enhancedBuffer = await imageEnhanceService.enhanceImage(inputBuffer);
      await ctx.replyWithPhoto({ source: enhancedBuffer }, { caption: 'تم تحسين الصورة بنجاح! 🪄' });
      userConversionMap.delete(userId);
      return;
    }

    const imageConverterService = require('../services/imageConverterService');
    const convertedBuffer = await imageConverterService.convertImage(inputBuffer, targetFormat);

    if (targetFormat === 'pdf') {
      await ctx.replyWithDocument({ source: convertedBuffer, filename: `converted_${Date.now()}.pdf` }, { caption: 'تم التحويل بنجاح ✅' });
    } else {
      await ctx.replyWithDocument({ source: convertedBuffer, filename: `converted_${Date.now()}.${targetFormat}` }, { caption: 'تم التحويل بنجاح ✅' });
    }

    userConversionMap.delete(userId);
  } catch (error) {
    console.error('خطأ في تحويل الصورة:', error);
    await ctx.reply('حدث خطأ أثناء التحويل ❌. تأكد من أن الملف هو صورة صالحة.');
    userConversionMap.delete(userId);
  }
}

module.exports = {
  registerUserCommands,
  handleVideoLink,
  handlePhoto
};
