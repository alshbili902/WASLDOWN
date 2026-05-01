const sharp = require('sharp');

async function enhanceImage(inputBuffer) {
  try {
    // استخدام تقنيات معالجة محلية لتحسين تفاصيل الصورة والألوان
    return await sharp(inputBuffer)
      .normalize() // تحسين التباين
      .modulate({
        brightness: 1.05,
        saturation: 1.2
      }) // تحسين الإضاءة والتشبع
      .sharpen({ sigma: 1.5 }) // زيادة الحدة والتفاصيل
      .jpeg({ quality: 100 }) // إخراج بأعلى جودة
      .toBuffer();
  } catch (error) {
    throw new Error('فشل تحسين الصورة.');
  }
}

module.exports = { enhanceImage };
