async function shortenUrl(longUrl) {
  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    if (!response.ok) throw new Error('فشل الاتصال بخدمة اختصار الروابط');
    return await response.text();
  } catch (err) {
    throw new Error('حدث خطأ أثناء اختصار الرابط.');
  }
}

module.exports = { shortenUrl };
