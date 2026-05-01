const supabase = require('./supabase');
const userService = require('./userService');

async function linkTelegramAccount(telegramUser, code) {
  // 1. Verify code
  const { data: linkRecord, error: codeErr } = await supabase
    .from('linking_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('used', false)
    .single();

  if (codeErr || !linkRecord) {
    throw new Error('الكود غير صحيح أو تم استخدامه مسبقاً.');
  }

  if (new Date(linkRecord.expires_at).getTime() < Date.now()) {
    throw new Error('انتهت صلاحية الكود.');
  }

  const webProfileId = linkRecord.profile_id;

  // 2. Get web profile
  const { data: webProfile, error: webErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', webProfileId)
    .single();

  if (webErr || !webProfile) throw new Error('تعذر العثور على حساب الموقع.');
  if (webProfile.telegram_id) throw new Error('حساب الموقع هذا مربوط بحساب تليجرام بالفعل.');

  // 3. Get existing telegram profile
  const { data: tgProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .maybeSingle();

  if (tgProfile && tgProfile.email) {
    throw new Error('حساب تليجرام هذا مربوط بحساب موقع آخر بالفعل.');
  }

  if (tgProfile) {
    // دمج الحسابين
    const mergedDownloads = (webProfile.total_downloads || 0) + (tgProfile.total_downloads || 0);
    const mergedPoints = (webProfile.points || 0) + (tgProfile.points || 0);
    const trialUsed = Math.max(webProfile.trial_used || 0, tgProfile.trial_used || 0);
    
    // الأولوية لاشتراك البوت إذا كان فعالاً
    let isSub = webProfile.is_subscribed;
    let subEnd = webProfile.subscription_end;
    let plan = webProfile.plan_type;

    if (tgProfile.is_subscribed && new Date(tgProfile.subscription_end).getTime() > Date.now()) {
      isSub = true;
      subEnd = tgProfile.subscription_end;
      plan = tgProfile.plan_type;
    }

    const { error: err1 } = await supabase.from('profiles').update({
      telegram_id: telegramUser.id,
      telegram_username: telegramUser.username || null,
      total_downloads: mergedDownloads,
      points: mergedPoints,
      trial_used: trialUsed,
      is_subscribed: isSub,
      subscription_end: subEnd,
      plan_type: plan
    }).eq('id', webProfile.id);
    if (err1) throw new Error('فشل التحديث: ' + err1.message);

    // حذف حساب تليجرام القديم بعد الدمج
    const { error: err2 } = await supabase.from('profiles').delete().eq('id', tgProfile.id);
    if (err2) throw new Error('فشل حذف القديم: ' + err2.message);
  } else {
    // تحديث حساب الموقع برقم تليجرام فقط
    const { error: err3 } = await supabase.from('profiles').update({
      telegram_id: telegramUser.id,
      telegram_username: telegramUser.username || null
    }).eq('id', webProfile.id);
    if (err3) throw new Error('فشل التحديث 2: ' + err3.message);
  }

  // تحديث حالة الكود
  const { error: err4 } = await supabase.from('linking_codes').update({ used: true }).eq('id', linkRecord.id);
  if (err4) throw new Error('فشل تحديث الكود: ' + err4.message);

  return true;
}

module.exports = { linkTelegramAccount };
