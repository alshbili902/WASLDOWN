const supabase = require('./supabase');

async function createCoupon(code, discountPercentage, usageLimit = 1) {
  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: code.toUpperCase(),
      discount_percentage: discountPercentage,
      usage_limit: usageLimit
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function redeemCoupon(telegramId, code) {
  const uppercaseCode = code.toUpperCase();
  
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', uppercaseCode)
    .single();

  if (error || !coupon) throw new Error('الكوبون غير صحيح.');
  
  if (coupon.used_count >= coupon.usage_limit) {
    throw new Error('عذراً، تم استنفاد الحد الأقصى لاستخدام هذا الكوبون.');
  }
  
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    throw new Error('هذا الكوبون منتهي الصلاحية.');
  }

  // زيادة عدد استخدامات الكوبون
  await supabase
    .from('coupons')
    .update({ used_count: coupon.used_count + 1 })
    .eq('id', coupon.id);
  
  // ملاحظة: يمكنك هنا إضافة المنطق لخصم السعر أو تفعيل أيام مجانية بناء على الكوبون
  return coupon;
}

module.exports = {
  createCoupon,
  redeemCoupon
};
