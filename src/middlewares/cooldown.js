const env = require('../config/env');

const lastDownloadByUser = new Map();

function getRemainingCooldownSeconds(userId) {
  const lastDownloadAt = lastDownloadByUser.get(Number(userId));
  if (!lastDownloadAt) return 0;

  const elapsedSeconds = Math.floor((Date.now() - lastDownloadAt) / 1000);
  return Math.max(env.downloadCooldownSeconds - elapsedSeconds, 0);
}

function markDownloadAttempt(userId) {
  lastDownloadByUser.set(Number(userId), Date.now());
}

module.exports = {
  getRemainingCooldownSeconds,
  markDownloadAttempt
};
