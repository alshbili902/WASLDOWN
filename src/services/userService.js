const supabase = require('./supabase');
const env = require('../config/env');

function isSubscriptionActive(user) {
  if (!user?.is_subscribed || !user.subscription_end) return false;
  return new Date(user.subscription_end).getTime() > Date.now();
}

async function ensureActiveSubscriptionState(user) {
  if (!user?.is_subscribed) return user;

  if (isSubscriptionActive(user)) return user;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_subscribed: false,
      subscription_end: null
    })
    .eq('id', user.id) // Use primary key 'id' instead of telegram_id
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findByTelegramId(telegramId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return ensureActiveSubscriptionState(data);
}

async function updateTelegramUserInfo(telegramId, telegramUser) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      telegram_username: telegramUser.username || null,
      full_name: telegramUser.first_name || null // sync name if needed
    })
    .eq('telegram_id', telegramId)
    .select()
    .single();

  if (error) return null;
  return ensureActiveSubscriptionState(data);
}

function canDownload(user) {
  if (isSubscriptionActive(user)) return true;
  return (user.trial_used || 0) < (user.trial_limit || env.trialLimit);
}

async function incrementSuccessfulDownload(profileId, source = 'telegram') {
  const { data: user, error: fetchError } = await supabase.from('profiles').select('*').eq('id', profileId).single();
  if (fetchError || !user) throw new Error('المستخدم غير موجود');

  const payload = {
    total_downloads: (user.total_downloads || 0) + 1
  };

  if (!isSubscriptionActive(user)) {
    payload.trial_used = (user.trial_used || 0) + 1;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', profileId)
    .select()
    .single();

  if (error) throw error;
  
  // Log usage
  await supabase.from('usage_logs').insert({
    profile_id: profileId,
    action_type: 'download',
    source: source,
    details: { timestamp: new Date().toISOString() }
  });

  return data;
}

async function activateSubscription(profileId, days) {
  const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_subscribed: true,
      subscription_end: end
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deactivateSubscription(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_subscribed: false,
      subscription_end: null
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function resetTrial(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      trial_used: 0,
      trial_limit: env.trialLimit
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getStats() {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_subscribed, subscription_end, total_downloads');

  if (error) throw error;

  const now = Date.now();
  const totalUsers = data.length;
  const subscribed = data.filter((user) => {
    return user.is_subscribed && user.subscription_end && new Date(user.subscription_end).getTime() > now;
  }).length;
  const totalDownloads = data.reduce((sum, user) => sum + (user.total_downloads || 0), 0);

  return {
    totalUsers,
    subscribed,
    notSubscribed: totalUsers - subscribed,
    totalDownloads
  };
}

async function getRecentUsers(limit = 10) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

async function getAllTelegramIds() {
  const { data, error } = await supabase
    .from('profiles')
    .select('telegram_id')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map((user) => user.telegram_id);
}

module.exports = {
  updateTelegramUserInfo,
  findByTelegramId,
  canDownload,
  incrementSuccessfulDownload,
  activateSubscription,
  deactivateSubscription,
  resetTrial,
  getStats,
  getRecentUsers,
  getAllTelegramIds,
  isSubscriptionActive
};
