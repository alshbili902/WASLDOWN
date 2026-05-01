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
  trialLimit: parseNumber('TRIAL_LIMIT', 5),
  subscriptionPrice: parseNumber('SUBSCRIPTION_PRICE', 10),
  ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  maxFileSizeMb: parseNumber('MAX_FILE_SIZE_MB', 50),
  downloadCooldownSeconds: parseNumber('DOWNLOAD_COOLDOWN_SECONDS', 20)
};

module.exports = env;
