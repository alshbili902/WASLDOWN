module.exports = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  }
  return res.redirect('/auth/login');
};
