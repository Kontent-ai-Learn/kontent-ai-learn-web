const elearningUser = require('./user');
const elearningScorm = require('./scorm');

/* const getPromoted = (item) => {
  if (!(item && item.system.type === 'training_course2')) return null;

  const promoted = {
    title: item.title.value,
    description: item.description.value,
    thumbnail: item.thumbnail.value[0].url,
    isFree: item.is_free ? helper.isCodenameInMultipleChoice(item.is_free.value, 'yes') : false,
  };

  return promoted;
}; */

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
