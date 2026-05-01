const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const env = require('../config/env');
const { removeDirectory } = require('../utils/cleanup');

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`فشل تشغيل أداة التحميل: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const details = stderr.trim() || stdout.trim() || `رمز الخروج ${code}`;
        reject(new Error(details.slice(0, 500)));
      }
    });
  });
}

async function getFileSizeMb(filePath) {
  const stats = await fs.stat(filePath);
  return stats.size / (1024 * 1024);
}

async function findDownloadedFile(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(directoryPath, entry.name);
    const stats = await fs.stat(filePath);
    files.push({ filePath, size: stats.size });
  }

  if (!files.length) {
    throw new Error('لم يتم إنشاء ملف فيديو قابل للإرسال');
  }

  files.sort((a, b) => b.size - a.size);
  return files[0].filePath;
}

async function downloadMedia(url, formatType = 'video') {
  const jobId = crypto.randomUUID();
  const tempRoot = path.resolve(process.cwd(), 'tmp');
  const jobDirectory = path.join(tempRoot, jobId);

  await fs.mkdir(jobDirectory, { recursive: true });

  // Use dynamic extension based on format
  const ext = formatType === 'video' ? 'mp4' : formatType.replace('audio_', '');
  const outputTemplate = path.join(jobDirectory, `%(id)s.${ext}`);

  let args = [
    '--no-playlist',
    '--restrict-filenames',
    '--ffmpeg-location',
    env.ffmpegPath,
    '-o',
    outputTemplate,
    url
  ];

  if (formatType === 'video') {
    args.unshift(
      '--merge-output-format', 'mp4',
      '--remux-video', 'mp4',
      '--recode-video', 'mp4',
      '--postprocessor-args', 'ffmpeg:-vcodec libx264 -acodec aac -movflags +faststart',
      '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv+ba/best'
    );
  } else if (formatType === 'audio_mp3') {
    args.unshift('-x', '--audio-format', 'mp3');
  } else if (formatType === 'audio_m4a') {
    args.unshift('-x', '--audio-format', 'm4a');
  } else if (formatType === 'audio_wav') {
    args.unshift('-x', '--audio-format', 'wav');
  }

  try {
    await runProcess(env.ytdlpPath, args);

    let filePath = await findDownloadedFile(jobDirectory);
    
    // Instagram iPhone Fix: Re-encode to highly compatible MP4
    if (url.includes('instagram.com')) {
      const iosPath = path.join(jobDirectory, `wasl_iphone_${Date.now()}.mp4`);
      const ffmpegArgs = [
        '-i', filePath,
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        iosPath
      ];

      try {
        await runProcess('ffmpeg', ffmpegArgs);
        // Verify output exists and is not empty
        const stats = await fs.stat(iosPath);
        if (stats.size > 0) {
          await fs.unlink(filePath); // Delete raw file
          filePath = iosPath;
        }
      } catch (fErr) {
        console.error('FFmpeg iPhone Transcode Failed:', fErr);
        throw new Error('تعذر تجهيز الفيديو للآيفون، حاول مرة أخرى');
      }
    }

    const fileSizeMb = await getFileSizeMb(filePath);

    if (fileSizeMb > env.maxFileSizeMb) {
      throw new Error(`حجم الملف ${fileSizeMb.toFixed(1)} ميجابايت ويتجاوز الحد المسموح ${env.maxFileSizeMb} ميجابايت`);
    }

    return {
      filePath,
      jobDirectory,
      fileSizeMb
    };
  } catch (error) {
    await removeDirectory(jobDirectory);
    throw error;
  }
}

async function inspectMedia(url) {
  try {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--flat-playlist',
      url
    ];

    const { stdout } = await runProcess(env.ytdlpPath, args);
    const metadata = JSON.parse(stdout);

    // التحقق من المدة (نصف ساعة كحد أقصى للمجاني مثلاً)
    const duration = metadata.duration || 0;

    return {
      title: metadata.title || 'فيديو غير معروف',
      thumbnail: metadata.thumbnail || metadata.thumbnails?.[0]?.url || null,
      duration: duration,
      durationText: duration ? new Date(duration * 1000).toISOString().substr(11, 8) : 'غير معروف',
      platform: metadata.extractor_key || metadata.webpage_url_domain || 'غير معروف',
      originalUrl: url,
      canSummarize: url.includes('youtube.com') || url.includes('youtu.be'),
      canExtractAudio: true, // أغلب المواقع تدعم ذلك
      canDownloadVideo: true,
      // قائمة جودات مبسطة
      availableQualities: [
        { id: 'best', label: 'أعلى جودة متاحة' },
        { id: 'medium', label: 'جودة متوسطة' },
        { id: 'worst', label: 'حجم خفيف' }
      ]
    };
  } catch (error) {
    console.error('Inspection error:', error);
    throw new Error('الرابط غير صالح أو غير مدعوم حالياً ❌');
  }
}

module.exports = {
  downloadMedia,
  inspectMedia
};
