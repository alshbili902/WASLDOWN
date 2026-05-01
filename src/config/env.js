const dotenv = require('dotenv');

dotenv.config();

function parseRequiredString(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`متغير البيئة ${name} مطلوب`);
  }
  return value.trim();
}

function parseNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`متغير البيئة ${name} يجب أن يكون رقمًا صحيحًا`);
  }
  return value;
}

function parseAdminIds(raw) {
  if (!raw || !raw.trim()) return [];

  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => Number(id))
    .filter((id) => Number.isSafeInteger(id));
}

const env = {
  botToken: parseRequiredString('BOT_TOKEN'),
  adminIds: parseAdminIds(process.env.ADMIN_IDS),
  supabaseUrl: parseRequiredString('SUPABASE_URL'),
  supabaseAnonKey: parseRequiredString('SUPABASE_ANON_KEY'),
  databaseUrl: process.env.DATABASE_URL || null,
  port: parseNumber('PORT', 3000),
  dashboardPort: parseNumber('DASHBOARD_PORT', 3005),
  trialLimit: parseNumber('TRIAL_LIMIT', 5),
  subscriptionPrice: parseNumber('SUBSCRIPTION_PRICE', 10),
  ytdlpPath: process.env.YTDLP_PATH || '/var/www/wasl/bin/yt-dlp',
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  maxFileSizeMb: parseNumber('MAX_FILE_SIZE_MB', 50),
  downloadCooldownSeconds: parseNumber('DOWNLOAD_COOLDOWN_SECONDS', 20)
};

/**
 * طباعة لوق التشغيل المطلوب للسيرفر
 */
function logStartupInfo() {
  console.log('-------------------------------------------');
  console.log(`🚀 Using yt-dlp at: ${env.ytdlpPath}`);
  console.log(`📡 Database URL loaded: ${env.databaseUrl ? 'YES' : 'NO'}`);
  if (!env.databaseUrl) {
    console.warn('⚠️ Warning: DATABASE_URL is not set. If the app requires direct DB connection, it might fail.');
  }
  console.log(`☁️ Supabase URL loaded: ${env.supabaseUrl ? 'YES' : 'NO'}`);
  console.log(`🌐 Dashboard Port: ${env.dashboardPort}`);
  console.log(`🤖 Bot starting...`);
  console.log('-------------------------------------------');
}

module.exports = { ...env, logStartupInfo };
