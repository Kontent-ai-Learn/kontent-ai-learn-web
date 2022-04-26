const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const { isCodenameInMultipleChoice } = require('../general/helper');
const scorm = require('../services/scorm');
const errorEmail = require('../error/email');
const errorAppInsights = require('../error/appInsights');

const getTrainingCourseInfoFromScorm = async (user, course, UIMessages, req, res) => {
  const courseId = course?.system.id;
  if (!courseId && courseId !== 0) return null;
  let redirectToScorm = false;

  // Register user in LMS and course and get info about course url and completion
  if (typeof req.query.enroll !== 'undefined') {
    redirectToScorm = true;
  }

  const courseInfo = await scorm.handleTrainingCourse(user, course, req, res);

  let textUIMessageCodename = '';
  let renderAs = 'button';

  if (courseInfo.err) {
    errorEmail.send({
      recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
      subject: 'Scorm Cloud error notification',
      content: courseInfo.err
    });
    errorAppInsights.log('SCORM_ERROR', courseInfo.err);
  }

  if (courseInfo.completion === 0 || courseInfo.completion === UIMessages.training___course_status_unknown.value) {
    textUIMessageCodename = 'training___cta_start_course';
  } else if (courseInfo.completion === 100 || courseInfo.completion === UIMessages.training___course_status_completed.value) {
    textUIMessageCodename = 'training___cta_revisit_course';
  } else if (courseInfo.completion === UIMessages.training___course_status_preview.value) {
    textUIMessageCodename = 'training___cta_preview_course';
  } else if (courseInfo.completion === 101) {
    textUIMessageCodename = 'sign_in_error_text'; // 'User info is not available in LMS.';
    renderAs = 'text';
  } else if (courseInfo.completion === 102) {
    textUIMessageCodename = 'sign_in_error_text'; // 'Course info is not available in LMS.';
    renderAs = 'text';
  } else if (courseInfo.completion === 103) {
    textUIMessageCodename = 'sign_in_error_text'; // 'Course ID does not exist in LMS.';
    renderAs = 'text';
  } else {
    textUIMessageCodename = 'training___cta_resume_course';
  }

  return {
    text: UIMessages[textUIMessageCodename].value,
    textUIMessageCodename: textUIMessageCodename,
    url: courseInfo.url,
    id: courseInfo.id,
    qs: courseInfo.qs,
    completion: courseInfo.completion.toString(),
    certificate: courseInfo.certificate,
    target: courseInfo.target,
    signedIn: true,
    renderAs: renderAs,
    redirectToLMS: redirectToScorm
  };
};

const getPrivate = async (UIMessages, course, req, res) => {
  const elearningUser = require('./user');
  const hideCta = isCodenameInMultipleChoice(course.display_options.value, 'hide_cta');
  const data = {};
  const user = await elearningUser.getUser(req?.user?.email, res);

  if (user.code) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = user.code === 'CR404' ? 'sign_in_error_subscription_missing_text' : 'sign_in_error_text';
    data.renderAs = 'plaintext';
  } else if (hideCta) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = 'training___cta_coming_soon';
    data.renderAs = 'text';
    data.signedIn = true;
  } else if (!(await elearningUser.isCourseAvailable(user, course, res))) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = 'training___cta_buy_course';
    data.action = 'intercom';
    data.renderAs = 'button';
    data.signedIn = true;
    data.certificate = null;
  }

  data.text = data.textUIMessageCodename ? UIMessages[data.textUIMessageCodename].value : '';

  const trainingCourseInfo = await getTrainingCourseInfoFromScorm(user, course, UIMessages, req, res);

  return {
    general: data.renderGeneralMessage ? data : null,
    production: !data.renderGeneralMessage && !user.code ? trainingCourseInfo : null
  }
};

const getPublic = (UIMessages, course) => {
  const hideCta = isCodenameInMultipleChoice(course.display_options.value, 'hide_cta');
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
    data.signup = course.is_free ? isCodenameInMultipleChoice(course.is_free.value, 'yes') : false;
  }

  if (data.signup) {
    data.urlSignUp = process.env.appUrl;
  }

  return { general: data };
};

const getTrainingCourseDetail = async (codename, req, res) => {
  let data = null;
  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.trainingCourse(res);
  });
  const UIMessagesObj = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return await getContent.UIMessages(res);
  });

  const UIMessages = UIMessagesObj && UIMessagesObj.length ? UIMessagesObj[0] : null;

  const course = trainingCourses.find(item => item.system.codename === codename);

  if (req.user) {
    data = await getPrivate(UIMessages, course, req, res);
  } else {
    data = getPublic(UIMessages, course);
  }
  return data;
};

module.exports = getTrainingCourseDetail;
