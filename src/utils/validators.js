const SUPPORTED_HOSTS = [
  'tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  'instagram.com',
  'www.instagram.com',
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'snapchat.com',
  'www.snapchat.com',
  't.snapchat.com'
];

function extractUrl(text = '') {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function isSupportedUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = normalizeHostname(parsed.hostname);

    const hostSupported = SUPPORTED_HOSTS.some((host) => {
      const cleanHost = normalizeHostname(host);
      return hostname === cleanHost || hostname.endsWith(`.${cleanHost}`);
    });

    if (!hostSupported) return false;

    if (hostname.includes('youtube.com')) {
      return parsed.pathname.startsWith('/shorts/');
    }

    if (hostname === 'youtu.be') {
      return Boolean(parsed.pathname.replace('/', ''));
    }

    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  extractUrl,
  isSupportedUrl
};
