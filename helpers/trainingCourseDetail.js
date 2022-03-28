const app = require('../app');
const handleCache = require('./handleCache');
const commonContent = require('./commonContent');
const helper = require('./helperFunctions');
const lms = require('./lms');
const scorm = require('./scorm');
const sendSendGridEmail = require('./sendgrid');
const elearningUser = require('./e-learning/user');

const getTrainingCourseInfoFromLMS = async (user, courseId, UIMessages, req) => {
  if (!courseId && courseId !== 0) return null;
  let courseInfo = null;
  let redirectToLMS = false;

  // Register user in LMS and course and get info about course url and completion
  if (typeof req.query.enroll !== 'undefined') {
    courseInfo = await lms.enrollTrainingCourse(user, courseId, req);
    redirectToLMS = true;
  } else {
    courseInfo = await lms.handleTrainingCourse(user, courseId, req);
  }

  let textUIMessageCodename = '';
  let renderAs = 'button';

  if (courseInfo.err) {
    const notification = lms.composeNotification('A user attempt to access to LMS in Kontent Learn failed with the following error:', courseInfo.err);
    const emailInfo = {
      recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
      subject: 'LMS error notification',
      text: notification
    };
    await sendSendGridEmail(emailInfo);

    if (app.appInsights) {
      app.appInsights.defaultClient.trackTrace({ message: `LMS_ERROR: ${notification}` });
    }
  }

  if (courseInfo.completion === 0) {
    textUIMessageCodename = 'training___cta_start_course';
  } else if (courseInfo.completion === 100) {
    textUIMessageCodename = 'training___cta_revisit_course';
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
    redirectToLMS: redirectToLMS
  };
};

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
    const notification = lms.composeNotification('A user attempt to access to Scorm Cloud in Kontent Learn failed with the following error:', courseInfo.err);
    const emailInfo = {
      recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
      subject: 'Scorm Cloud error notification',
      text: notification
    };
    await sendSendGridEmail(emailInfo);

    if (app.appInsights) {
      app.appInsights.defaultClient.trackTrace({ message: `SCORM_ERROR: ${notification}` });
    }
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

const getLmsServiceName = (course) => {
  let serviceName = null;

  if (course?.system.id) serviceName = 'scorm';
  if (course?.talentlms_course_id.value) serviceName = 'tlms';

  return serviceName;
}

const getPrivate = async (UIMessages, course, req, res) => {
  const hideCta = helper.isCodenameInMultipleChoice(course.display_options.value, 'hide_cta');
  const serviceName = getLmsServiceName(course);
  const data = {};
  let trainingCourseInfo;
  const { user, trainingUser, errCode } = await elearningUser.getUser(req?.user?.email, res);

  if (errCode) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = errCode === 'CR404' ? 'sign_in_error_subscription_missing_text' : 'sign_in_error_text';
    data.renderAs = 'text';
  } else if (hideCta) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = 'training___cta_coming_soon';
    data.renderAs = 'text';
    data.signedIn = true;
  } else if (!(await elearningUser.isCourseAvailable(user, course, trainingUser, res))) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = 'training___cta_buy_course';
    data.action = 'intercom';
    data.renderAs = 'button';
    data.signedIn = true;

    if (serviceName === 'tlms') {
      data.certificate = await lms.getUserCourseCertificate(user, course.talentlms_course_id.value);
    } else if (serviceName === 'scorm') {
      data.certificate = null;
    }
  }

  data.text = data.textUIMessageCodename ? UIMessages[data.textUIMessageCodename].value : '';

  if (serviceName === 'tlms') {
    trainingCourseInfo = await getTrainingCourseInfoFromLMS(user, course.talentlms_course_id.value, UIMessages, req);
  } else if (serviceName === 'scorm') {
    trainingCourseInfo = await getTrainingCourseInfoFromScorm(user, course, UIMessages, req, res);
  }

  return {
    general: data.renderGeneralMessage ? data : null,
    production: !data.renderGeneralMessage && !errCode ? trainingCourseInfo : null
  }
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

  if (data.signup) {
    data.urlSignUp = process.env.appUrl;
  }

  return { general: data };
};

const getTrainingCourseDetail = async (codename, req, res) => {
  let data = null;
  const trainingCourses = await handleCache.evaluateSingle(res, 'trainingCourses', async () => {
    return await commonContent.getTraniningCourse(res);
  });
  const UIMessagesObj = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return await commonContent.getUIMessages(res);
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
