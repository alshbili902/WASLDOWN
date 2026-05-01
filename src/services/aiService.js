async function analyzeContent(text, apiKey) {
  if (!apiKey) return "الميزة تتطلب تفعيل (OPENAI_API_KEY) في ملف .env";
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: "أنت خبير تسويق بالمحتوى. قم بتحليل النص أو الرابط المقدم، وأعطني: عنوان مقترح، وصف جذاب، 5 هاشتاقات قوية، وأفضل وقت للنشر بتوقيت السعودية."
        }, {
          role: "user",
          content: text
        }]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.";
  }
}

async function summarizeVideo(url, apiKey) {
  if (!apiKey) return "الميزة تتطلب تفعيل (OPENAI_API_KEY) في ملف .env";
  
  // Note: Extracting captions requires specialized APIs.
  // We simulate a basic prompt response here.
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `قم بإعطائي ملخص عام وتوقعات للمحتوى الموجود في هذا الرابط، أو إذا كان لديك وصول للإنترنت لخصه لي: ${url}`
        }]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return "حدث خطأ أثناء تلخيص الفيديو.";
  }
}

module.exports = { analyzeContent, summarizeVideo };
