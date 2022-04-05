const elearningUser = require('./user');
const elearningScorm = require('./scorm');

const init = async (req, res) => {
  if (!req?.user?.email) return { message: 'User is not authenticated.' };
  const user = await elearningUser.getUser(req.user.email, res);
  if (!user) return { message: 'User does not have access to e-learning.' };

  const userRegistartions = await elearningScorm.getUserRegistrations(user.email);
  return userRegistartions;
};

module.exports = {
  init
};
