const handleCache = require('./handleCache');
const commonContent = require('./commonContent');
const helper = require('./helperFunctions');

const getPrivate = (UIMessages, course, token) => {
  return course;
};

const getPublic = (UIMessages, course) => {
  const hideCta = helper.isCodenameInMultipleChoice(course.display_options.value, 'hide_cta');
  const data = {};

  if (hideCta) {
    data.text = UIMessages.training___cta_coming_soon.value;
    data.textUIMessageCodename = 'training___cta_coming_soon';
    data.renderAs = 'text';
  } else {
    data.text = UIMessages.sign_in_button.value;
    data.textUIMessageCodename = 'sign_in_button';
    data.id = 'login';
    data.renderAs = 'button';
    data.signup = course.is_free ? helper.isCodenameInMultipleChoice(course.is_free.value, 'yes') : false;
  }

  return data;
};

const getTrainingCourseDetail = async (codename, token, res) => {
  let data = null;
  const trainingCourses = await handleCache.evaluateSingle(res, 'trainingCourses', async () => {
    return await commonContent.getTraniningCourse(res);
  });
  const UIMessagesObj = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return await commonContent.getUIMessages(res);
  });

  const UIMessages = UIMessagesObj && UIMessagesObj.length ? UIMessagesObj[0] : null;

  const course = trainingCourses.find(item => item.system.codename === codename);

  if (token) {
    data = getPrivate(UIMessages, course, token);
  } else {
    data = getPublic(UIMessages, course);
  }
  return data;
};

module.exports = getTrainingCourseDetail;
