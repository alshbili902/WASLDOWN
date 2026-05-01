const { Telegraf } = require('telegraf');
const env = require('./config/env');
const { registerUserCommands, handleVideoLink, handlePhoto } = require('./commands/userCommands');
const botAuthMiddleware = require('./middlewares/botAuthMiddleware');

const bot = new Telegraf(env.botToken);

bot.use(botAuthMiddleware);

bot.catch(async (error, ctx) => {
  console.error('خطأ عام في البوت:', error);
  try {
    await ctx.reply('حدث خطأ غير متوقع. حاول مرة أخرى لاحقًا.');
  } catch (_) {
    // لا يمكن الرد دائمًا إذا انقطع الاتصال أو انتهت صلاحية الطلب.
  }
});

async function main() {
  // طباعة معلومات التشغيل المطلوبة
  env.logStartupInfo();

  await registerUserCommands(bot);

  bot.on('text', handleVideoLink);
  bot.on('photo', handlePhoto);
  bot.on('document', handlePhoto);

  await bot.launch();
  console.log('تم تشغيل بوت وصل داونلودر بنجاح');
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

main().catch((error) => {
  console.error('فشل تشغيل البوت:', error);
  process.exit(1);
});
