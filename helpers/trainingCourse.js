const axios = require('axios');
const app = require('../app');
const commonContent = require('./commonContent');
const handleCache = require('./handleCache');
const helper = require('./helperFunctions');
const lms = require('./lms')
const isPreview = require('./isPreview');
const sendSendGridEmail = require('./sendgrid');

const isCourseAvailable = (user, content) => {
  const isFreeCourse = helper.isCodenameInMultipleChoice(content.is_free.value, 'yes');
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

const getTrainingCourseInfoFromLMS = async (user, courseId, UIMessages, isPreviewCourse) => {
    if (!courseId && courseId !== 0) return null;
    // Register user in LMS and course and get info about course url and completion
    const courseInfo = await lms.handleTrainingCourse(user, courseId);
    let text = '';
    let renderAs = 'button';

    if (courseInfo.err && !isPreviewCourse) {
      const notification = lms.composeNotification('A user attempt to access to LMS in Kentico Kontent Docs failed with the following error:', courseInfo.err);
      const emailInfo = {
        recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
        subject: 'LMS error notification',
        text: lms.composeNotification('A user attempt to access to LMS in Kentico Kontent Docs failed with the following error:', courseInfo.err)
      };
      sendSendGridEmail(emailInfo);

      if (app.appInsights) {
        app.appInsights.defaultClient.trackTrace({ message: `LMS_ERROR: ${notification}` });
      }
    }

    if (courseInfo.completion === 0) {
      text = UIMessages.training___cta_start_course.value;
    } else if (courseInfo.completion === 100) {
      text = UIMessages.training___cta_revisit_course.value;
    } else if (courseInfo.completion === 101) {
      text = UIMessages.sign_in_error_text.value; // 'User info is not available in LMS.';
      renderAs = 'text';
    } else if (courseInfo.completion === 102) {
      text = UIMessages.sign_in_error_text.value; // 'Course info is not available in LMS.';
      renderAs = 'text';
    } else if (courseInfo.completion === 103) {
      text = UIMessages.sign_in_error_text.value; // 'Course ID does not exist in LMS.';
      renderAs = 'text';
    } else {
      text = UIMessages.training___cta_resume_course.value;
    }

    return {
      text: text,
      url: courseInfo.url,
      completion: courseInfo.completion.toString(),
      certificate: courseInfo.certificate,
      target: courseInfo.target,
      signedIn: true,
      renderAs: renderAs
    };
};

const getUserFromSubscriptionService = async (req) => {
  const url = `${process.env['SubscriptionService.Url']}${req.oidc.user.email}/`;
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
    err.response.data.userEmail = req.oidc.user.email;
    err.response.data.file = 'helpers/trainingCourse.js';
    err.response.data.method = 'getTrainingCourseInfo';
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

const getTrainingCourseInfo = async (content, req, res) => {
  const UIMessagesObj = await handleCache.ensureSingle(res, 'UIMessages', async () => {
    return await commonContent.getUIMessages(res);
  });

  const UIMessages = UIMessagesObj && UIMessagesObj.length ? UIMessagesObj[0] : null;
  const hideCta = helper.isCodenameInMultipleChoice(content.display_options.value, 'hide_cta');
  let renderGeneralMessage = false;
  let forcePreviewRender = false;
  let generalMessage;
  let user;
  let errCode;

  // If user is not authenticated
  if (!req.oidc.isAuthenticated()) {
    if (hideCta) {
      renderGeneralMessage = true;
      generalMessage = {
        text: UIMessages.training___cta_coming_soon.value,
        renderAs: 'text'
      };
    } else {
      res.cookie('returnTo', req.originalUrl);
      renderGeneralMessage = true;
      generalMessage = {
        text: UIMessages.sign_in_button.value,
        url: '/login',
        renderAs: 'button'
      };
    }
  } else {
      // Get additional info about authenticated user
      ({ user, errCode } = await getUserFromSubscriptionService(req));

      if (!user) {
        renderGeneralMessage = true;
        generalMessage = {
          text: errCode === 'CR404' ? UIMessages.sign_in_error_subscription_missing_text.value : UIMessages.sign_in_error_text.value,
          renderAs: 'text',
          signedIn: true
        };
      } else if (hideCta) {
        renderGeneralMessage = true;
        forcePreviewRender = true;
        generalMessage = {
          text: UIMessages.training___cta_coming_soon.value,
          renderAs: 'text',
          signedIn: true
        };
      } else if (!isCourseAvailable(user.data, content)) {
        renderGeneralMessage = true;
        generalMessage = {
          text: UIMessages.training___cta_buy_course.value,
          action: 'intercom',
          renderAs: 'button',
          signedIn: true
        };
      }
  }

  return {
    general: renderGeneralMessage ? generalMessage : null,
    production: !renderGeneralMessage && user ? await getTrainingCourseInfoFromLMS(user.data, content.talentlms_course_id.value, UIMessages, false) : null,
    preview: (!renderGeneralMessage || forcePreviewRender) && isPreview(res.locals.previewapikey) && user ? await getTrainingCourseInfoFromLMS(user.data, content.talentlms_course_id_preview.value, UIMessages, true) : null
  }
};

module.exports = getTrainingCourseInfo;
