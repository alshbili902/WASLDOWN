const { spawn } = require('child_process');

console.log('🚀 بدء تشغيل البوت وخادم الويب معاً...');

// تشغيل البوت
const botProcess = spawn('node', ['src/bot.js'], { stdio: 'inherit' });

// تشغيل خادم الويب
const webProcess = spawn('node', ['src/web/server.js'], { stdio: 'inherit' });

// معالجة إيقاف التشغيل
process.on('SIGINT', () => {
  console.log('\n🛑 جاري إيقاف التشغيل...');
  botProcess.kill('SIGINT');
  webProcess.kill('SIGINT');
  process.exit();
});
