const supabase = require('../services/supabase');
const { sendOtpEmail } = require('../services/emailService');

const botStates = new Map();

async function botAuthMiddleware(ctx, next) {
  if (!ctx.from || (ctx.chat && ctx.chat.type !== 'private')) return next();

  const tgId = ctx.from.id;
  const text = (ctx.message && ctx.message.text) ? ctx.message.text.trim() : null;

  // إتاحة ميزة تغيير الإيميل للمستخدمين المرتبطين حالياً
  if (text === '/change_email' || text === '🔄 تغيير الإيميل') {
    await supabase.from('profiles').update({ telegram_id: null }).eq('telegram_id', tgId);
    botStates.delete(tgId);
    return ctx.reply('🔄 تم فك ارتباط حسابك الحالي بنجاح.\nالرجاء إرسال البريد الإلكتروني الجديد المرتبط بالموقع لربطه بالبوت:');
  }

  // 1. Check if user is linked and verified
  const { data: profile } = await supabase.from('profiles').select('*').eq('telegram_id', tgId).maybeSingle();
  if (profile) {
    if (!profile.email_verified) {
      return ctx.reply('⚠️ حسابك مرتبط ولكن الإيميل غير مفعل بعد.\nيرجى فتح بريدك الإلكتروني والضغط على رابط التفعيل المرسل من "وصل داونلودر" لتتمكن من استخدام البوت.');
    }
    ctx.userProfile = profile;
    return next();
  }

  // 2. User is not linked, handle state machine
  const state = botStates.get(tgId) || { step: 'AWAITING_EMAIL' };

  if (ctx.message && ctx.message.text) {
    const text = ctx.message.text.trim();

    if (text === '/start') {
      botStates.set(tgId, { step: 'AWAITING_EMAIL' });
      return ctx.reply('أهلاً بك في وصل داونلودر 👋\nالموقع هو النظام الأساسي الآن. لكي تتمكن من استخدام البوت، يجب أن تمتلك حساباً في الموقع أولاً.\n\nالرجاء إرسال بريدك الإلكتروني المرتبط بحسابك:');
    }

    if (state.step === 'AWAITING_EMAIL') {
      if (text.includes('@') && text.includes('.')) {
        const { data: existingProfile } = await supabase.from('profiles').select('*').eq('email', text).maybeSingle();
        if (!existingProfile) {
          return ctx.reply('❌ لا يوجد حساب بهذا البريد في الموقع.\nقم بالتسجيل عبر الموقع أولاً ثم عد إلى هنا.\nالرابط: http://13.60.82.20/register');
        }

        if (!existingProfile.email_verified) {
          return ctx.reply('⚠️ عذراً، يجب تفعيل حسابك عبر البريد الإلكتروني أولاً قبل ربطه بالبوت.\nتحقق من بريدك واضغط على رابط التفعيل.');
        }

        if (existingProfile.telegram_id) {
          return ctx.reply('❌ هذا البريد مرتبط بحساب تليجرام آخر بالفعل!');
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        try {
          await sendOtpEmail(text, otp);
          botStates.set(tgId, { step: 'AWAITING_OTP', email: text, otp, profileId: existingProfile.id, expires: Date.now() + 5 * 60 * 1000 });
          return ctx.reply('✅ تم إرسال كود تحقق مكون من 6 أرقام إلى بريدك.\n(تحقق من الرسائل المزعجة Spam إن لم تجده)\nالرجاء إرسال الكود هنا (صالح لمدة 5 دقائق):');
        } catch (err) {
          console.error(err);
          return ctx.reply('❌ حدث خطأ أثناء إرسال الإيميل. يرجى المحاولة لاحقاً.');
        }
      } else {
        return ctx.reply('يرجى إرسال بريد إلكتروني صحيح للربط.');
      }
    } else if (state.step === 'AWAITING_OTP') {
      if (Date.now() > state.expires) {
        botStates.delete(tgId);
        return ctx.reply('❌ انتهت صلاحية الكود. الرجاء إرسال بريدك الإلكتروني من جديد.');
      }

      if (text === state.otp) {
        // Link successful
        await supabase.from('profiles').update({ telegram_id: tgId, telegram_username: ctx.from.username || null }).eq('id', state.profileId);
        botStates.delete(tgId);
        return ctx.reply('✅ تم ربط حسابك بنجاح! يمكنك الآن استخدام البوت بكامل الصلاحيات المرتبطة بباقة موقعك.\n\nاضغط /start لفتح القائمة.');
      } else {
        return ctx.reply('❌ الكود غير صحيح، يرجى التأكد وإعادة المحاولة.');
      }
    }
  } else if (ctx.callbackQuery) {
    await ctx.answerCbQuery('يجب ربط حسابك أولاً!', { show_alert: true });
    return;
  }

  botStates.set(tgId, { step: 'AWAITING_EMAIL' });
  return ctx.reply('أهلاً بك في وصل داونلودر 👋\nالرجاء إرسال بريدك الإلكتروني المرتبط بحسابك في الموقع لربط البوت:');
}

module.exports = botAuthMiddleware;
