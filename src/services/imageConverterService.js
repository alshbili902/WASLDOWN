const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

async function convertImage(inputBuffer, targetFormat) {
  const format = targetFormat.toLowerCase();

  if (['jpg', 'jpeg', 'png', 'webp'].includes(format)) {
    let s = sharp(inputBuffer);
    
    if (format === 'jpg' || format === 'jpeg') {
      s = s.jpeg({ quality: 90 });
    } else if (format === 'png') {
      s = s.png({ quality: 90 });
    } else if (format === 'webp') {
      s = s.webp({ quality: 90 });
    }
    
    return await s.toBuffer();
  } 
  
  if (format === 'pdf') {
    const pdfDoc = await PDFDocument.create();
    
    // Convert to PNG first to ensure pdf-lib can handle it easily
    const pngBuffer = await sharp(inputBuffer).png().toBuffer();
    const image = await pdfDoc.embedPng(pngBuffer);
    
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  throw new Error('صيغة التحويل غير مدعومة ❌');
}

async function createMultiPagePdf(imageBuffers) {
  const pdfDoc = await PDFDocument.create();
  
  for (const buffer of imageBuffers) {
    const pngBuffer = await sharp(buffer).png().toBuffer();
    const image = await pdfDoc.embedPng(pngBuffer);
    
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  convertImage,
  createMultiPagePdf
};
