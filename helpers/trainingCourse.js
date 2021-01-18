const axios = require('axios');
const commonContent = require('./commonContent');
const handleCache = require('./handleCache');
const helper = require('./helperFunctions');
const lms = require('./lms')
const isPreview = require('./isPreview');
const sendSendGridEmail = require('./sendgrid');

const isCourseAvailable = (user) => {
  if (user.email.endsWith('@kentico.com')) {
    return true;
  }

  for (let i = 0; i < user.customerSuccessSubscriptions.length; i++) {
    if (user.customerSuccessSubscriptions[i].isPartner) {
      return true
    }

    for (let j = 0; j < user.customerSuccessSubscriptions[i].activePackages.length; j++) {
      if (user.customerSuccessSubscriptions[i].activePackages[j].name === 'elearning-all') {
        return true;
      }
    }
  }

  return false;
};

const getTrainingCourseInfoFromLMS = async (user, courseId, UIMessages) => {
    if (!courseId && courseId !== 0) return null;
    // Register user in LMS and course and get info about course url and completion
    const courseInfo = await lms.handleTrainingCourse(user, courseId);
    let text = '';
    let renderAs = 'button';

    if (courseInfo.err) {
      const emailInfo = {
        recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
        subject: 'LMS error notification',
        text: lms.composeNotification('A user attempt to access to LMS in Kentico Kontent Docs failed with the following error:', courseInfo.err)
      };
      sendSendGridEmail(emailInfo);
      console.log('adasd', courseInfo.err);
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

  // If user is not authenticated
  if (!req.oidc.isAuthenticated()) {
    if (hideCta) {
      renderGeneralMessage = true;
      generalMessage = {
        text: UIMessages.training___cta_coming_soon.value,
        renderAs: 'text'
      };
    } else {
      req.session.returnTo = req.originalUrl;
      renderGeneralMessage = true;
      generalMessage = {
        text: UIMessages.sign_in_button.value,
        url: '/login',
        renderAs: 'button'
      };
    }
  } else {
      // Get additional info about authenticated user
      try {
        user = await axios({
          method: 'get',
          url: `${process.env['SubscriptionService.Url']}${req.oidc.user.email}/`,
          headers: {
            Authorization: `Bearer ${process.env['SubscriptionService.Bearer']}`
          }
        });
      } catch (err) {
        err.response.data.userEmail = req.oidc.user.email;
        err.response.data.file = 'helpers/trainingCourse.js';
        err.response.data.method = 'getTrainingCourseInfo';
        const emailInfo = {
          recipient: process.env.SENDGRID_EMAIL_ADDRESS_TO,
          subject: 'Failed user sign in notification',
          text: lms.composeNotification('A user attempt to sign in to Kentico Kontent Docs failed in the Subscription service with the following error:', err.response.data)
        };
        sendSendGridEmail(emailInfo);
      }

      if (!user) {
        renderGeneralMessage = true;
        generalMessage = {
          text: UIMessages.sign_in_error_text.value,
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
      } else if (!isCourseAvailable(user.data)) {
        renderGeneralMessage = true;
        generalMessage = {
          text: UIMessages.training___cta_buy_course.value,
          url: UIMessages.training___cta_buy_link.value,
          renderAs: 'button',
          signedIn: true
        };
      }
  }

  return {
    general: renderGeneralMessage ? generalMessage : null,
    production: !renderGeneralMessage && user ? await getTrainingCourseInfoFromLMS(user.data, content.talentlms_course_id.value, UIMessages) : null,
    preview: (!renderGeneralMessage || forcePreviewRender) && isPreview(res.locals.previewapikey) && user ? await getTrainingCourseInfoFromLMS(user.data, content.talentlms_course_id_preview.value, UIMessages) : null
  }
};

module.exports = getTrainingCourseInfo;
