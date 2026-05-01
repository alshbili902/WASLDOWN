const supabase = require('./supabase');

// إضافة نقاط للمستخدم
async function addPoints(profileId, amount) {
  const { data: user, error: fetchErr } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', profileId)
    .single();

  if (fetchErr || !user) return 0;

  const newPoints = (user.points || 0) + amount;
  
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ points: newPoints })
    .eq('id', profileId);

  if (updateErr) throw updateErr;
  return newPoints;
}

// معالجة دعوة مستخدم جديد
async function processReferral(newUserId, referrerCode) {
  if (!referrerCode) return false;

  const { data: referrer, error } = await supabase
    .from('profiles')
    .select('telegram_id, referral_count')
    .eq('referral_code', referrerCode)
    .single();

  // تأكد أن الكود صحيح وأنه لا يدعو نفسه
  if (error || !referrer || String(referrer.telegram_id) === String(newUserId)) return false;

  // ربط المستخدم الجديد بصاحب الدعوة
  await supabase
    .from('profiles')
    .update({ referred_by: referrer.telegram_id })
    .eq('telegram_id', newUserId);
  
  // مكافأة تسجيل الدخول (5 نقاط)
  await addPoints(referrer.telegram_id, 5);
  
  // زيادة عداد الإحالات
  await supabase
    .from('profiles')
    .update({ referral_count: (referrer.referral_count || 0) + 1 })
    .eq('telegram_id', referrer.telegram_id);

  return true;
}

// استبدال النقاط
async function redeemPoints(profileId) {
  const { data: user } = await supabase
    .from('profiles')
    .select('points, is_subscribed, subscription_end')
    .eq('id', profileId)
    .single();

  if (!user || (user.points || 0) < 100) {
    throw new Error('نقاطك غير كافية. تحتاج 100 نقطة على الأقل.');
  }

  // خصم 100 نقطة وإضافة 3 أيام اشتراك
  const newPoints = user.points - 100;
  
  let newEndDate = new Date();
  if (user.is_subscribed && user.subscription_end && new Date(user.subscription_end) > new Date()) {
    newEndDate = new Date(user.subscription_end);
  }
  newEndDate.setDate(newEndDate.getDate() + 3);

  const { error } = await supabase
    .from('profiles')
    .update({
      points: newPoints,
      is_subscribed: true,
      subscription_end: newEndDate.toISOString()
    })
    .eq('id', profileId);

  if (error) throw error;
  return newPoints;
}

module.exports = {
  addPoints,
  processReferral,
  redeemPoints
};
