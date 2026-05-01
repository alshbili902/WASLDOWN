const env = require('../config/env');

function isAdmin(userId) {
  return env.adminIds.includes(Number(userId));
}

function adminOnly(handler) {
  return async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply('هذا الأمر مخصص للأدمن فقط.');
      return;
    }

    return handler(ctx);
  };
}

module.exports = {
  isAdmin,
  adminOnly
};
