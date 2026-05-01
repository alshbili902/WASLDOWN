const fs = require('fs/promises');
const path = require('path');

async function removeFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('فشل حذف الملف المؤقت:', error.message);
    }
  }
}

async function removeDirectory(directoryPath) {
  if (!directoryPath) return;

  const resolved = path.resolve(directoryPath);
  const tempRoot = path.resolve(process.cwd(), 'tmp');

  if (!resolved.startsWith(tempRoot)) {
    console.error('تم منع حذف مجلد خارج مجلد الملفات المؤقتة');
    return;
  }

  try {
    await fs.rm(resolved, { recursive: true, force: true });
  } catch (error) {
    console.error('فشل حذف مجلد مؤقت:', error.message);
  }
}

module.exports = {
  removeFile,
  removeDirectory
};
