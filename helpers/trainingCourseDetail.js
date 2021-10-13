const axios = require('axios');
const app = require('../app');
const handleCache = require('./handleCache');
const commonContent = require('./commonContent');
const helper = require('./helperFunctions');
const lms = require('./lms');
const sendSendGridEmail = require('./sendgrid');

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
    const notification = lms.composeNotification('A user attempt to access to LMS in Kentico Kontent Docs failed with the following error:', courseInfo.err);
    const emailInfo = {
      recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
      subject: 'LMS error notification',
      text: notification
    };
    sendSendGridEmail(emailInfo);

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

const isCourseAvailable = (user, content) => {
  const isFreeCourse = content.is_free ? helper.isCodenameInMultipleChoice(content.is_free.value, 'yes') : false;
  if (user.email.endsWith('@kentico.com') || isFreeCourse) {
    return true;
  }

  const userSubscriptions = user.customerSuccessSubscriptions;

  for (let i = 0; i < userSubscriptions.length; i++) {
    if (userSubscriptions[i].isPartner || userSubscriptions[i].isMvp) {
      return true;
    }

    for (let j = 0; j < userSubscriptions[i].activePackages.length; j++) {
      if (userSubscriptions[i].activePackages[j].name.includes('elearning')) {
        return true;
      }
    }
  }

  return false;
};

const getUserFromSubscriptionService = async (req) => {
  const url = `${process.env['SubscriptionService.Url']}${req?.user?.email}/`;
  let user;
  let errCode;

  try {
    user = await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: `Bearer ${process.env['SubscriptionService.Bearer']}`
      }
    });
  } catch (err) {
    if (!err.response) {
      err.response = {
        data: {
          message: `Invalid request to ${url}`
        }
      };
    }
    if (typeof err.response.data === 'string') {
      err.response.data = { message: err.response.data };
    }
    err.response.data.userEmail = req?.user.email;
    err.response.data.file = 'helpers/trainingCourseDetail.js';
    err.response.data.method = 'getPrivate';
    const notification = lms.composeNotification('A user attempt to sign in to Kentico Kontent Docs failed in the Subscription service with the following error:', err.response.data);
    const emailInfo = {
      recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
      subject: 'Failed user sign in notification',
      text: notification
    };
    sendSendGridEmail(emailInfo);

    if (app.appInsights) {
      app.appInsights.defaultClient.trackTrace({ message: `SUBSCRIPTION_SERVICE_ERROR: ${notification}` });
    }

    errCode = err.response.data.code;
  }
  return { user, errCode };
};

const getPrivate = async (UIMessages, course, req, res) => {
  const hideCta = helper.isCodenameInMultipleChoice(course.display_options.value, 'hide_cta');
  const data = {};
  let user = {};
  let errCode;

  if (req?.user?.email.endsWith('@kentico.com')) {
    user.data = {}
    user.data.email = req.user.email;
  } else {
    const userSubscriptionService = await getUserFromSubscriptionService(req);
    user = userSubscriptionService.user?.data;
    errCode = userSubscriptionService.errCode;
  }

  if (errCode) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = errCode === 'CR404' ? 'sign_in_error_subscription_missing_text' : 'sign_in_error_text';
    data.renderAs = 'text';
  } else if (hideCta) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = 'training___cta_coming_soon';
    data.renderAs = 'text';
    data.signedIn = true;
  } else if (!isCourseAvailable(user, course)) {
    data.renderGeneralMessage = true;
    data.textUIMessageCodename = 'training___cta_buy_course';
    data.action = 'intercom';
    data.renderAs = 'button';
    data.certificate = await lms.getUserCourseCertificate(user, course.talentlms_course_id.value);
    data.signedIn = true;
  }

  data.text = data.textUIMessageCodename ? UIMessages[data.textUIMessageCodename].value : '';

  return {
    general: data.renderGeneralMessage ? data : null,
    production: !data.renderGeneralMessage && !errCode ? await getTrainingCourseInfoFromLMS(user, course.talentlms_course_id.value, UIMessages, req) : null
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