module.exports = function () {
  return (req, res, next) => {
    if (req.user) {
      return next();
    }
    req.session.returnTo = req.originalUrl;
    res.redirect('/learn/login/');
  };
};
